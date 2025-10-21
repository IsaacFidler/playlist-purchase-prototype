import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { DynamicLayout } from "@/components/dynamic-layout"
import { SupabaseProvider } from "@/components/providers/supabase-provider"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Playlist Purchase Prototype",
  description: "Turn your playlists into purchasable music collections",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen gradient-bg">
        <SupabaseProvider initialSession={session}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <Header />
            <DynamicLayout>{children}</DynamicLayout>
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
