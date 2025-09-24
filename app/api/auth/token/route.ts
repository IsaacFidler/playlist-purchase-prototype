import { NextResponse } from "next/server"

const TOKEN_ENDPOINT = process.env.SPOTIFY_TOKEN_ENDPOINT ?? "https://accounts.spotify.com/api/token"

export async function POST(request: Request) {
  const { code, codeVerifier, redirectUri } = await request.json()

  if (!code || !codeVerifier || !redirectUri) {
    return NextResponse.json({ error: "Missing authorization parameters." }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: "Spotify client ID is not configured." }, { status: 500 })
  }

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
    return NextResponse.json({ error: data?.error_description ?? "Failed to fetch token." }, { status: response.status })
  }

  return NextResponse.json(data)
}
