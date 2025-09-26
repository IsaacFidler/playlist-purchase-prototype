"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ExternalLink, CheckCircle, AlertCircle, Download, ShoppingCart } from "lucide-react"

interface Track {
  id: string
  name: string
  artist: string
  album: string
  duration: string
  vendors: {
    name: string
    url: string
    price: string
    available: boolean
  }[]
}

interface PurchaseData {
  tracks: Track[]
  totalCost: number
  playlistName: string
  timestamp: string
}

interface PurchaseProgress {
  step: string
  progress: number
  message: string
  completedTracks: string[]
}

export default function PurchasePage() {
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [purchaseProgress, setPurchaseProgress] = useState<PurchaseProgress | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchaseLinks, setPurchaseLinks] = useState<{ [key: string]: string }>({})
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("playlist-session")
    if (!session) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)

    // Load purchase data
    const storedPurchaseData = localStorage.getItem("purchase-data")
    if (storedPurchaseData) {
      const data = JSON.parse(storedPurchaseData) as PurchaseData
      setPurchaseData(data)
    }
  }, [router])

  const getBestVendor = (track: Track) => {
    return track.vendors
      .filter((v) => v.available)
      .sort((a, b) => Number.parseFloat(a.price.replace("$", "")) - Number.parseFloat(b.price.replace("$", "")))[0]
  }

  const handleStartPurchase = async () => {
    if (!purchaseData) return

    setIsPurchasing(true)
    setPurchaseProgress({
      step: "preparing",
      progress: 0,
      message: "Preparing purchase links...",
      completedTracks: [],
    })

    const totalTracks = purchaseData.tracks.length
    const links: { [key: string]: string } = {}

    // Simulate processing each track
    for (let i = 0; i < totalTracks; i++) {
      const track = purchaseData.tracks[i]
      const bestVendor = getBestVendor(track)

      setPurchaseProgress({
        step: "processing",
        progress: ((i + 1) / totalTracks) * 80,
        message: `Processing ${track.name} by ${track.artist}...`,
        completedTracks: purchaseData.tracks.slice(0, i + 1).map((t) => t.id),
      })

      // Store the purchase link
      if (bestVendor) {
        links[track.id] = bestVendor.url
      }

      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    setPurchaseProgress({
      step: "finalizing",
      progress: 90,
      message: "Finalizing purchase collection...",
      completedTracks: purchaseData.tracks.map((t) => t.id),
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setPurchaseProgress({
      step: "complete",
      progress: 100,
      message: "Purchase collection ready!",
      completedTracks: purchaseData.tracks.map((t) => t.id),
    })

    setPurchaseLinks(links)
    setPurchaseComplete(true)
    setIsPurchasing(false)

    // Store completed purchase for download page
    const completedPurchase = {
      ...purchaseData,
      purchaseLinks: links,
      completedAt: new Date().toISOString(),
    }
    localStorage.setItem("completed-purchase", JSON.stringify(completedPurchase))
  }

  const handleOpenAllLinks = () => {
    Object.values(purchaseLinks).forEach((url, index) => {
      setTimeout(() => {
        window.open(url, "_blank")
      }, index * 500) // Stagger opening to avoid popup blockers
    })
  }

  const handleDownloadCollection = () => {
    router.push("/download")
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

  if (!purchaseData) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-4">
          <Link
            href="/review"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to review
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-balance">Purchase Tracks</h1>
            <p className="text-muted-foreground text-lg">No purchase data found</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tracks selected for purchase. Please go back and select tracks to purchase.
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
          href="/review"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to review
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-balance">Purchase Collection</h1>
          <p className="text-muted-foreground text-lg">
            {purchaseData.playlistName} • {purchaseData.tracks.length} tracks • ${purchaseData.totalCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Purchase Progress */}
      {purchaseProgress && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{purchaseProgress.message}</span>
              <span className="font-medium">{purchaseProgress.progress.toFixed(0)}%</span>
            </div>
            <Progress value={purchaseProgress.progress} className="h-2" />
            {purchaseProgress.step === "complete" && (
              <div className="flex items-center gap-2 text-[#00FF9D]">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">All purchase links ready!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchase Summary */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Purchase Summary</CardTitle>
          <CardDescription>Review your selected tracks and their purchase sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {purchaseData.tracks.map((track) => {
              const bestVendor = getBestVendor(track)
              const isCompleted = purchaseProgress?.completedTracks.includes(track.id)

              return (
                <div key={track.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{track.name}</h3>
                      {isCompleted && <CheckCircle className="h-4 w-4 text-[#00FF9D]" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {track.artist} • {track.album}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {bestVendor && (
                      <Badge variant="outline" className="bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/20">
                        {bestVendor.name} • {bestVendor.price}
                      </Badge>
                    )}
                    {purchaseComplete && purchaseLinks[track.id] && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={purchaseLinks[track.id]} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Total Cost</p>
              <p className="text-sm text-muted-foreground">{purchaseData.tracks.length} tracks</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${purchaseData.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!purchaseComplete ? (
          <Button
            onClick={handleStartPurchase}
            disabled={isPurchasing}
            size="lg"
            className="bg-[#00FF9D] hover:bg-[#00E38C] text-[#032B1A]"
          >
            {isPurchasing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Processing Purchase...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Start Purchase Process
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <Button onClick={handleOpenAllLinks} variant="outline" size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open All Purchase Links
            </Button>
            <Button onClick={handleDownloadCollection} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Download Collection
            </Button>
          </div>
        )}
      </div>

      {purchaseComplete && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your purchase collection is ready! You can now open all purchase links or download the collection for later
            use.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
