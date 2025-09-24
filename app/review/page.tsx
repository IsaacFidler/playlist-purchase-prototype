"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, ExternalLink, Music, AlertCircle, ShoppingCart, Filter } from "lucide-react"

interface Track {
  id: string
  name: string
  artist: string
  album: string
  duration: string
  spotifyId: string
  vendors: {
    name: string
    url: string
    price: string
    available: boolean
  }[]
  selected?: boolean
}

interface PlaylistData {
  url: string
  name: string
  description: string
  trackCount: number
  importedAt: string
  tracks: Track[]
}

export default function ReviewPage() {
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [vendorFilter, setVendorFilter] = useState<string>("all")
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("playlist-session")
    if (!session) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)

    // Load playlist data
    const storedPlaylist = localStorage.getItem("current-playlist")
    if (storedPlaylist) {
      const data = JSON.parse(storedPlaylist) as PlaylistData
      setPlaylistData(data)
      setTracks(data.tracks)
      // Select all tracks by default
      setSelectedTracks(new Set(data.tracks.map((t) => t.id)))
    }
  }, [router])

  const toggleTrackSelection = (trackId: string) => {
    const newSelected = new Set(selectedTracks)
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId)
    } else {
      newSelected.add(trackId)
    }
    setSelectedTracks(newSelected)
  }

  const selectAllTracks = () => {
    setSelectedTracks(new Set(tracks.map((t) => t.id)))
  }

  const deselectAllTracks = () => {
    setSelectedTracks(new Set())
  }

  const filteredTracks = tracks.filter((track) => {
    if (vendorFilter === "all") return true
    return track.vendors.some(
      (vendor) => vendor.name.toLowerCase().includes(vendorFilter.toLowerCase()) && vendor.available,
    )
  })

  const selectedTracksList = tracks.filter((track) => selectedTracks.has(track.id))
  const totalCost = selectedTracksList.reduce((sum, track) => {
    const cheapestVendor = track.vendors
      .filter((v) => v.available)
      .sort((a, b) => Number.parseFloat(a.price.replace("$", "")) - Number.parseFloat(b.price.replace("$", "")))[0]
    return sum + (cheapestVendor ? Number.parseFloat(cheapestVendor.price.replace("$", "")) : 0)
  }, 0)

  const handleBulkPurchase = async () => {
    if (selectedTracks.size === 0) return

    setIsProcessingPurchase(true)

    // Store selected tracks for purchase page
    const purchaseData = {
      tracks: selectedTracksList,
      totalCost,
      playlistName: playlistData?.name || "Playlist",
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem("purchase-data", JSON.stringify(purchaseData))

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500))

    router.push("/purchase")
  }

  const handleExportCSV = () => {
    if (!playlistData) return

    const csvContent = [
      ["Track", "Artist", "Album", "Duration", "Apple Music", "Bandcamp", "Amazon Music"],
      ...selectedTracksList.map((track) => [
        track.name,
        track.artist,
        track.album,
        track.duration,
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
    a.download = `${playlistData.name.replace(/\s+/g, "_")}_purchase_links.csv`
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

  if (!playlistData || tracks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8">
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
            <p className="text-muted-foreground text-lg">No playlist data found</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No playlist found. Please import a playlist first.</AlertDescription>
        </Alert>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">Review Playlist</h1>
            <p className="text-muted-foreground text-lg">
              {playlistData.name} • {tracks.length} tracks • {selectedTracks.size} selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV} disabled={selectedTracks.size === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Selected
            </Button>
            <Button
              onClick={handleBulkPurchase}
              disabled={selectedTracks.size === 0 || isProcessingPurchase}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingPurchase ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Purchase Selected (${totalCost.toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllTracks}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllTracks}>
              Deselect All
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="apple">Apple Music</SelectItem>
                <SelectItem value="bandcamp">Bandcamp</SelectItem>
                <SelectItem value="amazon">Amazon Music</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedTracks.size} of {tracks.length} tracks selected
        </div>
      </div>

      {/* Tracks Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Track Purchase Links
          </CardTitle>
          <CardDescription>Select tracks and review their available purchase options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Album</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Vendor Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTracks.has(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{track.name}</TableCell>
                    <TableCell>{track.artist}</TableCell>
                    <TableCell className="text-muted-foreground">{track.album}</TableCell>
                    <TableCell className="text-muted-foreground">{track.duration}</TableCell>
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
      <div className="grid md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedTracks.size}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedTracksList.reduce((acc, track) => acc + track.vendors.filter((v) => v.available).length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Selected tracks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
