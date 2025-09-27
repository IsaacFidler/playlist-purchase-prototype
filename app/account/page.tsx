"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Settings, LogOut, Mail, Shield } from "lucide-react"
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react"

interface UserSettings {
  emailNotifications: boolean
  preferredVendors: string[]
  autoExport: boolean
}

export default function AccountPage() {
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    preferredVendors: ["Apple Music", "Bandcamp"],
    autoExport: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient()

  const { firstName, lastName } = useMemo(() => {
    if (!session?.user) return { firstName: "", lastName: "" }
    return {
      firstName: session.user.user_metadata?.first_name ?? "",
      lastName: session.user.user_metadata?.last_name ?? "",
    }
  }, [session])

  useEffect(() => {
    if (session === null) {
      router.replace("/login")
    }
  }, [session, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/")
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    // In a real app, you would save to backend
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
          <h1 className="text-3xl font-bold text-balance">Account Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your profile and preferences</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {/* User icon is removed to avoid redeclaration */}
                Profile Information
              </CardTitle>
              <CardDescription>Your basic account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={firstName} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={lastName} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={session.user?.email ?? ""} readOnly className="bg-muted/50" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Profile editing will be available in a future update</p>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about your playlists</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Export CSV</Label>
                  <p className="text-sm text-muted-foreground">Automatically export purchase links after import</p>
                </div>
                <Switch
                  checked={settings.autoExport}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoExport: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Preferred Vendors</Label>
                <p className="text-sm text-muted-foreground">Choose which music vendors to prioritize</p>
                <div className="space-y-2">
                  {["Apple Music", "Bandcamp", "Amazon Music", "7digital"].map((vendor) => (
                    <div key={vendor} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={vendor}
                        checked={settings.preferredVendors.includes(vendor)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings((prev) => ({
                              ...prev,
                              preferredVendors: [...prev.preferredVendors, vendor],
                            }))
                          } else {
                            setSettings((prev) => ({
                              ...prev,
                              preferredVendors: prev.preferredVendors.filter((v) => v !== vendor),
                            }))
                          }
                        }}
                        className="rounded border-border"
                      />
                      <Label htmlFor={vendor} className="text-sm font-normal">
                        {vendor}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since</span>
                </div>
                <p className="text-sm font-medium">January 2024</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Account Status</span>
                </div>
                <p className="text-sm font-medium text-[#00FF9D]">Active</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/import" className="w-full">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Import New Playlist
                </Button>
              </Link>

              <Link href="/dashboard" className="w-full">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  View Dashboard
                </Button>
              </Link>

              <Separator />

              <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
