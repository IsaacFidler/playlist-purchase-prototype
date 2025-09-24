"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar"

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"])

export function DynamicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const syncSession = () => {
      const session = localStorage.getItem("playlist-session")
      setIsLoggedIn(!!session)
    }

    syncSession()
    setIsMounted(true)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "playlist-session") {
        syncSession()
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const session = localStorage.getItem("playlist-session")
    setIsLoggedIn(!!session)
  }, [pathname, isMounted])

  const isPublicRoute = PUBLIC_ROUTES.has(pathname)

  if (!isMounted && !isPublicRoute) {
    return null
  }

  const showSidebar = isLoggedIn && !isPublicRoute

  if (!showSidebar) {
    return (
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full pt-16">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <div className="border-b border-border/40 px-4 py-3 md:hidden">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="w-full flex-1 px-6 py-8">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
