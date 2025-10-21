import { drizzle } from "drizzle-orm/postgres-js"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Lazy-loaded database instance
 * Only creates connection when first accessed, not at module load time
 */
let dbInstance: PostgresJsDatabase<typeof schema> | null = null

/**
 * Get database instance, creating connection on first call
 * Uses singleton pattern to reuse connection across requests
 */
export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error("DATABASE_URL is not set")
    }

    const client = postgres(connectionString, {
      ssl: "require",
      max: 1,
      prepare: false,
      connect_timeout: 10,
    })

    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

/**
 * @deprecated Use getDb() instead to ensure lazy loading
 * This export is kept for backward compatibility but will be removed
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})

export type DbClient = PostgresJsDatabase<typeof schema>
