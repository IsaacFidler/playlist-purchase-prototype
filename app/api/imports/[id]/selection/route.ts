import { NextResponse } from "next/server"

import {
  getLatestPurchaseSelection,
  savePurchaseSelection,
} from "@/db/repositories/playlist-imports"
import { createRouteClient } from "@/lib/supabase-server"
import { selectionPayloadSchema } from "@/lib/validators/imports"

interface SelectionMetadata {
  trackIds?: string[]
  totalCost?: number
  purchaseLinks?: Record<string, string> | null
  status?: "draft" | "completed"
  savedAt?: string
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const entry = await getLatestPurchaseSelection({ userId: user.id, importId: params.id })

    if (!entry) {
      return NextResponse.json({ selection: null })
    }

    const metadata = entry.metadata as SelectionMetadata | null

    return NextResponse.json({
      selection: {
        trackIds: metadata?.trackIds ?? [],
        totalCost: metadata?.totalCost ?? 0,
        purchaseLinks: metadata?.purchaseLinks ?? null,
        status: metadata?.status ?? "draft",
        savedAt: metadata?.savedAt ?? entry.createdAt,
      },
    })
  } catch (error) {
    console.error("[API /api/imports/[id]/selection GET] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load selection",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
      userId: user.id,
      importId: params.id,
      payload: parsed.data,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to persist selection", error)
    return NextResponse.json({ error: "Failed to save selection" }, { status: 400 })
  }
}
