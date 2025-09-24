const AUTH_ENDPOINT = process.env.NEXT_PUBLIC_SPOTIFY_AUTH_ENDPOINT ?? "https://accounts.spotify.com/authorize"
const SCOPES = ["playlist-read-private", "playlist-read-collaborative"]

const CODE_VERIFIER_STORAGE_KEY = "spotify_code_verifier"
const STATE_STORAGE_KEY = "spotify_auth_state"

export async function createSpotifyAuthorizeUrl() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error("Spotify environment variables are not configured.")
  }

  const state = crypto.randomUUID()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier)
  sessionStorage.setItem(STATE_STORAGE_KEY, state)

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  })

  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export function consumeSpotifyPkceState() {
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY)
  const state = sessionStorage.getItem(STATE_STORAGE_KEY)

  sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(STATE_STORAGE_KEY)

  return { codeVerifier, state }
}

function generateCodeVerifier(length = 128) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(randomValues, (value) => charset[value % charset.length]).join("")
}

async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const base64 = btoa(String.fromCharCode(...hashArray))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
