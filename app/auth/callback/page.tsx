"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { consumeSpotifyPkceState } from "@/lib/spotify"
import { Button } from "@/components/ui/button"

type TokenResponse = {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token?: string
}

export default function SpotifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState("Completing Spotify connection...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const returnedState = searchParams.get("state")
    const authError = searchParams.get("error")

    if (authError) {
      setError(`Spotify authorization failed: ${authError}`)
      return
    }

    if (!code) {
      setError("Missing authorization code. Please try connecting again.")
      return
    }

    const { codeVerifier, state: storedState } = consumeSpotifyPkceState()

    if (!codeVerifier) {
      setError("Unable to validate the authorization response. Please restart the connection flow.")
      return
    }

    if (storedState && returnedState && storedState !== returnedState) {
      setError("Authorization state mismatch. Please try again.")
      return
    }

    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? `${window.location.origin}/auth/callback`

    async function exchangeCode() {
      try {
        setStatusMessage("Requesting access token from Spotify...")

        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, codeVerifier, redirectUri }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "Unable to exchange authorization code.")
        }

        const data = (await response.json()) as TokenResponse

        const authPayload = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenType: data.token_type,
          scope: data.scope,
          expiresAt: Date.now() + data.expires_in * 1000,
        }

        localStorage.setItem("spotify-auth", JSON.stringify(authPayload))
        setStatusMessage("Spotify connected. Redirecting...")

        setTimeout(() => {
          router.replace("/import")
        }, 800)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Failed to complete Spotify authorization.")
      }
    }

    exchangeCode()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Spotify Connection Failed</h1>
          <p className="max-w-md text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => router.replace("/import")}>Back to Import</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="animate-spin rounded-full border-b-2 border-primary p-6" aria-hidden />
      <p className="text-sm text-muted-foreground">{statusMessage}</p>
      <p className="text-xs text-muted-foreground">
        Need help? <Link href="/import" className="text-primary underline">Try restarting the connection</Link>
      </p>
    </div>
  )
}
