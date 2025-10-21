# Playlist Purchase Prototype

A prototype exploring **paste-a-playlist ➜ find where to buy ➜ click through to purchase** — without acting as a reseller or payment proxy.

> Status as of 2025‑10‑21 (Europe/London)

---

## 1) Problem & Product Idea
Listeners build and share playlists on streaming platforms, but **artists earn when fans actually buy**. This prototype helps a listener:

1. **Paste a Spotify playlist URL**
2. We parse it into track metadata (artist, title, album, ISRC where available)
3. We **search vendors/catalogs** (currently Apple iTunes Search API and Discogs API) to check availability
4. We present **buy/download links**, sending the user to the vendor to complete purchase

We **do not** proxy the purchase, resell tracks, or process licensed audio. Users complete purchases on the vendor's site.

---

## 2) Constraints & What We Learned
- **No proxy purchasing**: We cannot buy on behalf of users, nor aggregate carts across vendors.
- **No reselling**: We cannot buy and re‑sell files (licensing & ToS constraints).
- **Feasible flow**: Converting a Spotify playlist into a cross‑store **availability lookup** is working.
- **User expectation**: People still want a *single checkout*. Our v0 must clearly communicate that checkout happens off‑platform per vendor.

---

## 3) Current Architecture (v0)
- **Frontend**: Next.js 14 app with React 19 (TypeScript)
- **Backend**: Supabase (auth + Postgres) with Drizzle ORM
- **Integrations**:
  - **Spotify**: Parse playlist → tracks (via playlist URL with PKCE OAuth flow)
  - **Apple Music API**: Search catalog by ISRC/artist+title, return product/album links
  - **Discogs API**: Search for releases/tracks; return marketplace product pages
- **UX**: Results list per track with **vendor availability** + **"Go to store"** buttons
- **No purchasing** in‑app; no audio ingestion

High‑level flow:
```
Spotify URL → Fetch playlist → Normalize tracks → Fan‑out search (Apple, Discogs, …) →
Aggregate matches → Show links (per track) → User clicks through to buy
```

---

## 4) Data Model
- **profiles**: User profiles (linked to Supabase Auth)
- **playlist_imports**: { id, user_id, source: "SPOTIFY", source_url, name, description, status, total_tracks, matched_tracks, available_offers, created_at }
- **playlist_tracks**: { id, import_id, order_index, name, artists, album, isrc?, spotify_track_id?, duration_ms, artwork_url, created_at }
- **vendor_offers**: { id, track_id, vendor_id, external_url, price_value, currency_code, availability, last_checked_at }
- **vendors**: { id, display_name, website_url, primary_color }
- **import_activities**: Activity log for playlist import lifecycle events
- **user_preferences**: User settings (email notifications, auto-export, preferred vendors)

> Supabase PostgreSQL tables managed via Drizzle ORM. See `db/schema.ts` for complete schema definition.

---

## 5) Dev Setup
- Next.js 14 app with Supabase client and Drizzle ORM
- Environment variables (see `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase project credentials)
  - `DATABASE_URL` (Supabase PostgreSQL connection string for Drizzle)
  - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_ID` (Spotify OAuth)
  - `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` (OAuth callback URL)
  - `SPOTIFY_AUTH_ENDPOINT`, `SPOTIFY_TOKEN_ENDPOINT` (Spotify auth URLs)
  - `NEXT_PUBLIC_ITUNES_COUNTRY` (iTunes store country code, e.g., GB or US)
  - `DISCOGS_TOKEN` (Discogs API personal access token)

> **All vendor calls are server‑side** via Next.js API routes to protect secrets and avoid CORS. Rate limiting & retry/backoff implemented where appropriate.

---

## 6) UX Notes
- Accept a Spotify URL → show playlist summary (artwork, count)
- For each track: show **match chips**: Apple iTunes ✓, Discogs ✓, (future: Bandcamp, Juno, Boomkat)
- Each chip → outbound link to the vendor product/track/album page
- Bulk views: "Show vendors per track", "Show tracks available at Vendor X", "Missing tracks" bucket
- Clear copy: "Purchases complete on the vendor site."

---

## 7) Roadmap & Options
### Short‑term
- [ ] Confirm **Disco vs Discogs** integration and normalize search adapters
- [ ] Add **ISRC‑first** search; fall back to fuzzy title/artist matching with heuristics
- [ ] Per‑track **confidence score** + UI surfacing (e.g., ✅ High, ⚠️ Medium, ❓ Low)
- [ ] Basic caching of availability lookups (per track/vendor, TTL)
- [ ] Outbound link **UTM tagging** for analytics

### Medium‑term
- [ ] **More stores**: Bandcamp (manual paste + page scrape or internal endpoints where ToS‑safe), Juno, Beatport, Boomkat
- [ ] **Cart handoff** deep‑links where vendors support it (some don’t; document per‑vendor capabilities)
- [ ] **Price & format surfacing** (MP3/WAV/FLAC) when available via APIs
- [ ] **Shareable result pages** (public link to the availability matrix)
- [ ] **Saved imports** and re‑check availability later (track releases/stock changes)

### Longer‑term (if viable)
- [ ] **Alerts**: notify when a missing track becomes available at a preferred vendor
- [ ] **Bundles**: export CSV of vendor links to speed manual checkout
- [ ] **Creator tools**: label/artist mode to attach official buy links to their own playlists

---

## 8) Legal & ToS Considerations
- Do not simulate carts or purchases; **no payment proxying**
- Follow each vendor’s **API Terms** and **rate limits**
- If scraping public pages (e.g., for metadata), confirm ToS and implement robots/ethics guidelines
- Respect user privacy; store minimum necessary data

---

## 9) Analytics & Success Metrics
- Import success rate (playlist → resolved tracks)
- Match rate per vendor (ISRC vs fuzzy)
- Click‑through rate to vendors
- Time‑to‑first‑purchase (proxy via affiliate/UTM where permitted)
- User‑reported accuracy (was the link correct?)

---

## 10) Open Questions
1. ✅ **~~Disco vs Discogs~~**: **RESOLVED** — Using Discogs API with personal access token (60 req/min rate limit)
2. ✅ **~~Apple Music~~**: **RESOLVED** — Using public iTunes Search API (no auth required, ~20 req/sec self-enforced limit)
3. **ISRC coverage** from Spotify imports — do we fetch track audio features/IDs to improve matching?
4. ✅ **~~Caching~~**: **RESOLVED** — Vendor offers persisted to `vendor_offers` table with `last_checked_at` timestamp. TTL-based re-sync is planned.
5. **Affiliate linking**: Any programs we can/should use without violating vendor ToS?
6. **Bandcamp**: Are we exploring manual paste + metadata scrape or any internal search endpoints in a ToS‑compliant way?

---

## 11) Inspiration & Prior Art
- **Buy Music Club** — community‑curated Bandcamp lists; links out for purchase
- Price comparison UIs in other verticals (Skyscanner‑style availability matrix) for interaction patterns

---

## 12) Glossary
- **Availability**: A vendor has a purchasable track/album that matches the playlist item
- **Confidence**: Heuristic score that our match is the same track (ISRC > UPC > fuzzy text)

---

## 13) License / Purpose
Internal R&D prototype. Not affiliated with or endorsed by Spotify, Apple, Disco/Discogs, or any vendor. Purchases are completed on vendor sites.

