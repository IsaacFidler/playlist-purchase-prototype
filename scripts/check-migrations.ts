import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

async function checkMigrations() {
  const client = postgres(DATABASE_URL, { max: 1 })

  try {
    // Check if drizzle_migrations table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'drizzle_migrations'
      ) as exists
    `

    console.log("📋 Drizzle migrations table exists:", tableExists[0].exists)

    if (tableExists[0].exists) {
      // Show what migrations are tracked
      const migrations = await client`
        SELECT * FROM drizzle_migrations ORDER BY id
      `

      console.log("\n✅ Tracked migrations:")
      if (migrations.length === 0) {
        console.log("  (none)")
      } else {
        migrations.forEach((m) => {
          console.log(`  - ${m.hash} (created at: ${m.created_at})`)
        })
      }
    } else {
      console.log("\n⚠️  Drizzle migrations table doesn't exist yet")
      console.log("   It will be created on first migration run")
    }

    // Check if the enum exists (indicates 0001 was applied)
    const enumExists = await client`
      SELECT EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'import_event_type'
      ) as exists
    `

    console.log("\n🔍 Database state:")
    console.log("  - import_event_type enum exists:", enumExists[0].exists)

  } catch (error) {
    console.error("❌ Error checking migrations:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

checkMigrations()
