import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { userPreferences } from "@/db/schema"
import { preferencesSchema } from "@/lib/validators/preferences"

const defaultPreferences = {
  emailNotifications: true,
  autoExport: false,
  preferredVendors: [] as string[],
}

export async function ensureUserPreferences(userId: string) {
  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(userPreferences).values({
      userId,
      emailNotifications: true,
      autoExport: false,
      preferredVendors: [],
    })
  }
}

export async function getUserPreferences(userId: string) {
  await ensureUserPreferences(userId)

  const [preferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  if (!preferences) {
    return { userId, ...defaultPreferences, createdAt: new Date(), updatedAt: new Date() }
  }

  return preferences
}

export async function updateUserPreferences(userId: string, payload: unknown) {
  const parsed = preferencesSchema.parse(payload)

  await ensureUserPreferences(userId)

  await db
    .update(userPreferences)
    .set({
      emailNotifications: parsed.emailNotifications,
      autoExport: parsed.autoExport,
      preferredVendors: parsed.preferredVendors,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.userId, userId))
}
