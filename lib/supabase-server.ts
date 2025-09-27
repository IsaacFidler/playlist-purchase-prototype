import { cookies } from "next/headers"
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs"

export const createServerClient = () =>
  createServerComponentClient({
    cookies,
  })

export const createRouteClient = () =>
  createRouteHandlerClient({
    cookies,
  })

export type SupabaseServerClient = ReturnType<typeof createServerClient>
export type SupabaseRouteClient = ReturnType<typeof createRouteClient>
