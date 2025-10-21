# Database Migration Workflow

This document describes the database migration workflow using Drizzle ORM.

## Quick Reference

```bash
# Generate migration from schema changes
yarn db:generate

# Apply migrations to database
yarn db:migrate

# Open Drizzle Studio (database GUI)
yarn db:studio

# Verify RLS policies
npx tsx scripts/verify-rls.ts

# Check migration status
npx tsx scripts/check-migrations.ts
```

## Workflow

### 1. Making Schema Changes

Edit `db/schema.ts` to add/modify tables, columns, or relationships:

```typescript
export const myNewTable = pgTable("my_new_table", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // ...
})
```

### 2. Generate Migration

```bash
yarn db:generate
```

This creates:
- `drizzle/000X_description.sql` - The SQL migration file
- `drizzle/meta/000X_snapshot.json` - Schema snapshot
- Updates `drizzle/meta/_journal.json` - Migration journal

### 3. Review Generated SQL

**Always review** the generated SQL in `drizzle/000X_description.sql` before applying:
- Check for destructive operations (DROP TABLE, DROP COLUMN)
- Verify data migrations look correct
- Add any custom SQL (RLS policies, triggers, functions)

### 4. Apply Migration

```bash
yarn db:migrate
```

This:
- Reads migrations from `drizzle/` folder
- Checks which are already applied via `drizzle.__drizzle_migrations` table
- Applies only new migrations
- Tracks applied migrations automatically

### 5. Verify

```bash
# Check migration was applied
npx tsx scripts/check-migrations.ts

# If RLS policies were added
npx tsx scripts/verify-rls.ts
```

## Manual SQL Migrations

For custom SQL (like RLS policies, triggers, or functions):

1. Create SQL file: `drizzle/000X_description.sql`
2. Add entry to `drizzle/meta/_journal.json`:

```json
{
  "idx": 2,
  "version": "7",
  "when": 1759105280000,
  "tag": "0002_description",
  "breakpoints": true
}
```

3. Copy previous snapshot: `cp drizzle/meta/0001_snapshot.json drizzle/meta/0002_snapshot.json`
4. Update snapshot IDs (use `uuidgen` to generate new UUIDs)
5. Run `yarn db:migrate`

## Migration Scripts

### `scripts/migrate.ts`
Main migration runner. Uses Drizzle's `migrate()` function to apply pending migrations.

### `scripts/init-migration-tracking.ts`
One-time script to sync manually-applied migrations with Drizzle's tracking system. Only needed if migrations were applied outside of Drizzle.

### `scripts/check-migrations.ts`
Utility to check migration status and what's tracked in the database.

### `scripts/verify-rls.ts`
Verifies RLS (Row Level Security) is enabled on all tables and counts policies.

## Database Configuration

Configuration is in `drizzle.config.ts`:

```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
  migrations: {
    table: "drizzle_migrations",  // Stored in drizzle schema
    schema: "public",
  },
})
```

Migrations are tracked in `drizzle.__drizzle_migrations` table.

## Troubleshooting

### Migration Already Applied Error
If you get "already exists" errors:
1. Check `drizzle.__drizzle_migrations` to see what's tracked
2. If migration was applied manually, run `scripts/init-migration-tracking.ts`

### Rollback Not Supported
Drizzle doesn't support automatic rollbacks. To rollback:
1. Write a new migration that reverses the changes
2. Or manually execute SQL to undo changes
3. Then run `yarn db:migrate` with the new migration

### RLS Policies Not Working
1. Verify RLS is enabled: `npx tsx scripts/verify-rls.ts`
2. Check you're using `FORCE ROW LEVEL SECURITY` for table owners
3. Verify `auth.uid()` function exists in your database (Supabase provides this)

## Production Deployment

For production:
1. Run migrations as part of CI/CD pipeline
2. Always test migrations in staging first
3. Have rollback plan ready
4. Consider using database backups before major migrations

Example CI/CD step:
```bash
# In your deployment pipeline
yarn db:migrate
```

## Additional Resources

- [Drizzle Migrations Documentation](https://orm.drizzle.team/docs/migrations)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- Technical architecture: `technical-architecture.md`
