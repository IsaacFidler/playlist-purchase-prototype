import { z } from "zod"

const UrlSchema = z.string().url()

export const vendorSchema = z.object({
  name: z.string().min(1),
  url: UrlSchema,
  price: z.string().optional(),
  available: z.boolean().optional(),
})

export const trackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable().optional(),
  duration: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  spotifyId: z.string().nullable().optional(),
  spotifyUrl: UrlSchema.optional(),
  isrc: z.string().nullable().optional(),
  orderIndex: z.number().int().nonnegative(),
  vendors: z.array(vendorSchema),
})

export const playlistPayloadSchema = z.object({
  spotifyPlaylistId: z.string().optional(),
  url: UrlSchema,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  trackCount: z.number().int().nonnegative(),
  importedAt: z.string(),
  tracks: z.array(trackSchema),
})

export type VendorPayload = z.infer<typeof vendorSchema>
export type TrackPayload = z.infer<typeof trackSchema>
export type PlaylistPayload = z.infer<typeof playlistPayloadSchema>

export const selectionPayloadSchema = z.object({
  trackIds: z.array(z.string()).min(1),
  totalCost: z.number().nonnegative(),
  purchaseLinks: z.record(z.string()).optional(),
  status: z.enum(["draft", "completed"]).default("draft"),
})

export type SelectionPayload = z.infer<typeof selectionPayloadSchema>
