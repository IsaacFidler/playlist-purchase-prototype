# Technical Architecture — Playlist Purchase Prototype

## 1) Goals & Constraints

- **Goal (MVP):** Paste a Spotify playlist URL → return an ordered list of tracks with purchase links from multiple vendors (Apple iTunes, Discogs).
- **Out of scope:** Automated purchase, bulk downloads, and file system reorganization.
- **Constraints:** Full-stack application with Next.js frontend and Supabase backend, requiring database setup and external API integrations, designed for production deployment with proper authentication and data persistence.

---

## 2) Current High-Level Architecture

- **Frontend:** Next.js 14 (App Router) with React 19, TypeScript, and Tailwind CSS v4.
  - Development server runs with `yarn dev`
  - Client components for interactive features, server components for static content
  - Supabase Auth Helpers for session management
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
  - Database managed via Drizzle ORM (type-safe query builder)
  - REST-style API routes in Next.js App Router (`app/api/*`)
  - Vendor search integrations (Apple iTunes, Discogs)
- **State & Data Flow:**
  - Real authentication flow with Supabase Auth (JWT tokens in httpOnly cookies)
  - Playlist imports persisted to PostgreSQL via API routes
  - Spotify OAuth handled via PKCE flow (tokens stored in localStorage)
  - Vendor offer data cached in database with availability tracking
- **UI System:**
  - shadcn/ui primitives under `components/ui/*` combined with Tailwind utility classes
  - Global theming handled by `next-themes` via `components/theme-provider.tsx`
  - Gradient background and typography configured in `app/globals.css`
- **APIs & Integrations:**
  - Spotify Web API (PKCE OAuth + Playlist fetching)
  - Apple iTunes Search API (track matching via ISRC/artist+title)
  - Discogs API (marketplace search and product links)
- **Deployment:**
  - Designed for Vercel deployment (frontend + API routes)
  - Supabase hosted PostgreSQL database
  - Environment variables managed via `.env.local` (see `.env.example`)

---

## 3) Technology Stack

### Frontend
- **Framework:** Next.js 14 with App Router
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **Type Safety:** TypeScript
- **Auth Client:** `@supabase/auth-helpers-nextjs`, `@supabase/auth-helpers-react`
- **Form Handling:** `react-hook-form` with `@hookform/resolvers`
- **Validation:** Zod schemas

### Backend
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Auth:** Supabase Auth (JWT-based)
- **API:** Next.js App Router API routes (REST endpoints)

### External Services
- **Spotify Web API:** PKCE OAuth flow + playlist data
- **Apple iTunes Search API:** Track lookup and purchase links
- **Discogs API:** Marketplace search and vendor links

---

## 4) Modules & Responsibilities

### 4.1 Frontend - App Router Segments (`app/`)

- `/` — Marketing landing page with CTA buttons for sign-up/login
- `/login` & `/signup` — Form flows that authenticate via Supabase Auth
- `/dashboard` — Auth-gated overview showing user's playlist imports and activity
- `/import` — Playlist URL form with Spotify OAuth + import flow
- `/review` — Displays imported playlist tracks with vendor links and selection UI
- `/account` — User profile and preferences management
- `/auth/callback` — Spotify OAuth callback handler

Pages use a mix of server and client components, with Supabase for session management.

### 4.2 Frontend - Components (`components/`)

- `components/header.tsx` renders navigation, theme toggle, and auth state
- `components/theme-provider.tsx` wraps `next-themes` to enable dark/light switching
- `components/ui/*` contains shadcn-generated primitives (Button, Card, Table, etc.) tailored via Tailwind CSS
- Custom components for playlist review, track selection, and vendor offer display

### 4.3 Frontend - Hooks & Utilities

- `hooks/use-toast.ts` implements the toast store used by shadcn's `<Toaster />` pattern
- `hooks/use-mobile.ts` exposes breakpoint detection for responsive behaviour
- `lib/utils.ts` houses `cn`, a Tailwind class merger built on `clsx` + `tailwind-merge`
- `lib/spotify.ts` contains PKCE OAuth helpers for Spotify authentication
- `lib/supabase-server.ts` provides server-side Supabase client utilities
- `lib/validators/*` contains Zod schemas for API request/response validation

### 4.4 Backend - API Routes (`app/api/`)

| Route | Method | Description |
| --- | --- | --- |
| `/api/auth/token` | POST | Exchanges Spotify authorization code for access token |
| `/api/auth/refresh` | POST | Refreshes Spotify access token using refresh token |
| `/api/spotify/playlist` | POST | Fetches playlist data from Spotify Web API |
| `/api/imports` | GET | Lists the authenticated user's playlist imports |
| `/api/imports` | POST | Saves Spotify playlist → persists playlist, tracks, vendor offers |
| `/api/imports/[id]` | GET | Returns full playlist with track/vendor data for review |
| `/api/imports/[id]` | PATCH | Updates import status, notes, or metadata |
| `/api/imports/[id]/selection` | GET | Retrieves saved purchase selection |
| `/api/imports/[id]/selection` | POST | Persists selected track IDs + totals for purchase flow |
| `/api/account/preferences` | GET/PUT | Manages user notification/export/vendor preferences |
| `/api/vendors` | GET | Lists available vendors with metadata |

