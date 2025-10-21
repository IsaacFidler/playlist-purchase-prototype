import { NextResponse } from "next/server"

import { createRouteClient } from "@/lib/supabase-server"
import { hasSpotifyAccount } from "@/lib/spotify-auth"

export const dynamic = 'force-dynamic'

/**
 * Check if user has a Spotify account connected
 */
export async function GET() {
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isConnected = await hasSpotifyAccount(user.id)

  return NextResponse.json({
    connected: isConnected,
  })
}
