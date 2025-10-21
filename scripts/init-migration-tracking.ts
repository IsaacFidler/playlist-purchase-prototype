import postgres from "postgres"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

// Load environment variables
dotenv.config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

/**
 * This script initializes the drizzle_migrations table and marks
 * migrations 0000 and 0001 as already applied (since they exist in the database)
 */
async function initMigrationTracking() {
  const client = postgres(DATABASE_URL, { max: 1 })

  try {
    console.log("🔄 Initializing migration tracking...")

    // 1. Ensure drizzle schema and table exist
    await client`CREATE SCHEMA IF NOT EXISTS drizzle`
    await client`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `
    console.log("✅ Ensured drizzle.__drizzle_migrations table exists")

    // 2. Read migration files and generate hashes
    const migrationsDir = path.join(process.cwd(), "drizzle")

    const migrations = [
      "0000_lying_sharon_ventura.sql",
      "0001_unknown_kitty_pryde.sql"
    ]

    for (const filename of migrations) {
      const filePath = path.join(migrationsDir, filename)

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Migration file not found: ${filename}`)
        continue
      }

      const fileContent = fs.readFileSync(filePath, "utf-8")
      const hash = crypto.createHash("sha256").update(fileContent).digest("hex")

      // Insert migration record
      await client`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${Date.now()})
      `

      console.log(`✅ Marked ${filename} as applied (hash: ${hash.substring(0, 12)}...)`)
    }

    console.log("\n✅ Migration tracking initialized successfully")
    console.log("   You can now run 'yarn db:migrate' to apply new migrations")

  } catch (error) {
    console.error("❌ Error initializing migration tracking:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

initMigrationTracking()