All routes use `createRouteClient()` (Supabase helper) to read the session cookie and derive `user.id`. Unauthenticated requests return 401.

### 4.5 Backend - Data Access Layer (`db/`)

#### Schema (`db/schema.ts`)
Drizzle schema defining PostgreSQL tables:

**Core Tables:**
- `profiles` — User profiles (linked to Supabase Auth users)
- `spotify_accounts` — Spotify OAuth credentials per user
- `playlist_imports` — Imported playlists with metadata and status tracking
- `playlist_tracks` — Individual tracks in a playlist (with Spotify IDs, ISRC, etc.)
- `vendors` — Available purchase vendors (iTunes, Discogs, Bandcamp, etc.)
- `vendor_offers` — Purchase links for tracks at specific vendors
- `import_activities` — Activity log for playlist import events
- `user_preferences` — User settings (email notifications, auto-export, preferred vendors)

**Key Enums:**
- `import_status` — QUEUED, PROCESSING, READY, FAILED, ARCHIVED
- `offer_availability` — AVAILABLE, UNAVAILABLE, UNKNOWN, OUT_OF_STOCK
- `playlist_source` — SPOTIFY, APPLE_MUSIC, YOUTUBE, MANUAL_UPLOAD
- `import_event_type` — Import lifecycle events for activity tracking

#### Repositories (`db/repositories/`)

**`playlist-imports.ts`:**
- `createPlaylistImport({ userId, playlist })` — Atomic insert of playlist, tracks, and vendor offers within a transaction
- `listPlaylistImports(userId)` — Returns summary cards for dashboard
- `getPlaylistImport({ userId, importId })` — Full detail including tracks + vendor offers ordered by `orderIndex`
- `savePurchaseSelection({ userId, importId, payload })` — Persists selected tracks for purchase flow
- `getLatestPurchaseSelection({ userId, importId })` — Retrieves last saved selection
- `logImportActivity({ importId, eventType, metadata })` — Writes to `import_activities` for analytics

**`user-preferences.ts`:**
- Manages user settings (email notifications, auto-export, preferred vendors)
- Auto-creates preferences on first access

**Vendor Handling:**
- Known vendors (iTunes, Discogs, Bandcamp) have preset metadata (colors, URLs)
- Dynamic vendor insertion with conflict resolution (upsert on vendor name)

---

## 5) Data Flow

### 5.1 Playlist Import Flow

```
1. User pastes Spotify playlist URL on /import page
2. Client initiates Spotify OAuth (PKCE) if not already connected
3. OAuth callback stores access token in localStorage
4. Client calls POST /api/spotify/playlist with URL + access token
5. Server fetches playlist data from Spotify Web API
6. Server searches vendor APIs (iTunes, Discogs) for each track
7. Client receives playlist payload with tracks + vendor offers
8. Client calls POST /api/imports to persist playlist to database
9. Server atomically inserts playlist, tracks, vendor offers (transaction)
10. Client redirects to /review?importId={id}
```

### 5.2 Vendor Matching Process

For each track in the playlist:
1. **Primary match:** Search by ISRC (if available) via Apple iTunes Search API
2. **Fallback match:** Search by artist + title (fuzzy matching)
3. **Discogs search:** Query Discogs API for marketplace listings
4. Parse vendor responses and normalize to `vendor_offers` schema
5. Store availability status, price, URL, and raw payload

### 5.3 Authentication Flow

**Supabase Auth (User Accounts):**
- JWT tokens stored in httpOnly cookies
- Session managed via Supabase Auth Helpers
- All API routes validate session before processing

**Spotify OAuth (Playlist Access):**
- PKCE flow initiated via `createSpotifyAuthorizeUrl()`
- Authorization code → access token exchange in `/api/auth/token`
- Tokens stored in localStorage with expiry tracking
- Auto-refresh via `/api/auth/refresh` when token expires

### 5.4 Database Transactions

All playlist imports use Drizzle transactions to ensure atomicity:
```typescript
await db.transaction(async (tx) => {
  await tx.insert(playlistImports).values(...)
  await tx.insert(playlistTracks).values(...)
  await tx.insert(vendorOffers).values(...).onConflictDoNothing()
})
```

Timeout set to 60 seconds for large playlists.

---

## 6) Environment Variables

See `.env.example` for complete list. Key variables:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key for client-side auth
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin key (optional, for migrations)

**Spotify:**
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` — Spotify OAuth client ID
- `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` — OAuth callback URL (e.g., `http://localhost:3000/auth/callback`)
- `SPOTIFY_CLIENT_ID` — Server-side client ID (for token exchange)
- `SPOTIFY_AUTH_ENDPOINT` — Spotify authorization URL
- `SPOTIFY_TOKEN_ENDPOINT` — Spotify token exchange URL

