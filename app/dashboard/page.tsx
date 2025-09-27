"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Music, Calendar, ExternalLink } from "lucide-react"
import { useSession } from "@supabase/auth-helpers-react"

interface PlaylistActivity {
  id: string
  name: string
  trackCount: number
  date: string
  status: "completed" | "in-progress" | "pending"
}

export default function DashboardPage() {
  const [recentActivity, setRecentActivity] = useState<PlaylistActivity[]>([])
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
    }

    // Mock recent activity data
    setRecentActivity([
      {
        id: "1",
        name: "Summer Vibes 2024",
        trackCount: 32,
        date: "2024-01-15",
        status: "completed",
      },
      {
        id: "2",
        name: "Deep House Essentials",
        trackCount: 28,
        date: "2024-01-12",
        status: "in-progress",
      },
      {
        id: "3",
        name: "Indie Rock Classics",
        trackCount: 45,
        date: "2024-01-10",
        status: "completed",
      },
      {
        id: "4",
        name: "Chill Study Beats",
        trackCount: 18,
        date: "2024-01-08",
        status: "pending",
      },
    ])
  }, [router])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/20"
      case "in-progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-muted text-muted-foreground"
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
        <Card className="w-full border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Playlists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>

        <Card className="w-full border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracks Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">+28 this week</p>
          </CardContent>
        </Card>

        <Card className="w-full border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">289</div>
            <p className="text-xs text-muted-foreground">83% success rate</p>
          </CardContent>
        </Card>
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
                        <span>{playlist.trackCount} tracks</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(playlist.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(playlist.status)}>
                      {playlist.status}
                    </Badge>
                    {playlist.status === "completed" && (
                      <Link href="/review">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
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
