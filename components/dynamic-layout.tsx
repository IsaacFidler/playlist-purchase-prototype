"use client"

import type React from "react"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "@supabase/auth-helpers-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar"

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"])

export function DynamicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const session = useSession()
  const isPublicRoute = PUBLIC_ROUTES.has(pathname)

  useEffect(() => {
    if (!session && !isPublicRoute) {
      router.replace("/login")
    }
  }, [session, isPublicRoute, router])

  const showSidebar = !!session && !isPublicRoute

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
