import { z } from "zod"

export const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  autoExport: z.boolean(),
  preferredVendors: z.array(z.string()),
})

export type PreferencesPayload = z.infer<typeof preferencesSchema>
