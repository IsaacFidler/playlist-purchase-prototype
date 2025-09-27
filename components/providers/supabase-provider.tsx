"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { SessionContextProvider } from "@supabase/auth-helpers-react"
import type { Session } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase-browser"

type SupabaseProviderProps = {
  children: ReactNode
  initialSession?: Session | null
}

export function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  const [supabaseClient] = useState(() => createClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  )
}
