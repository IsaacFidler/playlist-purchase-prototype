import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { vendors } from "@/db/schema"

export async function GET() {
  const results = await db
    .select({
      id: vendors.id,
      displayName: vendors.displayName,
      primaryColor: vendors.primaryColor,
      secondaryColor: vendors.secondaryColor,
      websiteUrl: vendors.websiteUrl,
    })
    .from(vendors)
    .orderBy(vendors.displayName)

  return NextResponse.json({ vendors: results })
}
