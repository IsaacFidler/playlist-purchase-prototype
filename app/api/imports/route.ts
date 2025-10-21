import { NextResponse } from "next/server"

import { createPlaylistImport, listPlaylistImports } from "@/db/repositories/playlist-imports"
import { createRouteClient } from "@/lib/supabase-server"
import { playlistPayloadSchema } from "@/lib/validators/imports"

export async function GET() {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await listPlaylistImports(session.user.id)
  return NextResponse.json({ imports: items })
}

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body || !body.playlist) {
    return NextResponse.json({ error: "Missing playlist payload" }, { status: 400 })
  }

  const parseResult = playlistPayloadSchema.safeParse(body.playlist)

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 })
  }

  try {
    console.info("[imports] persisting playlist", {
      userId: user.id,
      trackCount: parseResult.data.tracks.length,
      playlistName: parseResult.data.name,
    })
    const startTime = Date.now()
    const playlistId = await createPlaylistImport({
      userId: user.id,
      userEmail: user.email,
      playlist: parseResult.data,
    })

    console.info("[imports] persisted playlist", {
      playlistId,
      durationMs: Date.now() - startTime,
    })
    return NextResponse.json({ id: playlistId }, { status: 201 })
  } catch (error) {
    console.error("Failed to persist playlist import", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to persist playlist",
      },
      { status: 500 },
    )
  }
}
