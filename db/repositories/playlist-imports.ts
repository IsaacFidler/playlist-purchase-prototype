import { and, desc, eq, sql } from "drizzle-orm"
import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgTransaction } from "drizzle-orm/pg-core"
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js"

import { getDb } from "@/db/client"
import type { DbClient } from "@/db/client"
import {
  importActivities,
  playlistImports,
  playlistTracks,
  profiles,
  vendorOffers,
  vendors,
} from "@/db/schema"
import type * as schema from "@/db/schema"
import { PlaylistPayload, SelectionPayload, TrackPayload } from "@/lib/validators/imports"
import { ensureUserPreferences } from "./user-preferences"

type DbOrTransaction =
  | DbClient
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >

type ImportEventType = (typeof importActivities.eventType)["enumValues"][number]

const KNOWN_VENDORS: Record<
  string,
  {
    id: string
    displayName: string
    primaryColor?: string
    secondaryColor?: string
    websiteUrl?: string
  }
> = {
  "apple itunes": {
    id: "itunes",
    displayName: "Apple iTunes",
    primaryColor: "#FF2D55",
    websiteUrl: "https://music.apple.com",
  },
  "apple music": {
    id: "itunes",
    displayName: "Apple iTunes",
    primaryColor: "#FF2D55",
    websiteUrl: "https://music.apple.com",
  },
  "discogs marketplace": {
    id: "discogs",
    displayName: "Discogs Marketplace",
    primaryColor: "#5865F2",
    websiteUrl: "https://www.discogs.com",
  },
  "discogs": {
    id: "discogs",
    displayName: "Discogs Marketplace",
    primaryColor: "#5865F2",
    websiteUrl: "https://www.discogs.com",
  },
  "bandcamp": {
    id: "bandcamp",
    displayName: "Bandcamp",
    primaryColor: "#13B4B1",
    websiteUrl: "https://bandcamp.com",
  },
  "bandcamp (via discogs)": {
    id: "bandcamp",
    displayName: "Bandcamp",
    primaryColor: "#13B4B1",
    websiteUrl: "https://bandcamp.com",
  },
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const parsePriceString = (price?: string | null) => {
  if (!price) return { amount: null, currency: "GBP" as const }
  const symbolMatch = price.trim().match(/^[^0-9a-zA-Z]+/)
  const currency = symbolMatch?.[0] === "£" ? "GBP" : symbolMatch?.[0] === "$" ? "USD" : "GBP"
  const numeric = price.replace(/[^0-9.,-]/g, "").replace(/,/g, "")
  const parsed = Number.parseFloat(numeric)
  return {
    amount: Number.isNaN(parsed) ? null : parsed,
    currency,
  }
}

const ensureProfile = async (userId: string, email?: string | null) => {
  if (!userId) return

  await getDb()
    .insert(profiles)
    .values({
      id: userId,
      email: email ?? "unknown@example.com",
    })
    .onConflictDoNothing({
      target: profiles.id,
    })
}

const ensureVendor = async (name: string) => {
  const key = name.toLowerCase()
  const preset = KNOWN_VENDORS[key]
  const fallbackId = slugify(name).slice(0, 32) || "vendor"
  const id = preset?.id ?? fallbackId
  return id
}

const getVendorIds = async (tx: DbOrTransaction, uniqueNames: string[]) => {
  if (uniqueNames.length === 0) return new Map<string, string>()

  const vendorEntries = uniqueNames.map((name) => {
    const key = name.toLowerCase()
    const preset = KNOWN_VENDORS[key]
    const fallbackId = slugify(name).slice(0, 32) || "vendor"
    return {
      id: preset?.id ?? fallbackId,
      displayName: preset?.displayName ?? name,
      primaryColor: preset?.primaryColor,
      secondaryColor: preset?.secondaryColor,
      websiteUrl: preset?.websiteUrl,
    }
  })

  await tx
    .insert(vendors)
    .values(vendorEntries)
    .onConflictDoNothing({ target: vendors.id })

  const vendorMap = new Map<string, string>()
  vendorEntries.forEach((entry) => vendorMap.set(entry.displayName, entry.id))

  return vendorMap
}

export async function createPlaylistImport({
  userId,
  playlist,
  userEmail,
}: {
  userId: string
  userEmail?: string | null
  playlist: PlaylistPayload
}) {
  await ensureProfile(userId, userEmail)
  await ensureUserPreferences(userId)

  console.info("[imports] createPlaylistImport:start", {
    userId,
    playlistName: playlist.name,
    trackCount: playlist.tracks.length,
  })

  const playlistId = crypto.randomUUID()

  const trackOffersAvailability = playlist.tracks.reduce((count, track) => {
    const availableVendors = track.vendors.filter((vendor) => vendor.available !== false)
    return count + availableVendors.length
  }, 0)

  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('statement_timeout', '60000', true)`)
    console.info("[imports] inserting playlist row", { playlistId })
    await tx.insert(playlistImports).values({
      id: playlistId,
      userId,
      source: "SPOTIFY",
      sourcePlaylistId: playlist.spotifyPlaylistId ?? null,
      sourceUrl: playlist.url,
      name: playlist.name,
      description: playlist.description ?? null,
      status: "READY",
      notes: null,
      totalTracks: playlist.trackCount,
      matchedTracks: playlist.tracks.length,
      availableOffers: trackOffersAvailability,
    })

    const trackRows: (typeof playlistTracks.$inferInsert)[] = []
    const offerRows: (typeof vendorOffers.$inferInsert)[] = []

    const uniqueVendors = Array.from(
      new Set(playlist.tracks.flatMap((track) => track.vendors.map((vendor) => vendor.name))),
    )
    const vendorMap = await getVendorIds(tx, uniqueVendors)

    for (const track of playlist.tracks) {
      const trackId = crypto.randomUUID()
      trackRows.push({
        id: trackId,
        importId: playlistId,
        orderIndex: track.orderIndex ?? 0,
        name: track.name,
        artists: track.artist,
        album: track.album ?? null,
        spotifyTrackId: track.spotifyId ?? null,
        spotifyTrackUrl: track.spotifyUrl ?? null,
        isrc: track.isrc ?? null,
        discNumber: 1,
        trackNumber: null,
        durationMs: track.durationMs,
        explicit: false,
        previewUrl: null,
        artworkUrl: null,
        popularity: null,
      })

      for (const vendor of track.vendors) {
        const vendorId = vendorMap.get(vendor.name) ?? (await ensureVendor(vendor.name))
        const { amount, currency } = parsePriceString(vendor.price)

        offerRows.push({
          id: crypto.randomUUID(),
          trackId,
          vendorId,
          title: track.name,
          subtitle: track.artist,
          externalId: null,
          externalUrl: vendor.url,
          currencyCode: currency,
          priceValue: amount !== null ? amount.toString() : null,
          availability: vendor.available === false ? "UNAVAILABLE" : "AVAILABLE",
          isPreview: false,
          countryCode: null,
          releaseDate: null,
          rawPayload: {
            vendorName: vendor.name,
            price: vendor.price,
          },
        })
      }
    }

    if (trackRows.length > 0) {
      console.info("[imports] bulk inserting tracks", { count: trackRows.length })
      try {
        await tx.insert(playlistTracks).values(trackRows)
      } catch (error) {
        console.error("[imports] failed to insert tracks", { error })
        throw error
      }
    }

    if (offerRows.length > 0) {
      console.info("[imports] bulk inserting offers", { count: offerRows.length })
      await tx.insert(vendorOffers).values(offerRows).onConflictDoNothing({ target: [vendorOffers.trackId, vendorOffers.vendorId] })
    }
  })

  console.info("[imports] createPlaylistImport:complete", { playlistId })
  return playlistId
}

export async function listPlaylistImports(userId: string) {
  const items = await getDb()
    .select({
      id: playlistImports.id,
      name: playlistImports.name,
      description: playlistImports.description,
      status: playlistImports.status,
      totalTracks: playlistImports.totalTracks,
      matchedTracks: playlistImports.matchedTracks,
      availableOffers: playlistImports.availableOffers,
      createdAt: playlistImports.createdAt,
    })
    .from(playlistImports)
    .where(eq(playlistImports.userId, userId))
    .orderBy(desc(playlistImports.createdAt))

  return items
}

export async function getPlaylistImport({ userId, importId }: { userId: string; importId: string }) {
  const record = await getDb().query.playlistImports.findFirst({
    where: and(eq(playlistImports.id, importId), eq(playlistImports.userId, userId)),
    with: {
      tracks: {
        orderBy: (tracks, { asc }) => asc(tracks.orderIndex),
        with: {
          offers: {
            with: {
              vendor: true,
            },
          },
        },
      },
      activities: {
        orderBy: (activities, { desc }) => desc(activities.createdAt),
      },
    },
  })

  if (!record) return null

  return record
}

export async function logImportActivity({
  importId,
  eventType,
  metadata,
  message,
}: {
  importId: string
  eventType: ImportEventType
  metadata?: Record<string, unknown>
  message?: string | null
}) {
  await getDb().insert(importActivities).values({
    id: crypto.randomUUID(),
    importId,
    eventType,
    message: message ?? null,
    metadata: metadata ?? null,
  })
}

export async function savePurchaseSelection({
  userId,
  importId,
  payload,
}: {
  userId: string
  importId: string
  payload: SelectionPayload
}) {
  const playlist = await getDb().query.playlistImports.findFirst({
    where: and(eq(playlistImports.id, importId), eq(playlistImports.userId, userId)),
    columns: {
      id: true,
    },
  })

  if (!playlist) {
    throw new Error("Playlist import not found")
  }

  await logImportActivity({
    importId,
    eventType: payload.status === "completed" ? "EXPORT_TRIGGERED" : "PURCHASE_INITIATED",
    metadata: {
      trackIds: payload.trackIds,
      totalCost: payload.totalCost,
      purchaseLinks: payload.purchaseLinks ?? null,
      savedAt: new Date().toISOString(),
      status: payload.status,
    },
  })
}

export async function getLatestPurchaseSelection({
  userId,
  importId,
}: {
  userId: string
  importId: string
}) {
  const playlist = await getDb()
    .select({ userId: playlistImports.userId })
    .from(playlistImports)
    .where(eq(playlistImports.id, importId))
    .limit(1)

  if (playlist.length === 0 || playlist[0].userId !== userId) {
    return null
  }

  const activities = await getDb()
    .select()
    .from(importActivities)
    .where(
      and(
        eq(importActivities.importId, importId),
        eq(importActivities.eventType, "PURCHASE_INITIATED" as ImportEventType),
      ),
    )
    .orderBy(desc(importActivities.createdAt))
    .limit(1)

  const fallbacks = await getDb()
    .select()
    .from(importActivities)
    .where(
      and(
        eq(importActivities.importId, importId),
        eq(importActivities.eventType, "EXPORT_TRIGGERED" as ImportEventType),
      ),
    )
    .orderBy(desc(importActivities.createdAt))
    .limit(1)

  const entry = activities[0] ?? fallbacks[0]

  if (!entry) return null

  return entry
}
