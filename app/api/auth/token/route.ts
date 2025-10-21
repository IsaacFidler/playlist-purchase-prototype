import { NextResponse } from "next/server"

import { createRouteClient } from "@/lib/supabase-server"
import { saveSpotifyToken } from "@/lib/spotify-auth"

const TOKEN_ENDPOINT = process.env.SPOTIFY_TOKEN_ENDPOINT ?? "https://accounts.spotify.com/api/token"

export async function POST(request: Request) {
  // 1. Verify user is authenticated
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse request body
  const { code, codeVerifier, redirectUri } = await request.json()

  if (!code || !codeVerifier || !redirectUri) {
    return NextResponse.json({ error: "Missing authorization parameters." }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: "Spotify client ID is not configured." }, { status: 500 })
  }

  // 3. Exchange code for tokens with Spotify
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  })

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error_description ?? "Failed to fetch token." },
      { status: response.status }
    )
  }

  // 4. Save tokens to database
  try {
    await saveSpotifyToken(user.id, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      scope: data.scope ?? "",
      tokenType: data.token_type ?? "Bearer",
    })

    console.info(`[auth/token] Saved Spotify tokens for user ${user.id}`)

    // Return success without exposing tokens
    return NextResponse.json({
      success: true,
      message: "Spotify account connected successfully",
    })
  } catch (error) {
    console.error("[auth/token] Failed to save Spotify tokens:", error)
    return NextResponse.json(
      { error: "Failed to save Spotify credentials" },
      { status: 500 }
    )
  }
}
