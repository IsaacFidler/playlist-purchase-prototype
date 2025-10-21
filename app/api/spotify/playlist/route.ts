import { NextResponse } from "next/server"

import { findITunesOffer, formatITunesPrice } from "@/lib/vendors/apple"
import { findDiscogsOffer, formatDiscogsPrice } from "@/lib/vendors/discogs"
import { createRouteClient } from "@/lib/supabase-server"
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limit"
import { getSpotifyToken } from "@/lib/spotify-auth"

const SPOTIFY_API_BASE = "https://api.spotify.com/v1"

type SpotifyPlaylistResponse = {
  tracks: {
    items: SpotifyPlaylistTrack[]
    next: string | null
  }
  name: string
  description: string | null
  external_urls?: { spotify?: string }
}

type SpotifyPlaylistTrack = {
  track: {
    id: string | null
    name: string
    duration_ms: number
    artists: { name: string }[]
    album: { name: string } | null
    external_urls?: { spotify?: string }
    external_ids?: { isrc?: string }
  } | null
}

export async function POST(request: Request) {
  // 1. Authentication check
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Rate limiting check
  const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.SPOTIFY_PLAYLIST)
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    )
  }

  // 3. Parse and validate request body
  const { playlistUrl } = await request.json()

  if (!playlistUrl) {
    return NextResponse.json(
      { error: "Playlist URL is required." },
      { status: 400, headers: rateLimitHeaders }
    )
  }

  // 4. Get user's Spotify access token from database
  const accessToken = await getSpotifyToken(user.id)

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Spotify account not connected or token expired. Please reconnect your Spotify account.",
      },
      { status: 401, headers: rateLimitHeaders }
    )
  }

  const playlistId = extractPlaylistId(playlistUrl)

  if (!playlistId) {
    return NextResponse.json({ error: "Invalid Spotify playlist URL." }, { status: 400 })
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  }

  const playlistResponse = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}`, { headers })

  if (playlistResponse.status === 401) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  if (!playlistResponse.ok) {
    const errorBody = await playlistResponse.json().catch(() => undefined)
    const message =
      playlistResponse.status === 404
        ? "Cannot find that playlist. It may be private or you might not have access."
        : errorBody?.error?.message ?? "Failed to fetch playlist."

    return NextResponse.json({ error: message }, { status: playlistResponse.status })
  }

  const playlistJson = (await playlistResponse.json()) as SpotifyPlaylistResponse
  const tracks = await fetchAllTracks(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, headers)

  const normalizedTracks = tracks.map((item, index) => {
    const track = item.track
    if (!track) {
      return null
    }

    return {
      id: track.id ?? `${playlistId}-${index}`,
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      album: track.album?.name ?? null,
      duration: formatDuration(track.duration_ms),
      durationMs: track.duration_ms,
      spotifyId: track.id,
      spotifyUrl: track.external_urls?.spotify,
      isrc: track.external_ids?.isrc ?? null,
      orderIndex: index,
      vendors: [],
    }
  }).filter((track): track is NonNullable<typeof track> => Boolean(track))

  await enrichWithITunesOffers(normalizedTracks)
  await enrichWithDiscogsOffers(normalizedTracks)

  const payload = {
    spotifyPlaylistId: playlistId,
    url: playlistJson.external_urls?.spotify ?? playlistUrl,
    name: playlistJson.name,
    description: playlistJson.description,
    trackCount: normalizedTracks.length,
    importedAt: new Date().toISOString(),
    tracks: normalizedTracks,
  }

  return NextResponse.json(payload, { headers: rateLimitHeaders })
}

type TrackWithVendors = {
  name: string
  artist: string
  spotifyId?: string | null
  isrc?: string | null
  vendors: Array<{
    name: string
    url: string
    price: string
    available: boolean
  }>
}

async function enrichWithITunesOffers(
  tracks: TrackWithVendors[],
) {
  const BATCH_SIZE = 10

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (track) => {
        try {
          const artist = track.artist?.split(",")[0]?.trim()
          const match = await findITunesOffer({
            trackName: track.name,
            artistName: artist,
            isrc: track.isrc ?? undefined,
          })

          if (!match) return

          const formattedPrice = formatITunesPrice(match)
          if (formattedPrice) {
            track.vendors.push({
              name: "Apple iTunes",
              url: match.url,
              price: formattedPrice,
              available: true,
            })
          }
        } catch (error) {
          console.warn("Failed to enrich track with iTunes data", error)
        }
      }),
    )
  }
}

async function enrichWithDiscogsOffers(
  tracks: Array<{
    name: string
    artist: string
    album: string | null
    vendors: Array<{
      name: string
      url: string
      price?: string
      available: boolean
    }>
  }>,
) {
  const token = process.env.DISCOGS_TOKEN
  if (!token) return

  const BATCH_SIZE = 8

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (track) => {
        try {
          const artist = track.artist?.split(",")[0]?.trim()
          const match = await findDiscogsOffer({
            trackName: track.name,
            artistName: artist,
            albumName: track.album,
          })

          if (!match) return

          track.vendors.push({
            name: "Discogs Marketplace",
            url: match.marketplaceUrl,
            price: formatDiscogsPrice(match),
            available: match.numForSale ? match.numForSale > 0 : true,
          })

          if (match.bandcampUrl) {
            track.vendors.push({
              name: "Bandcamp (via Discogs)",
              url: match.bandcampUrl,
              available: true,
            })
          }
        } catch (error) {
          console.warn("Failed to enrich track with Discogs data", error)
        }
      }),
    )
  }
}

function extractPlaylistId(urlOrId: string) {
  if (!urlOrId) return undefined

  const urlPattern = /playlist\/([a-zA-Z0-9]+)(\?|$)/
  const match = urlOrId.match(urlPattern)
  if (match) {
    return match[1]
  }

  // Allow raw playlist ID input
  if (/^[a-zA-Z0-9]+$/.test(urlOrId)) {
    return urlOrId
  }

  return undefined
}

async function fetchAllTracks(url: string, headers: Record<string, string>) {
  const tracks: SpotifyPlaylistTrack[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, { headers })
    if (!response.ok) {
      break
    }
    const data: { items: SpotifyPlaylistTrack[]; next: string | null } = await response.json()
    tracks.push(...data.items)
    nextUrl = data.next
  }

  return tracks
}

function formatDuration(durationMs: number) {
  if (!durationMs || Number.isNaN(durationMs)) {
    return "0:00"
  }

  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
