"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Music, CheckCircle, AlertCircle, PlugZap } from "lucide-react"

import { createSpotifyAuthorizeUrl } from "@/lib/spotify"

interface ImportProgress {
  step: string
  progress: number
  message: string
}

interface SpotifyAuthPayload {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresAt: number
  scope: string
}

export default function ImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [spotifyAuth, setSpotifyAuth] = useState<SpotifyAuthPayload | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("playlist-session")
    if (!session) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)

    const storedAuth = localStorage.getItem("spotify-auth")
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth) as SpotifyAuthPayload
        if (parsed.expiresAt > Date.now()) {
          setSpotifyAuth(parsed)
        } else {
          localStorage.removeItem("spotify-auth")
        }
      } catch (err) {
        console.warn("Failed to parse stored Spotify session", err)
        localStorage.removeItem("spotify-auth")
      }
    }
  }, [router])

  const isSpotifyConnected = useMemo(() => {
    return spotifyAuth ? spotifyAuth.expiresAt > Date.now() : false
  }, [spotifyAuth])

  const tokenExpiresInMinutes = useMemo(() => {
    if (!spotifyAuth) return null
    const diff = spotifyAuth.expiresAt - Date.now()
    if (diff <= 0) return 0
    return Math.round(diff / 60000)
  }, [spotifyAuth])

  const isValidSpotifyUrl = (url: string) => {
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+(\?.*)?$/
    return spotifyRegex.test(url)
  }

  const handleConnectSpotify = async () => {
    try {
      const authorizeUrl = await createSpotifyAuthorizeUrl()
      window.location.href = authorizeUrl
    } catch (err) {
      console.error(err)
      setError("Spotify configuration is missing. Please check environment variables.")
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setImportProgress(null)

    if (!isValidSpotifyUrl(playlistUrl)) {
      setError("Please enter a valid Spotify playlist URL")
      return
    }

    if (!isSpotifyConnected || !spotifyAuth) {
      setError("Connect your Spotify account before importing a playlist.")
      return
    }

    if (spotifyAuth.expiresAt <= Date.now()) {
      setSpotifyAuth(null)
      localStorage.removeItem("spotify-auth")
      setError("Your Spotify session has expired. Please reconnect and try again.")
      return
    }

    setIsLoading(true)

    try {
      setImportProgress({ step: "extracting", progress: 15, message: "Extracting playlist details..." })

      const response = await fetch("/api/spotify/playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistUrl, accessToken: spotifyAuth.accessToken }),
      })

      if (response.status === 401) {
        localStorage.removeItem("spotify-auth")
        setSpotifyAuth(null)
        throw new Error("Spotify session expired. Please reconnect and try again.")
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? "Unable to fetch playlist from Spotify.")
      }

      setImportProgress({ step: "processing", progress: 55, message: "Processing tracks..." })

      const playlistData = await response.json()

      setImportProgress({ step: "complete", progress: 100, message: "Import complete!" })
      localStorage.setItem("current-playlist", JSON.stringify(playlistData))

      setTimeout(() => {
        router.push("/review")
      }, 600)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to import playlist. Please try again.")
      setImportProgress(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-balance">Import Playlist</h1>
          <p className="text-muted-foreground text-lg">Paste your Spotify playlist URL to get started</p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <PlugZap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isSpotifyConnected ? "Spotify connected" : "Connect your Spotify account"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSpotifyConnected
                  ? tokenExpiresInMinutes !== null
                    ? `Access token expires in ~${tokenExpiresInMinutes} minute${tokenExpiresInMinutes === 1 ? "" : "s"}.`
                    : "Access token active."
                  : "We use Spotify to read playlist tracks securely."}
              </p>
            </div>
          </div>
          <Button variant={isSpotifyConnected ? "outline" : "default"} onClick={handleConnectSpotify} disabled={isLoading}>
            {isSpotifyConnected ? "Reconnect Spotify" : "Connect Spotify"}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Import Form */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Spotify Playlist
          </CardTitle>
          <CardDescription>
            Enter the URL of the Spotify playlist you want to convert to purchasable tracks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleImport} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="playlist-url">Playlist URL</Label>
              <Input
                id="playlist-url"
                type="url"
                placeholder="https://open.spotify.com/playlist/..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">Copy the playlist URL from Spotify and paste it here</p>
            </div>

            {importProgress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{importProgress.message}</span>
                  <span className="font-medium">{importProgress.progress}%</span>
                </div>
                <Progress value={importProgress.progress} className="h-2" />
                {importProgress.step === "complete" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Redirecting to review...</span>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !playlistUrl}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Importing Playlist...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Import Playlist
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>What happens when you import a playlist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div>
                <h3 className="font-medium">Extract Track Information</h3>
                <p className="text-sm text-muted-foreground">
                  We analyze your playlist and extract track names, artists, and album information
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <h3 className="font-medium">Find Purchase Links</h3>
                <p className="text-sm text-muted-foreground">
                  We search multiple vendors (Apple iTunes, Bandcamp, etc.) for purchase options
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <div>
                <h3 className="font-medium">Review & Purchase</h3>
                <p className="text-sm text-muted-foreground">
                  Review all tracks with their purchase links and buy the ones you want
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example URL */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm">Need an example?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <code className="text-sm">https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaylistUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")}
            >
              Use Example
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
