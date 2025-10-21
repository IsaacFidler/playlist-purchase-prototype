"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Music, Calendar, ExternalLink } from "lucide-react"
import { useSession } from "@supabase/auth-helpers-react"

interface PlaylistSummary {
  id: string
  name: string
  description: string | null
  status: string
  totalTracks: number
  matchedTracks: number
  availableOffers: number
  createdAt: string
}

type DashboardStat = {
  label: string
  value: number
  helper: string
}

export default function DashboardPage() {
  const [imports, setImports] = useState<PlaylistSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const session = useSession()

  const displayName = useMemo(() => {
    if (!session?.user) return "DJ"
    return (
      session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "DJ"
    )
  }, [session])

  useEffect(() => {
    if (session === null) {
      router.replace("/login")
      return
      return
    }

    const controller = new AbortController()

    const loadImports = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/imports", { signal: controller.signal })
        if (!response.ok) {
          throw new Error("Failed to load playlist imports")
        }
        const data = await response.json()
        setImports(data.imports ?? [])
      } catch (error) {
        console.error(error)
        setImports([])
      } finally {
        setIsLoading(false)
      }
    }

    loadImports()

    return () => controller.abort()
  }, [router, session])

  if (!session || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const monthImports = imports.filter((item) => new Date(item.createdAt) >= monthAgo)
  const stats: DashboardStat[] = [
    {
      label: "Total Playlists",
      value: imports.length,
      helper: `+${monthImports.length} in the last 30 days`,
    },
    {
      label: "Tracks Processed",
      value: imports.reduce((sum, item) => sum + item.matchedTracks, 0),
      helper: `${monthImports.reduce((sum, item) => sum + item.matchedTracks, 0)} added recently`,
    },
    {
      label: "Purchase Links",
      value: imports.reduce((sum, item) => sum + item.availableOffers, 0),
      helper: `${monthImports.reduce((sum, item) => sum + item.availableOffers, 0)} new this month`,
    },
  ]

  const recentActivity = imports
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY":
        return "bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/20"
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "QUEUED":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "FAILED":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "READY":
        return "ready"
      case "PROCESSING":
        return "processing"
      case "QUEUED":
        return "queued"
      case "FAILED":
        return "failed"
      case "ARCHIVED":
        return "archived"
      default:
        return status.toLowerCase()
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-balance">Welcome back, {displayName}!</h1>
          <p className="text-muted-foreground text-lg">
            Ready to turn more playlists into your personal music collection?
          </p>
        </div>

        <Link href="/import">
          <Button size="lg" className="text-lg px-8">
            <Plus className="mr-2 h-5 w-5" />
            Import New Playlist
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="w-full border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="w-full border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your recently processed playlists</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No playlists imported yet</p>
              <p className="text-sm text-muted-foreground">Import your first playlist to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{playlist.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{playlist.totalTracks} tracks</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(playlist.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(playlist.status)}>
                      {statusLabel(playlist.status)}
                    </Badge>
                    <Link href={`/review?importId=${playlist.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