**Vendors:**
- `NEXT_PUBLIC_ITUNES_COUNTRY` — iTunes store country code (e.g., `GB`, `US`)
- `DISCOGS_TOKEN` — Discogs API personal access token

**Database:**
- `DATABASE_URL` — Supabase PostgreSQL connection string (for Drizzle migrations)

---

## 7) Drizzle ORM Setup

### Configuration (`drizzle.config.ts`)
Points to Supabase PostgreSQL database using `DATABASE_URL` environment variable.

### Scripts
- `yarn db:generate` — Generates migration SQL from schema changes
- `yarn db:studio` — Opens Drizzle Studio for visual database exploration

### Migrations
Located in `drizzle/` directory. Applied manually to Supabase database.

---

## 8) Vendor Integration Details

### Apple iTunes Search API
- **Endpoint:** `https://itunes.apple.com/search`
- **Auth:** None (public API)
- **Rate Limits:** ~20 requests/second (self-enforced)
- **Matching:** ISRC-first, fallback to `term={artist}+{title}`
- **Response:** JSON with `collectionViewUrl` for purchase links

### Discogs API
- **Endpoint:** `https://api.discogs.com`
- **Auth:** Personal access token (header: `Authorization: Discogs token={token}`)
- **Rate Limits:** 60 requests/minute (authenticated)
- **Matching:** Search releases by artist + title
- **Response:** Marketplace listings with prices and seller URLs

### Future Vendors (Planned)
- Bandcamp (page scraping + internal search endpoints, ToS-compliant)
- Beatport, Juno, Boomkat (API integrations pending)

---

## 9) Known Limitations & Future Improvements

### Current Limitations
- No bulk cart aggregation across vendors
- Vendor matching accuracy varies (ISRC coverage ~70-80% on Spotify)
- No automatic price/availability refresh after initial import
- Manual purchase flow (user clicks through to vendor sites)

### Planned Enhancements
- **Caching:** TTL-based vendor offer caching to reduce API calls
- **Re-sync:** Background jobs to update prices and availability
- **Confidence scoring:** Surface match quality (ISRC > UPC > fuzzy text)
- **Shareable imports:** Public URLs for playlist availability matrices
- **Alerts:** Notify when unavailable tracks become available
- **CSV export:** Bulk export of vendor links for offline reference

---

## 10) Deployment Checklist

### Pre-Deployment
- [ ] Set all environment variables in Vercel/hosting platform
- [ ] Run Drizzle migrations against production Supabase database
- [ ] Seed `vendors` table with preset vendor data
- [ ] Configure Spotify OAuth redirect URLs for production domain
- [ ] Test Supabase RLS policies (if enabled)

### Post-Deployment
- [ ] Verify Supabase Auth cookie domain settings
- [ ] Test Spotify OAuth flow end-to-end
- [ ] Validate vendor API credentials and rate limits
- [ ] Monitor error logs for failed imports
- [ ] Set up analytics for import success rate and vendor match rate

---

## 11) Development Workflow

### Local Setup
1. Clone repository
2. Copy `.env.example` to `.env.local` and fill in values
3. Install dependencies: `yarn install`
4. Run Drizzle migrations: `yarn db:generate` (if schema changed)
5. Start dev server: `yarn dev`
6. Open http://localhost:3000

### Database Changes
1. Update `db/schema.ts`
2. Run `yarn db:generate` to create migration SQL
3. Apply migration to Supabase via Drizzle Studio or SQL editor
4. Update repository functions as needed
5. Update validators in `lib/validators/` to match new schema

### Adding New Vendors
1. Add vendor preset to `KNOWN_VENDORS` in `db/repositories/playlist-imports.ts`
2. Create vendor search adapter in `lib/vendors/{vendor-name}.ts`
3. Integrate search in `/api/spotify/playlist` route
4. Test matching and add to vendor offer normalization

---

## 12) Implementation Status

### ✅ Completed
- Supabase Auth integration (signup/login)
- Spotify OAuth PKCE flow
- Playlist import with database persistence
- Apple iTunes vendor integration
- Discogs vendor integration
- Dashboard with import history
- Review page with vendor offers
- User preferences management
- Activity logging for imports

### 🚧 In Progress (per Data Persistence Roadmap)
- Purchase selection persistence (API routes exist, frontend migration pending)
- Removal of localStorage for playlist data (partially completed)
- Review page migration to server-side data fetching

### 📋 Backlog
- Vendor offer re-sync endpoints
- Supabase RLS policies
- CSV/JSON export functionality
- Bandcamp integration
- Advanced search (fuzzy matching improvements)
- Shareable public import links
- Real-time vendor availability tracking

---

## 13) References

- **Data Persistence Roadmap:** `docs/data-persistence-roadmap.md` — Detailed migration plan from localStorage to Supabase
- **Product Doc:** `product-doc.md` — High-level product vision and MVP scope
- **README:** `playlist_purchase_prototype_readme.md` — Problem statement and constraints

---

**Last Updated:** 2025-10-21
**Architecture Version:** v1.0 (Supabase + Drizzle + Next.js 14)
