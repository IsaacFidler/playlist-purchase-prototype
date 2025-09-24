"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Music, CheckCircle, AlertCircle } from "lucide-react"

interface ImportProgress {
  step: string
  progress: number
  message: string
}

export default function ImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("playlist-session")
    if (!session) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)
  }, [router])

  const isValidSpotifyUrl = (url: string) => {
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+(\?.*)?$/
    return spotifyRegex.test(url)
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidSpotifyUrl(playlistUrl)) {
      setError("Please enter a valid Spotify playlist URL")
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Extract playlist ID and fetch metadata
      setImportProgress({ step: "extracting", progress: 20, message: "Extracting playlist information..." })
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 2: Fetch track list
      setImportProgress({ step: "fetching", progress: 50, message: "Fetching track list..." })
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Step 3: Search marketplaces
      setImportProgress({ step: "searching", progress: 80, message: "Searching marketplaces for purchase links..." })
      await new Promise((resolve) => setTimeout(resolve, 2500))

      // Step 4: Complete
      setImportProgress({ step: "complete", progress: 100, message: "Import complete!" })
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Store playlist data for review page
      const playlistData = {
        url: playlistUrl,
        name: "Summer Vibes 2024", // Would be extracted from Spotify API
        description: "The perfect soundtrack for summer days",
        trackCount: 25,
        importedAt: new Date().toISOString(),
        tracks: [
          {
            id: "1",
            name: "Blinding Lights",
            artist: "The Weeknd",
            album: "After Hours",
            duration: "3:20",
            spotifyId: "0VjIjW4GlUZAMYd2vXMi3b",
            vendors: [
              {
                name: "Apple Music",
                url: "https://music.apple.com/us/album/blinding-lights/1499378108?i=1499378112",
                price: "$1.29",
                available: true,
              },
              {
                name: "Bandcamp",
                url: "https://theweeknd.bandcamp.com/track/blinding-lights",
                price: "$1.50",
                available: true,
              },
              { name: "Amazon Music", url: "https://amazon.com/dp/B084DWCZQZ", price: "$1.29", available: false },
            ],
          },
          {
            id: "2",
            name: "Watermelon Sugar",
            artist: "Harry Styles",
            album: "Fine Line",
            duration: "2:54",
            spotifyId: "6UelLqGlWMcVH1E5c4H7lY",
            vendors: [
              {
                name: "Apple Music",
                url: "https://music.apple.com/us/album/watermelon-sugar/1488408555?i=1488408564",
                price: "$1.29",
                available: true,
              },
              {
                name: "Bandcamp",
                url: "https://harrystyles.bandcamp.com/track/watermelon-sugar",
                price: "$1.25",
                available: true,
              },
              { name: "Amazon Music", url: "https://amazon.com/dp/B082ZR6GJL", price: "$1.29", available: true },
            ],
          },
          // More tracks would be added here...
        ],
      }

      localStorage.setItem("current-playlist", JSON.stringify(playlistData))

      // Redirect to review page
      router.push("/review")
    } catch (err) {
      setError("Failed to import playlist. Please try again.")
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
