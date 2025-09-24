"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Download, ExternalLink, Music, AlertCircle } from "lucide-react"

interface Track {
  id: string
  name: string
  artist: string
  album: string
  vendors: {
    name: string
    url: string
    price: string
    available: boolean
  }[]
}

export default function ReviewPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [playlistName, setPlaylistName] = useState("Summer Vibes 2024")
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("playlist-session")
    if (!session) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)

    // Mock track data
    setTracks([
      {
        id: "1",
        name: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        vendors: [
          { name: "Apple Music", url: "https://music.apple.com", price: "$1.29", available: true },
          { name: "Bandcamp", url: "https://bandcamp.com", price: "$1.50", available: true },
          { name: "Amazon Music", url: "https://amazon.com", price: "$1.29", available: false },
        ],
      },
      {
        id: "2",
        name: "Watermelon Sugar",
        artist: "Harry Styles",
        album: "Fine Line",
        vendors: [
          { name: "Apple Music", url: "https://music.apple.com", price: "$1.29", available: true },
          { name: "Bandcamp", url: "https://bandcamp.com", price: "$1.25", available: true },
          { name: "Amazon Music", url: "https://amazon.com", price: "$1.29", available: true },
        ],
      },
      {
        id: "3",
        name: "Levitating",
        artist: "Dua Lipa",
        album: "Future Nostalgia",
        vendors: [
          { name: "Apple Music", url: "https://music.apple.com", price: "$1.29", available: true },
          { name: "Bandcamp", url: "https://bandcamp.com", price: "$1.40", available: false },
          { name: "Amazon Music", url: "https://amazon.com", price: "$1.29", available: true },
        ],
      },
      {
        id: "4",
        name: "Good 4 U",
        artist: "Olivia Rodrigo",
        album: "SOUR",
        vendors: [
          { name: "Apple Music", url: "https://music.apple.com", price: "$1.29", available: true },
          { name: "Bandcamp", url: "https://bandcamp.com", price: "$1.35", available: true },
          { name: "Amazon Music", url: "https://amazon.com", price: "$1.29", available: true },
        ],
      },
      {
        id: "5",
        name: "Stay",
        artist: "The Kid LAROI & Justin Bieber",
        album: "F*CK LOVE 3: OVER YOU",
        vendors: [
          { name: "Apple Music", url: "https://music.apple.com", price: "$1.29", available: true },
          { name: "Bandcamp", url: "https://bandcamp.com", price: "$1.45", available: true },
          { name: "Amazon Music", url: "https://amazon.com", price: "$1.29", available: false },
        ],
      },
    ])
  }, [router])

  const handleExportCSV = () => {
    const csvContent = [
      ["Track", "Artist", "Album", "Apple Music", "Bandcamp", "Amazon Music"],
      ...tracks.map((track) => [
        track.name,
        track.artist,
        track.album,
        track.vendors.find((v) => v.name === "Apple Music")?.available
          ? track.vendors.find((v) => v.name === "Apple Music")?.url || ""
          : "",
        track.vendors.find((v) => v.name === "Bandcamp")?.available
          ? track.vendors.find((v) => v.name === "Bandcamp")?.url || ""
          : "",
        track.vendors.find((v) => v.name === "Amazon Music")?.available
          ? track.vendors.find((v) => v.name === "Amazon Music")?.url || ""
          : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${playlistName.replace(/\s+/g, "_")}_purchase_links.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

  if (tracks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <Link
            href="/import"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to import
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-balance">Review Playlist</h1>
            <p className="text-muted-foreground text-lg">No tracks found in your playlist</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tracks found. Try importing again with a valid Spotify playlist URL.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">Review Playlist</h1>
            <p className="text-muted-foreground text-lg">
              {playlistName} • {tracks.length} tracks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open All Links
            </Button>
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Track Purchase Links
          </CardTitle>
          <CardDescription>Review all tracks and their available purchase options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Album</TableHead>
                  <TableHead>Vendor Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell className="font-medium">{track.name}</TableCell>
                    <TableCell>{track.artist}</TableCell>
                    <TableCell className="text-muted-foreground">{track.album}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {track.vendors.map((vendor) => (
                          <div key={vendor.name} className="flex items-center gap-1">
                            {vendor.available ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                <a
                                  href={vendor.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:underline"
                                >
                                  {vendor.name} ({vendor.price})
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                {vendor.name} (N/A)
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tracks.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tracks.reduce((acc, track) => acc + track.vendors.filter((v) => v.available).length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$6.45</div>
            <p className="text-xs text-muted-foreground">Average price per track</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
