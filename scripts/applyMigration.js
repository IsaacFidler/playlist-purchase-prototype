const fs = require("fs")
const path = require("path")
const postgres = require("postgres")

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  const migrationFile = process.argv[2]
  if (!migrationFile) {
    throw new Error("Usage: node scripts/applyMigration.js <path-to-sql-migration>")
  }

  const absolutePath = path.resolve(process.cwd(), migrationFile)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Migration file not found at ${absolutePath}`)
  }

  const sqlClient = postgres(connectionString, {
    ssl: "require",
    max: 1,
  })

  const rawContents = fs.readFileSync(absolutePath, "utf8")
  const statements = rawContents
    .split(/-->(?:\s*)statement-breakpoint/g)
    .map((statement) => statement.trim())
    .filter(Boolean)

  console.log(`Applying ${statements.length} statements from ${migrationFile}...`)

  try {
    for (const statement of statements) {
      await sqlClient.unsafe(statement)
    }
    console.log("Migration applied successfully")
  } catch (error) {
    console.error("Failed to apply migration:", error)
    process.exitCode = 1
  } finally {
    await sqlClient.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
