import { NextResponse } from "next/server"

import { findITunesOffer, formatITunesPrice } from "@/lib/vendors/apple"

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
  const { playlistUrl, accessToken } = await request.json()

  if (!playlistUrl || !accessToken) {
    return NextResponse.json({ error: "Playlist URL and access token are required." }, { status: 400 })
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
    return NextResponse.json(
      { error: errorBody?.error?.message ?? "Failed to fetch playlist." },
      { status: playlistResponse.status },
    )
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
      spotifyId: track.id,
      isrc: track.external_ids?.isrc ?? null,
      vendors: [],
    }
  }).filter((track): track is NonNullable<typeof track> => Boolean(track))

  await enrichWithITunesOffers(normalizedTracks)

  const payload = {
    url: playlistJson.external_urls?.spotify ?? playlistUrl,
    name: playlistJson.name,
    description: playlistJson.description,
    trackCount: normalizedTracks.length,
    importedAt: new Date().toISOString(),
    tracks: normalizedTracks,
  }

  return NextResponse.json(payload)
}

async function enrichWithITunesOffers(
  tracks: Array<{ name: string; artist: string; spotifyId?: string | null; isrc?: string | null; vendors: any[] }>,
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

          track.vendors.push({
            name: "Apple iTunes",
            url: match.url,
            price: formatITunesPrice(match),
            available: true,
          })
        } catch (error) {
          console.warn("Failed to enrich track with iTunes data", error)
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
    const response = await fetch(nextUrl, { headers })
    if (!response.ok) {
      break
    }
    const data = await response.json()
    tracks.push(...(data.items as SpotifyPlaylistTrack[]))
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
