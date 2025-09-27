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
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
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
    const playlistId = await createPlaylistImport({
      userId: session.user.id,
      userEmail: session.user.email,
      playlist: parseResult.data,
    })

    return NextResponse.json({ id: playlistId }, { status: 201 })
  } catch (error) {
    console.error("Failed to persist playlist import", error)
    return NextResponse.json({ error: "Failed to persist playlist" }, { status: 500 })
  }
}
