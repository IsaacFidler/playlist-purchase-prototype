import { NextResponse } from "next/server"

const TOKEN_ENDPOINT = process.env.SPOTIFY_TOKEN_ENDPOINT ?? "https://accounts.spotify.com/api/token"

export async function POST(request: Request) {
  const { refreshToken } = await request.json()

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token." }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

  if (!clientId) {
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
    return NextResponse.json({ error: data?.error_description ?? "Failed to refresh token." }, { status: response.status })
  }

  return NextResponse.json(data)
}
