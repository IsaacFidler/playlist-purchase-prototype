import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

const TOKEN_ENDPOINT = process.env.SPOTIFY_TOKEN_ENDPOINT ?? "https://accounts.spotify.com/api/token"

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token." }, { status: 400 })
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID ?? process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

    if (!clientId) {
      console.error("[API /api/auth/refresh] Spotify client ID is not configured")
      return NextResponse.json({ error: "Spotify client ID is not configured." }, { status: 500 })
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
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
      console.error("[API /api/auth/refresh] Spotify refresh failed:", data)
      return NextResponse.json({ error: data?.error_description ?? "Failed to refresh token." }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API /api/auth/refresh] Unexpected error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to refresh Spotify token",
      },
      { status: 500 }
    )
  }
}
