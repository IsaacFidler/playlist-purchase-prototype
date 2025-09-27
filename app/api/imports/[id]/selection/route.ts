import { NextResponse } from "next/server"

import {
  getLatestPurchaseSelection,
  savePurchaseSelection,
} from "@/db/repositories/playlist-imports"
import { createRouteClient } from "@/lib/supabase-server"
import { selectionPayloadSchema } from "@/lib/validators/imports"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entry = await getLatestPurchaseSelection({ userId: session.user.id, importId: params.id })

  if (!entry) {
    return NextResponse.json({ selection: null })
  }

  return NextResponse.json({
    selection: {
      trackIds: (entry.metadata as any)?.trackIds ?? [],
      totalCost: (entry.metadata as any)?.totalCost ?? 0,
      purchaseLinks: (entry.metadata as any)?.purchaseLinks ?? null,
      status: (entry.metadata as any)?.status ?? "draft",
      savedAt: (entry.metadata as any)?.savedAt ?? entry.createdAt,
    },
  })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  if (!json) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = selectionPayloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await savePurchaseSelection({
      userId: session.user.id,
      importId: params.id,
      payload: parsed.data,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to persist selection", error)
    return NextResponse.json({ error: "Failed to save selection" }, { status: 400 })
  }
}
