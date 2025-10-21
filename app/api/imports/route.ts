import { NextResponse } from "next/server"

import { createPlaylistImport, listPlaylistImports } from "@/db/repositories/playlist-imports"
import { createRouteClient } from "@/lib/supabase-server"
import { playlistPayloadSchema } from "@/lib/validators/imports"
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limit"

export async function GET() {
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.IMPORT_LIST)
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

  const items = await listPlaylistImports(user.id)
  return NextResponse.json({ imports: items }, { headers: rateLimitHeaders })
}

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.IMPORT_CREATE)
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

  const body = await request.json().catch(() => null)

  if (!body || !body.playlist) {
    return NextResponse.json(
      { error: "Missing playlist payload" },
      { status: 400, headers: rateLimitHeaders }
    )
  }

  const parseResult = playlistPayloadSchema.safeParse(body.playlist)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.flatten() },
      { status: 400, headers: rateLimitHeaders }
    )
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
    return NextResponse.json({ id: playlistId }, { status: 201, headers: rateLimitHeaders })
  } catch (error) {
    console.error("Failed to persist playlist import", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to persist playlist",
      },
      { status: 500, headers: rateLimitHeaders },
    )
  }
}
