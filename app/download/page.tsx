"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Download, ExternalLink, FileText, Music, CheckCircle, Copy } from "lucide-react"
import { useSession } from "@supabase/auth-helpers-react"

interface ApiTrack {
  id: string
  name: string
  artist: string
  album: string
  duration: string
  durationMs: number
  spotifyId: string | null
  spotifyUrl?: string
  isrc: string | null
  orderIndex: number
  vendors: Array<{
    id: string
    name: string
    vendorId: string
    url: string
    price?: string
    available: boolean
  }>
}

interface CompletedPurchase {
  tracks: Array<{
    id: string
    name: string
    artist: string
    album: string
    duration: string
    vendors: Array<{
      id: string
      name: string
      vendorId: string
      url: string
      price?: string
      available: boolean
    }>
  }>
  totalCost: number
  playlistName: string
  timestamp: string
  purchaseLinks: { [key: string]: string }
  completedAt: string
}

const formatCurrency = (value: number) => value.toLocaleString("en-GB", { style: "currency", currency: "GBP" })

export default function DownloadPage() {
  const [purchaseData, setPurchaseData] = useState<CompletedPurchase | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
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
      setPurchaseData(null)
      return
    }

    const loadPurchase = async () => {
      try {
        const [playlistResponse, selectionResponse] = await Promise.all([
          fetch(`/api/imports/${importId}`),
          fetch(`/api/imports/${importId}/selection`),
        ])

        if (!playlistResponse.ok) {
          throw new Error("Unable to load playlist data")
        }

        const playlist = await playlistResponse.json()
        const selectionJson = await selectionResponse.json().catch(() => ({ selection: null }))
        const selection = selectionJson.selection

        if (!selection || !selection.trackIds) {
          setPurchaseData(null)
          return
        }

        const trackMap: CompletedPurchase["tracks"] = (playlist.tracks as ApiTrack[]).map(
          (track) => ({
            id: track.id,
            name: track.name,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            vendors: track.vendors,
          }),
        )

        const selected = trackMap.filter((track) => selection.trackIds.includes(track.id))

        setPurchaseData({
          tracks: selected,
          totalCost: selection.totalCost ?? 0,
          playlistName: playlist.name,
          timestamp: selection.savedAt ?? new Date().toISOString(),
          purchaseLinks: (selection.purchaseLinks as Record<string, string>) ?? {},
          completedAt: selection.savedAt ?? new Date().toISOString(),
        })
      } catch (error) {
        console.error(error)
        setPurchaseData(null)
      }
    }

    loadPurchase()
  }, [importId, router, session])

  const handleDownloadCSV = () => {
    if (!purchaseData) return

    const csvContent = [
      ["Track", "Artist", "Album", "Duration", "Purchase Link", "Vendor", "Price"],
      ...purchaseData.tracks.map((track) => {
        const purchaseLink = purchaseData.purchaseLinks[track.id] || ""
        const vendor = track.vendors.find((v) => v.url === purchaseLink)
        return [
          track.name,
          track.artist,
          track.album,
          track.duration,
          purchaseLink,
          vendor?.name || "",
          vendor?.price || "",
        ]
      }),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    downloadFile(csvContent, `${purchaseData.playlistName}_purchase_collection.csv`, "text/csv")
  }

  const handleDownloadJSON = () => {
    if (!purchaseData) return

    const jsonData = {
      playlist: {
        name: purchaseData.playlistName,
        totalTracks: purchaseData.tracks.length,
        totalCost: purchaseData.totalCost,
        completedAt: purchaseData.completedAt,
      },
      tracks: purchaseData.tracks.map((track) => ({
        name: track.name,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        purchaseLink: purchaseData.purchaseLinks[track.id] || "",
        vendor: track.vendors.find((v) => v.url === purchaseData.purchaseLinks[track.id])?.name || "",
        price: track.vendors.find((v) => v.url === purchaseData.purchaseLinks[track.id])?.price || "",
      })),
    }

    downloadFile(
      JSON.stringify(jsonData, null, 2),
      `${purchaseData.playlistName}_purchase_collection.json`,
      "application/json",
    )
  }

  const handleDownloadTXT = () => {
    if (!purchaseData) return

    const txtContent = [
      `${purchaseData.playlistName} - Purchase Collection`,
      `Generated: ${new Date(purchaseData.completedAt).toLocaleString()}`,
      `Total Tracks: ${purchaseData.tracks.length}`,
      `Total Cost: £${purchaseData.totalCost.toFixed(2)}`,
      "",
      "PURCHASE LINKS:",
      "=".repeat(50),
      "",
      ...purchaseData.tracks.map((track, index) => {
        const purchaseLink = purchaseData.purchaseLinks[track.id] || ""
        const vendor = track.vendors.find((v) => v.url === purchaseLink)
        return [
          `${index + 1}. ${track.name}`,
          `   Artist: ${track.artist}`,
          `   Album: ${track.album}`,
          `   Duration: ${track.duration}`,
          `   Vendor: ${vendor?.name || "N/A"} (${vendor?.price || "N/A"})`,
          `   Link: ${purchaseLink}`,
          "",
        ].join("\n")
      }),
    ].join("\n")

    downloadFile(txtContent, `${purchaseData.playlistName}_purchase_collection.txt`, "text/plain")
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const copyAllLinks = async () => {
    if (!purchaseData) return

    const links = Object.values(purchaseData.purchaseLinks).join("\n")

    try {
      await navigator.clipboard.writeText(links)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy links:", err)
    }
  }

  const handleOpenAllLinks = () => {
    if (!purchaseData) return

    Object.values(purchaseData.purchaseLinks).forEach((url, index) => {
      setTimeout(() => {
        window.open(url, "_blank")
      }, index * 500)
    })
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

  if (!purchaseData) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-balance">Download Collection</h1>
            <p className="text-muted-foreground text-lg">No completed purchase found</p>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            No completed purchase found. Please complete a purchase first to download your collection.
          </AlertDescription>
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
        <div>
          <h1 className="text-3xl font-bold text-balance">Download Collection</h1>
          <p className="text-muted-foreground text-lg">
            {purchaseData.playlistName} • {purchaseData.tracks.length} tracks • Completed{" "}
            {new Date(purchaseData.completedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Success Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Your purchase collection is ready for download! Choose your preferred format below.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Open or copy all purchase links at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleOpenAllLinks} className="w-full bg-transparent" variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open All Purchase Links
            </Button>
            <Button onClick={copyAllLinks} className="w-full bg-transparent" variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              {copySuccess ? "Copied!" : "Copy All Links"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Formats
            </CardTitle>
            <CardDescription>Save your collection in different formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleDownloadCSV} className="w-full bg-transparent" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={handleDownloadJSON} className="w-full bg-transparent" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
            <Button onClick={handleDownloadTXT} className="w-full bg-transparent" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download TXT
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Collection Summary */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Collection Summary
          </CardTitle>
          <CardDescription>Overview of your purchased music collection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{purchaseData.tracks.length}</div>
              <div className="text-sm text-muted-foreground">Tracks</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{formatCurrency(purchaseData.totalCost)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{new Set(purchaseData.tracks.map((t) => t.artist)).size}</div>
              <div className="text-sm text-muted-foreground">Artists</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{new Set(purchaseData.tracks.map((t) => t.album)).size}</div>
              <div className="text-sm text-muted-foreground">Albums</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">Vendor Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                purchaseData.tracks.reduce(
                  (acc, track) => {
                    const vendor = track.vendors.find((v) => v.url === purchaseData.purchaseLinks[track.id])
                    if (vendor) {
                      acc[vendor.name] = (acc[vendor.name] || 0) + 1
                    }
                    return acc
                  },
                  {} as { [key: string]: number },
                ),
              ).map(([vendor, count]) => (
                <Badge key={vendor} variant="outline">
                  {vendor}: {count} tracks
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track List Preview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Track List Preview</CardTitle>
          <CardDescription>First 5 tracks in your collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {purchaseData.tracks.slice(0, 5).map((track, index) => {
              const vendor = track.vendors.find((v) => v.url === purchaseData.purchaseLinks[track.id])
              return (
                <div key={track.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {index + 1}. {track.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {track.artist} • {track.album}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor && (
                      <Badge variant="outline" className="bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/20">
                        {vendor.name} • {vendor.price}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a href={purchaseData.purchaseLinks[track.id]} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )
            })}
            {purchaseData.tracks.length > 5 && (
              <div className="text-center text-sm text-muted-foreground">
                ... and {purchaseData.tracks.length - 5} more tracks
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
