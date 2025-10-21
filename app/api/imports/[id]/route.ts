import { NextResponse } from "next/server"

import { getPlaylistImport } from "@/db/repositories/playlist-imports"
import { createRouteClient } from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const record = await getPlaylistImport({ userId: user.id, importId: params.id })

    if (!record) {
      return NextResponse.json({ error: "Playlist import not found" }, { status: 404 })
    }

    const tracks = record.tracks.map((track: typeof record.tracks[number]) => ({
    id: track.id,
    name: track.name,
    artist: track.artists,
    album: track.album,
    duration: track.durationMs ? formatDuration(track.durationMs) : "",
    durationMs: track.durationMs ?? 0,
    spotifyId: track.spotifyTrackId,
    spotifyUrl: track.spotifyTrackUrl ?? undefined,
    isrc: track.isrc,
    orderIndex: track.orderIndex,
    vendors: track.offers.map((offer: typeof track.offers[number]) => ({
      id: offer.vendorId,
      name: offer.vendor?.displayName ?? offer.vendorId,
      vendorId: offer.vendorId,
      url: offer.externalUrl,
      price:
        offer.priceValue != null
          ? `${currencySymbol(offer.currencyCode)}${Number(offer.priceValue).toFixed(2)}`
          : undefined,
      available: offer.availability === "AVAILABLE",
    })),
  }))

    return NextResponse.json({
      id: record.id,
      name: record.name,
      description: record.description,
      status: record.status,
      url: record.sourceUrl,
      trackCount: record.totalTracks,
      importedAt: record.createdAt,
      tracks,
    })
  } catch (error) {
    console.error("[API /api/imports/[id]] Error fetching playlist import:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load playlist import",
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const currencySymbol = (currencyCode: string) => {
  switch (currencyCode) {
    case "GBP":
      return "£"
    case "USD":
      return "$"
    case "EUR":
      return "€"
    default:
      return `${currencyCode} `
  }
}
