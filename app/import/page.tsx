"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Music } from "lucide-react"

export default function ImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call to import playlist
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsLoading(false)
    // Redirect to review page with stub data
    router.push("/review")
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
    <div className="max-w-2xl mx-auto space-y-8">
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
              />
              <p className="text-sm text-muted-foreground">Copy the playlist URL from Spotify and paste it here</p>
            </div>

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
