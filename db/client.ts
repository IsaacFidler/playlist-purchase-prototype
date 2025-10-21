import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

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

export const db = drizzle(client, { schema })
export type DbClient = typeof db
