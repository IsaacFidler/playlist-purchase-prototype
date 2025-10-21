import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MEMBER"])
export const playlistSourceEnum = pgEnum("playlist_source", [
  "SPOTIFY",
  "APPLE_MUSIC",
  "YOUTUBE",
  "MANUAL_UPLOAD",
])
export const importStatusEnum = pgEnum("import_status", [
  "QUEUED",
  "PROCESSING",
  "READY",
  "FAILED",
  "ARCHIVED",
])
export const offerAvailabilityEnum = pgEnum("offer_availability", [
  "AVAILABLE",
  "UNAVAILABLE",
  "UNKNOWN",
  "OUT_OF_STOCK",
])
export const importEventTypeEnum = pgEnum("import_event_type", [
  "IMPORT_STARTED",
  "SPOTIFY_SYNCED",
  "ENRICHMENT_COMPLETE",
  "REVIEW_READY",
  "EXPORT_TRIGGERED",
  "PURCHASE_INITIATED",
  "ERROR",
])

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("MEMBER"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    onboardingStep: varchar("onboarding_step", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("profiles_email_unique").on(table.email),
  }),
)

export const spotifyAccounts = pgTable(
  "spotify_accounts",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    scope: text("scope"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    tokenType: varchar("token_type", { length: 32 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex("spotify_accounts_user_unique").on(table.userId),
    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "spotify_accounts_user_id_fkey",
    }).onDelete("cascade"),
  }),
)

export const playlistImports = pgTable(
  "playlist_imports",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    source: playlistSourceEnum("source").notNull().default("SPOTIFY"),
    sourcePlaylistId: varchar("source_playlist_id", { length: 128 }),
    sourceUrl: text("source_url").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: importStatusEnum("status").notNull().default("QUEUED"),
    notes: text("notes"),
    totalTracks: integer("total_tracks").notNull().default(0),
    matchedTracks: integer("matched_tracks").notNull().default(0),
    availableOffers: integer("available_offers").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    lastVendorSyncAt: timestamp("last_vendor_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("playlist_imports_user_status_idx").on(table.userId, table.status),
    sourceIdx: index("playlist_imports_source_idx").on(table.source, table.sourcePlaylistId),
    ownerFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "playlist_imports_user_id_fkey",
    }).onDelete("cascade"),
  }),
)

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: text("id").primaryKey(),
    importId: text("import_id").notNull(),
    orderIndex: integer("order_index").notNull(),
    name: text("name").notNull(),
    artists: text("artists").notNull(),
    album: text("album"),
    spotifyTrackId: varchar("spotify_track_id", { length: 128 }),
    spotifyTrackUrl: text("spotify_track_url"),
    isrc: varchar("isrc", { length: 15 }),
    discNumber: integer("disc_number").default(1),
    trackNumber: integer("track_number"),
    durationMs: integer("duration_ms"),
    explicit: boolean("explicit").notNull().default(false),
    previewUrl: text("preview_url"),
    artworkUrl: text("artwork_url"),
    popularity: integer("popularity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    importOrderIdx: index("playlist_tracks_import_order_idx").on(table.importId, table.orderIndex),
    spotifyTrackIdx: index("playlist_tracks_spotify_idx").on(table.spotifyTrackId),
    isrcIdx: index("playlist_tracks_isrc_idx").on(table.isrc),
    importFk: foreignKey({
      columns: [table.importId],
      foreignColumns: [playlistImports.id],
      name: "playlist_tracks_import_id_fkey",
    }).onDelete("cascade"),
  }),
)

export const vendors = pgTable("vendors", {
  id: varchar("id", { length: 32 }).primaryKey(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  websiteUrl: text("website_url"),
  primaryColor: varchar("primary_color", { length: 16 }),
  secondaryColor: varchar("secondary_color", { length: 16 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const vendorOffers = pgTable(
  "vendor_offers",
  {
    id: text("id").primaryKey(),
    trackId: text("track_id").notNull(),
    vendorId: varchar("vendor_id", { length: 32 }).notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    externalId: varchar("external_id", { length: 128 }),
    externalUrl: text("external_url").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    priceValue: numeric("price_value", { precision: 12, scale: 2 }),
    availability: offerAvailabilityEnum("availability").notNull().default("UNKNOWN"),
    isPreview: boolean("is_preview").notNull().default(false),
    countryCode: varchar("country_code", { length: 2 }),
    releaseDate: timestamp("release_date", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    trackAvailabilityIdx: index("vendor_offers_track_availability_idx").on(
      table.trackId,
      table.availability,
    ),
    vendorAvailabilityIdx: index("vendor_offers_vendor_availability_idx").on(
      table.vendorId,
      table.availability,
    ),
    trackVendorUnique: uniqueIndex("vendor_offers_track_vendor_unique").on(table.trackId, table.vendorId),
    externalIdIdx: index("vendor_offers_external_id_idx").on(table.externalId),
    trackFk: foreignKey({
      columns: [table.trackId],
      foreignColumns: [playlistTracks.id],
      name: "vendor_offers_track_id_fkey",
    }).onDelete("cascade"),
    vendorFk: foreignKey({
      columns: [table.vendorId],
      foreignColumns: [vendors.id],
      name: "vendor_offers_vendor_id_fkey",
    }).onDelete("cascade"),
  }),
)

export const importActivities = pgTable(
  "import_activities",
  {
    id: text("id").primaryKey(),
    importId: text("import_id").notNull(),
    eventType: importEventTypeEnum("event_type").notNull(),
    message: text("message"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index("import_activities_event_idx").on(table.importId, table.eventType),
    importFk: foreignKey({
      columns: [table.importId],
      foreignColumns: [playlistImports.id],
      name: "import_activities_import_id_fkey",
    }).onDelete("cascade"),
  }),
)

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    autoExport: boolean("auto_export").notNull().default(false),
    preferredVendors: text("preferred_vendors").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
)

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  spotifyAccounts: many(spotifyAccounts),
  playlistImports: many(playlistImports),
  preferences: one(userPreferences, {
    fields: [profiles.id],
    references: [userPreferences.userId],
  }),
}))

export const spotifyAccountsRelations = relations(spotifyAccounts, ({ one }) => ({
  profile: one(profiles, {
    fields: [spotifyAccounts.userId],
    references: [profiles.id],
  }),
}))

export const playlistImportsRelations = relations(playlistImports, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [playlistImports.userId],
    references: [profiles.id],
  }),
  tracks: many(playlistTracks),
  activities: many(importActivities),
}))

export const playlistTracksRelations = relations(playlistTracks, ({ one, many }) => ({
  playlistImport: one(playlistImports, {
    fields: [playlistTracks.importId],
    references: [playlistImports.id],
  }),
  offers: many(vendorOffers),
}))

export const vendorOffersRelations = relations(vendorOffers, ({ one }) => ({
  track: one(playlistTracks, {
    fields: [vendorOffers.trackId],
    references: [playlistTracks.id],
  }),
  vendor: one(vendors, {
    fields: [vendorOffers.vendorId],
    references: [vendors.id],
  }),
}))

export const importActivitiesRelations = relations(importActivities, ({ one }) => ({
  playlistImport: one(playlistImports, {
    fields: [importActivities.importId],
    references: [playlistImports.id],
  }),
}))

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  profile: one(profiles, {
    fields: [userPreferences.userId],
    references: [profiles.id],
  }),
}))
