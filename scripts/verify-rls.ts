import postgres from "postgres"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

async function verifyRLS() {
  const client = postgres(DATABASE_URL, { max: 1 })

  try {
    console.log("🔍 Checking RLS policies...")

    // Check if RLS is enabled on tables
    const rlsStatus = await client`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'spotify_accounts', 'playlist_imports',
                         'playlist_tracks', 'vendor_offers', 'import_activities',
                         'user_preferences')
      ORDER BY tablename
    `

    console.log("\n📋 RLS status for tables:")
    rlsStatus.forEach((table) => {
      const status = table.rowsecurity ? "✅ ENABLED" : "❌ DISABLED"
      console.log(`  ${table.tablename}: ${status}`)
    })

    // Count policies
    const policies = await client`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `

    console.log(`\n📜 Total RLS policies: ${policies.length}`)

    const policyCount = policies.reduce((acc, p) => {
      acc[p.tablename] = (acc[p.tablename] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log("\n📊 Policies per table:")
    Object.entries(policyCount).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} policies`)
    })

    // Check migration was tracked
    const migrations = await client`
      SELECT * FROM drizzle.__drizzle_migrations ORDER BY id
    `

    console.log(`\n✅ Tracked migrations: ${migrations.length}`)
    console.log("   (Expecting 3: 0000, 0001, and 0002)")

  } catch (error) {
    console.error("❌ Error verifying RLS:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

verifyRLS()
