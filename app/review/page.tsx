"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, ExternalLink, Music, AlertCircle, ShoppingCart, Filter } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSession } from "@supabase/auth-helpers-react"

function parsePrice(value?: string | null) {
  if (!value) return NaN

  const numeric = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "")
  const parsed = Number.parseFloat(numeric)
  return Number.isNaN(parsed) ? NaN : parsed
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-GB", { style: "currency", currency: "GBP" })
}

function getVendorFilterKey(name: string): VendorFilter | null {
  const normalized = name.toLowerCase()
  if (normalized.includes("discogs")) return "discogs"
  if (normalized.includes("bandcamp")) return "bandcamp"
  if (normalized.includes("apple") || normalized.includes("itunes")) return "itunes"
  return null
}

function getVendorBadgeClasses(name: string) {
  const key = getVendorFilterKey(name)

  switch (key) {
    case "discogs":
      return "bg-[#5865F2]/15 text-[#5865F2] border-[#5865F2]/30"
    case "bandcamp":
      return "bg-teal-500/10 text-teal-400 border-teal-500/30"
    case "itunes":
      return "bg-red-500/10 text-red-500 border-red-500/30"
    default:
      return "bg-secondary/10 text-secondary-foreground border-secondary/30"
  }
}

interface Track {
  id: string
  name: string
  artist: string
  album: string
  duration: string
  spotifyId: string
  vendors: {
    id?: string
    name: string
    url: string
    price: string
    available: boolean
  }[]
  selected?: boolean
}

type VendorFilter = "all" | "itunes" | "discogs" | "bandcamp"

interface PlaylistData {
  id: string
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
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>("all")
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const session = useSession()
  const searchParams = useSearchParams()
  const importId = searchParams.get("importId")

  useEffect(() => {
    if (session === null) {
      router.replace("/login")
      return
    }

    if (!importId) {
      setErrorMessage("Missing playlist identifier. Please start a new import.")
      setIsLoading(false)
      return
    }

    const loadPlaylist = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/imports/${importId}`)
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "Unable to load playlist.")
        }

        const payload = (await response.json()) as PlaylistData
        setPlaylistData(payload)
        setTracks(payload.tracks)
        setSelectedTracks(new Set(payload.tracks.map((t) => t.id)))
        setErrorMessage(null)
      } catch (error) {
        console.error(error)
        setErrorMessage(error instanceof Error ? error.message : "Failed to load playlist.")
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaylist()
  }, [importId, router, session])

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
    return track.vendors.some((vendor) => getVendorFilterKey(vendor.name) === vendorFilter && vendor.available)
  })

  const selectedTracksList = tracks.filter((track) => selectedTracks.has(track.id))
  const totalCost = selectedTracksList.reduce((sum, track) => {
    const prices = track.vendors
      .filter((vendor) => vendor.available && vendor.price)
      .map((vendor) => parsePrice(vendor.price))
      .filter((value): value is number => Number.isFinite(value))

    if (!prices.length) return sum

    const cheapestPrice = Math.min(...prices)
    return sum + cheapestPrice
  }, 0)

  const formattedTotalCost = formatCurrency(totalCost)

  const handleBulkPurchase = async () => {
    if (selectedTracks.size === 0) return

    setIsProcessingPurchase(true)

    // Store selected tracks for purchase page
    try {
      await fetch(`/api/imports/${playlistData?.id ?? importId}/selection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackIds: Array.from(selectedTracks.values()),
          totalCost,
          status: "draft",
        }),
      })

      router.push(`/purchase?importId=${playlistData?.id ?? importId}`)
    } finally {
      setIsProcessingPurchase(false)
    }
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
        track.vendors.find((v) => v.name.toLowerCase().includes("apple"))?.available
          ? track.vendors.find((v) => v.name.toLowerCase().includes("apple"))?.url || ""
          : "",
        track.vendors.find((v) => v.name.toLowerCase().includes("bandcamp"))?.available
          ? track.vendors.find((v) => v.name.toLowerCase().includes("bandcamp"))?.url || ""
          : "",
        track.vendors.find((v) => v.name.toLowerCase().includes("amazon"))?.available
          ? track.vendors.find((v) => v.name.toLowerCase().includes("amazon"))?.url || ""
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

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading playlist...</p>
        </div>
      </div>
    )
  }

  if (errorMessage || !playlistData || tracks.length === 0) {
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
            <p className="text-muted-foreground text-lg">{errorMessage ?? "No playlist data found"}</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage ?? "No playlist found. Please import a playlist first."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
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
              className="bg-[#00FF9D] hover:bg-[#00E38C] text-[#032B1A]"
            >
              {isProcessingPurchase ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Purchase Selected ({formattedTotalCost})
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
            <Select value={vendorFilter} onValueChange={(value) => setVendorFilter(value as VendorFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="itunes">Apple iTunes</SelectItem>
                <SelectItem value="discogs">Discogs Marketplace</SelectItem>
                <SelectItem value="bandcamp">Bandcamp</SelectItem>
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
                  <TableHead className="w-[30%] min-w-[220px]">Track</TableHead>
                  <TableHead className="w-[18%] min-w-[160px]">Artist</TableHead>
                  <TableHead className="w-[22%] min-w-[180px]">Album</TableHead>
                  <TableHead className="w-[80px]">Duration</TableHead>
                  <TableHead className="min-w-[240px]">Vendor Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {filteredTracks.map((track, index) => (
              <TableRow key={`${track.id}-${index}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTracks.has(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[260px] truncate" title={track.name}>
                      {track.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={track.artist}>
                      {track.artist}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[240px] truncate" title={track.album}>
                      {track.album}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{track.duration}</TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="flex flex-wrap gap-2">
                        {track.vendors.map((vendor) => (
                          <div key={`${vendor.name}-${vendor.url}`} className="flex items-center gap-1">
                            {vendor.available ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border border-border/40 bg-secondary/10 text-secondary-foreground whitespace-normal break-words",
                                  getVendorBadgeClasses(vendor.name),
                                )}
                              >
                                <a
                                  href={vendor.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:underline"
                                >
                                  <span>{vendor.name}</span>
                                  {vendor.price ? <span>({vendor.price})</span> : null}
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
            <div className="text-2xl font-bold">{formattedTotalCost}</div>
            <p className="text-xs text-muted-foreground">Selected tracks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
