import { NextResponse } from "next/server"

import {
  getUserPreferences,
  updateUserPreferences,
} from "@/db/repositories/user-preferences"
import { createRouteClient } from "@/lib/supabase-server"
import { preferencesSchema } from "@/lib/validators/preferences"

export async function GET() {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const preferences = await getUserPreferences(session.user.id)

  return NextResponse.json({
    preferences: {
      emailNotifications: preferences.emailNotifications,
      autoExport: preferences.autoExport,
      preferredVendors: preferences.preferredVendors ?? [],
    },
  })
}

export async function PUT(request: Request) {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = preferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await updateUserPreferences(session.user.id, parsed.data)

  return NextResponse.json({ ok: true })
}
