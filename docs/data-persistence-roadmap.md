# Data Persistence & API Rollout Plan

This plan covers the remaining work to migrate the playlist flows from localStorage/dummy data to Supabase + Drizzle-backed APIs.

## 1. Current State (Audit Summary)

- `app/import/page.tsx` stores Spotify auth + playlist payload in `localStorage` (`spotify-auth`, `current-playlist`).
- `app/review/page.tsx` reads `current-playlist`, calculates totals locally, and writes selection to `purchase-data`.
- `app/purchase/page.tsx` consumes `purchase-data` → writes `completed-purchase`, which feeds `app/download/page.tsx`.
- PKCE helpers in `lib/spotify.ts` also rely on `localStorage` (acceptable for auth flow, but final playlist data should be persisted server-side).
- No API routes persist the import or vendor data; `app/api/spotify/playlist` only returns a JSON payload to the client.

## 2. Target Architecture

### 2.1 Data Access Layer

Create typed helpers in `db/` (e.g. `db/repositories/playlist.ts`):

- `createPlaylistImport({ userId, payload })` – inserts into `playlist_imports`, `playlist_tracks`, and `vendor_offers` within a transaction. Returns the new playlist ID.
- `listPlaylistImports(userId)` – returns summary cards (id, name, trackCount, createdAt, status).
- `getPlaylistImport({ userId, importId })` – full detail including tracks + vendor offers ordered by `orderIndex`.
- `updatePlaylistImport({ userId, importId, status, notes, availableOffers })` – specific field updates.
- `logImportActivity({ importId, eventType, metadata? })` – writes to `import_activities` for analytics/history.

Utilities should share TypeScript types derived from `db/schema.ts` and expose Zod schemas (under `lib/validators/`) for payload validation.

Account preferences live in `user_preferences`, surfaced via `db/repositories/user-preferences.ts` and `lib/validators/preferences.ts`.


### 2.2 API Routes (App Router)

| Route | Method | Description |
| --- | --- | --- |
| `/api/imports` | `POST` | Saves Spotify playlist response → persists playlist, tracks, vendor offers. Requires Supabase session. Returns `{ id }` with redirect pointer.
| `/api/imports` | `GET` | Lists the authenticated user’s imports (paged, optional status filter).
| `/api/imports/[id]` | `GET` | Returns full playlist with track/vendor data for review.
| `/api/imports/[id]` | `PATCH` | Allows updating status (`PROCESSING`, `READY`, `FAILED`, `ARCHIVED`) and user notes; logs activity.
| `/api/imports/[id]/selection` | `POST` | Persists selected track IDs + totals for purchase flow (stored in `import_activities` or new `purchase_sessions` table if needed).
| `/api/imports/[id]/selection` | `GET` | Retrieves the last saved selection to hydrate purchase/download pages.
| `/api/account/preferences` | `GET` / `PUT` | Reads and updates per-user notification/export/vendor settings. 

Implementation details:

- Use `createRouteClient()` (Supabase helper) to read the session cookie → derive `user.id`. Reject requests without a session (401).
- Validate JSON bodies with Zod (reject 400 on invalid data).
- Wrap multi-insert operations in `db.transaction(async (tx) => { … })` to ensure playlist + tracks + vendors commit atomically.
- Return plain JSON (no Next Response streaming needed yet).

### 2.3 Frontend Flow Changes

1. **Import Page**
   - After `/api/spotify/playlist` resolves, call `POST /api/imports` with the payload + vendor offers.
   - Use response `{ id }` to `router.push(/review?importId=...)` (or `/review/[id]`).
   - Remove `localStorage.setItem("current-playlist")`.

2. **Review Page**
   - Convert to server-side fetching via `fetch('/api/imports/[id]')` (or RSC loader) using the query parameter.
   - Maintain selection state locally; on “Purchase Selected” hit `POST /api/imports/[id]/selection` to persist choice + total, then navigate to `/purchase?importId=...` with track IDs.

3. **Purchase / Download Pages**
   - Use `GET /api/imports/[id]/selection` to retrieve the stored selection instead of `localStorage`.
   - Continue to compute totals client-side if necessary, but base data on DB records.
   - When marking download complete, write an `import_activity` event (`PURCHASE_INITIATED` / `EXPORT_TRIGGERED`).

4. **Dashboard**
   - Replace any stubbed metrics with data from `GET /api/imports`.

### 2.4 Session & Profile Handling

- On login/signup success, ensure a `profiles` row exists (`INSERT ... ON CONFLICT DO NOTHING`). Implement helper in `app/api/auth` callbacks or create `lib/profile.ts` invoked post-auth.
- All queries filter by `user_id` to satisfy RLS (RLS policies still need to be added later).

### 2.5 Optional Enhancements / Stretch

- Add a `purchase_sessions` table if we outgrow `import_activities` for storing cart selections.
- Add Supabase RLS policies once we finish wiring server routes.
- Instrument vendor re-sync endpoints (`POST /api/vendors/resync`) to refresh prices asynchronously (future iteration).

## 3. Execution Order & Status

### ✅ Completed

1. ✅ **Scaffold repositories + validators**
   - Created `db/repositories/playlist-imports.ts` with all CRUD functions
   - Created `db/repositories/user-preferences.ts`
   - Created validators in `lib/validators/` (imports, preferences)

2. ✅ **Implement core API routes**
   - ✅ `POST /api/imports` — Persists playlist imports to database
   - ✅ `GET /api/imports` — Lists user's imports
   - ✅ `GET /api/imports/[id]` — Retrieves full import with tracks/offers
   - ✅ `PATCH /api/imports/[id]` — Updates import status/notes
   - ✅ `POST /api/imports/[id]/selection` — Persists purchase selection
   - ✅ `GET /api/imports/[id]/selection` — Retrieves saved selection
   - ✅ `GET/PUT /api/account/preferences` — User preferences management

3. ✅ **Partial front-end migration**
   - ✅ `app/import/page.tsx` now calls `POST /api/imports` and redirects with `importId`
   - ✅ Removed `localStorage.setItem("current-playlist")` from import flow
   - ✅ Dashboard displays real imports from `GET /api/imports`

4. ✅ **Infrastructure**
   - ✅ Vendor table seeding via `KNOWN_VENDORS` preset in repository
   - ✅ Activity logging implemented via `logImportActivity()`
   - ✅ User preferences auto-creation on first access

### 🚧 In Progress

1. **Review Page Migration**
   - Currently reads from `?importId` query param but may still use localStorage fallback
   - Need to fully migrate to server-side data fetching via `GET /api/imports/[id]`

2. **Purchase/Download Pages**
   - Need to migrate from localStorage to `GET /api/imports/[id]/selection`
   - Purchase selection persistence API exists but frontend integration pending

### 📋 Remaining Work

1. Complete removal of `localStorage` usage for playlist data in review/purchase/download pages
2. Add Supabase RLS policies for row-level security
3. Clean up any remaining mocks or dummy data
4. Test full flow end-to-end with database persistence
5. Document final API surface in technical architecture doc (✅ already done)

This roadmap is mostly complete. The core persistence infrastructure is in place; remaining work is frontend migration to fully utilize the APIs.
