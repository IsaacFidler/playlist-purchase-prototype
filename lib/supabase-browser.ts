import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export const createClient = () => createClientComponentClient()

export type SupabaseBrowserClient = ReturnType<typeof createClient>
