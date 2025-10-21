# Playlist Purchase Prototype - Development Roadmap

## Project Vision

**Current State (v0.1)**: Users can create accounts, import Spotify playlists, and view purchase options from Discogs (vinyl) and Apple Music/iTunes (digital). Users manually click through to vendor pages to complete purchases.

**Goal (v1.0)**: Secure, feature-complete platform with Bandcamp integration, improved purchase flow, and potential for actual audio file downloads where vendor APIs allow.

---

## Phase 0: Security & Stability 🔒

**Priority**: CRITICAL
**Timeline**: 1-2 weeks
**Status**: Not Started

### Why This Matters
Currently, API routes can be bypassed, allowing bad actors to spam the Spotify API, create unlimited imports, or access other users' data. This must be fixed before scaling.

### Tasks

#### Authentication & Authorization
- [ ] **Server-side auth middleware**
  - Add `getUser()` checks to all protected API routes
  - Return 401 for unauthenticated requests
  - Validate user owns the resource they're accessing (playlist imports, selections, etc.)
  - Routes to protect:
    - `POST /api/imports`
    - `GET/POST /api/imports/[id]`
    - `GET/POST /api/imports/[id]/selection`
    - `GET/POST /api/account/preferences`
    - `POST /api/spotify/playlist`

- [ ] **Rate limiting**
  - Implement rate limiting on Spotify API endpoints
  - Suggested limits:
    - `/api/spotify/playlist`: 10 requests per 10 minutes per user
    - `/api/imports`: 20 requests per hour per user
  - Use Redis or in-memory store (Vercel KV, Upstash)
  - Return 429 status with retry-after header

- [ ] **CSRF protection**
  - Verify Supabase handles CSRF tokens for auth endpoints
  - Add CSRF checks for state-changing operations if needed

#### Data Persistence Improvements
- [ ] **Spotify token persistence**
  - Move Spotify tokens from localStorage to database (`spotify_accounts` table)
  - Auto-refresh tokens server-side before expiry
  - Handle refresh token rotation
  - Remove client-side token management

- [ ] **Playlist & settings persistence**
  - Verify all playlists save to `playlist_imports` table ✅ (already done)
  - Verify vendor offers save to `vendor_offers` table ✅ (already done)
  - Implement user preferences (default vendor priority, currency, etc.)
  - Save import history with searchable metadata

- [ ] **Session management**
  - Verify Supabase session persistence works correctly
  - Test session refresh on page reload
  - Handle expired sessions gracefully

#### Testing & Validation
- [ ] Test auth bypass attempts on all routes
- [ ] Test rate limiting behavior
- [ ] Test Spotify token auto-refresh
- [ ] Verify user data isolation (User A cannot access User B's imports)

### Technical Notes
- Use Supabase Row Level Security (RLS) policies as additional layer
- Consider adding request logging for security audit trail
- Document security best practices for team

### Resources
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Middleware for Rate Limiting](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel KV for Rate Limiting](https://vercel.com/docs/storage/vercel-kv)

---

## Phase 1: Bandcamp Integration 🎵

**Priority**: HIGH
**Timeline**: 2-3 weeks
**Status**: Not Started

### Why This Matters
Bandcamp is the #1 requested platform for DJs/music collectors. It's the primary source for independent artists and labels. No official API, but workarounds exist.

### Research Phase
- [ ] **Evaluate bandcamp-fetch library**
  - Test search capabilities
  - Test artist/album/track lookup
  - Identify limitations (rate limits, data completeness)
  - Assess maintenance/reliability
  - Repository: https://github.com/patrickkfkan/bandcamp-fetch

- [ ] **Test undocumented autocomplete API**
  - Endpoint: `https://bandcamp.com/api/nusearch/2/autocomplete?q=<query>`
  - Document response format
  - Test rate limits (be respectful)
  - Check robots.txt compliance: `/api/` is disallowed
  - Determine if viable for production use

- [ ] **Evaluate Apify Bandcamp Crawler as backup**
  - Pricing: ~$49-99/month
  - Test free tier capabilities
  - Consider for future if self-hosted solutions fail
  - API: https://apify.com/service-paradis/bandcamp-crawler/api

- [ ] **Test oEmbed for URL validation**
  - Use oEmbed to validate user-pasted Bandcamp links
  - Fetch metadata for display
  - Endpoint pattern to research

### Implementation Phase
- [ ] **Set up Bandcamp search service**
  - Create `/lib/bandcamp/search.ts` wrapper
  - Implement search by track name + artist
  - Handle fuzzy matching (Bandcamp names may differ from Spotify)
  - Implement caching to reduce API calls (Redis/Vercel KV)
  - Add error handling for unavailable results

- [ ] **Integrate into vendor lookup flow**
  - Add Bandcamp to `/app/api/vendors/route.ts` (or create dedicated endpoint)
  - Update `/app/api/imports/route.ts` to query Bandcamp
  - Store Bandcamp offers in `vendor_offers` table
  - Update `vendors` table with Bandcamp entry

- [ ] **Update database schema**
  - Add Bandcamp to `vendors` table (if not present)
  - Ensure `vendor_offers.url` can store Bandcamp URLs
  - Add `vendor_offers.metadata` JSONB field for extra Bandcamp data (album art, artist, etc.)

- [ ] **Update review page UI**
  - Display Bandcamp results alongside iTunes/Discogs
  - Show album art, artist, price (if available)
  - Link to Bandcamp purchase page
  - Handle "name your price" / free downloads

- [ ] **Add Bandcamp to download/export**
  - Include Bandcamp links in CSV/JSON/TXT exports
  - Add Bandcamp vendor badge styling

### Edge Cases & Considerations
- [ ] Handle Bandcamp "name your price" (no fixed price)
- [ ] Handle Bandcamp free downloads
- [ ] Handle Bandcamp label/artist pages vs individual tracks
- [ ] Test with various music genres/regions
- [ ] Respect Bandcamp's robots.txt and rate limits
- [ ] Plan for API changes (undocumented endpoints can break)

### Testing
- [ ] Test search accuracy (compare Spotify track to Bandcamp results)
- [ ] Test with various playlists (electronic, rock, indie, etc.)
- [ ] Test rate limiting and error handling
- [ ] Test caching behavior

### Technical Notes
- **Risk**: Undocumented APIs can change without notice
- **Mitigation**: Use bandcamp-fetch as primary, undocumented API as fallback
- **Compliance**: Respect robots.txt, add user-agent header, rate limit aggressively
- **Future**: If Bandcamp opens official API, migrate immediately

### Resources
- [bandcamp-fetch Documentation](https://github.com/patrickkfkan/bandcamp-fetch)
- [Bandcamp Developer Page](https://bandcamp.com/developer) (currently limited to label accounts)
- [Apify Bandcamp Crawler](https://apify.com/service-paradis/bandcamp-crawler)

---

## Phase 2: Download Flow Research & UX Improvements 📦

**Priority**: MEDIUM
**Timeline**: 1-2 weeks
**Status**: Not Started

### Research: Actual Audio File Downloads

#### Goal
Investigate if we can serve actual audio files to users after purchase, or if we're limited to purchase link aggregation.

#### Vendor API Research
- [ ] **Bandcamp Download API**
  - Research: Does Bandcamp provide download APIs for purchased tracks?
  - OAuth flow: Can users authenticate and grant access to their collection?
  - Fan API: Investigate if fan collections can be accessed programmatically
  - Result: Document findings and feasibility

- [ ] **Apple Music/iTunes Downloads**
  - Research: iTunes Store API vs Apple Music API
  - Reality check: Likely no download API (DRM-protected files)
  - Result: Confirm purchase links are the only option

- [ ] **Discogs Downloads**
  - Reality check: Discogs is for physical media (vinyl/CD)
  - No digital downloads available
  - Result: Confirm purchase links only

- [ ] **Nina Protocol Downloads**
  - Research: https://dev.ninaprotocol.com/
  - Check: Can users download purchased tracks via API?
  - Blockchain: How does Solana blockchain affect access?
  - Result: Document API capabilities

#### Findings Summary
- [ ] Create document summarizing vendor download capabilities
- [ ] Identify which vendors support authenticated downloads
- [ ] Determine OAuth flows required
- [ ] Assess complexity vs. value

### UX Improvements: Purchase Link Aggregation

Even without file downloads, improve the current flow:

- [ ] **Purchase Cart Concept**
  - Design: Create a "cart" view with all selected tracks
  - Group by vendor (all Bandcamp tracks, all iTunes tracks, etc.)
  - Show total cost per vendor
  - Add "Purchase All from [Vendor]" buttons
  - Persist cart in database

- [ ] **Bulk Actions**
  - "Open all [Vendor] links" button (opens tabs for each track)
  - "Copy all [Vendor] links" to clipboard
  - Export to CSV/JSON/TXT with better formatting

- [ ] **Purchase Tracking**
  - Allow users to mark tracks as "purchased"
  - Track purchase status in database
  - Show purchase history on dashboard

- [ ] **Better Export Formats**
  - CSV: Include columns for vendor, price, purchase URL, track metadata
  - JSON: Structured format for developers/DJ software
  - TXT: Human-readable list with links
  - Add "Download for Rekordbox" format (research Rekordbox import format)

### Tasks
- [ ] Design purchase cart UI (Figma/wireframe)
- [ ] Implement cart state management
- [ ] Add bulk action buttons to review/purchase pages
- [ ] Improve export format quality
- [ ] Add purchase tracking to database schema

### Technical Notes
- Focus on improving what we have (link aggregation) while researching file downloads
- File downloads may require significant OAuth/API work (Phase 4)

---

## Phase 3: Nina Protocol Integration 🔗

**Priority**: MEDIUM
**Timeline**: 2-3 weeks
**Status**: Not Started

### Why Nina Protocol?
- Open source blockchain-based music platform
- More open developer pattern than Bandcamp
- Supports independent artists
- Potential for direct downloads via blockchain

### Research Phase
- [ ] **Explore Nina Protocol API**
  - Documentation: https://dev.ninaprotocol.com/
  - Identify search/discovery endpoints
  - Identify download/access methods
  - Understand Solana blockchain integration

- [ ] **Evaluate complexity**
  - Does it require wallet integration?
  - How are purchases handled?
  - Can we query without user authentication?
  - What's the music catalog size/coverage?

- [ ] **Test API endpoints**
  - Search for tracks by name/artist
  - Fetch track metadata
  - Test download access (if available)
  - Document response formats

### Implementation Phase
- [ ] **Create Nina Protocol service**
  - `/lib/nina/search.ts` wrapper
  - Implement search by track name + artist
  - Handle blockchain-specific data formats

- [ ] **Integrate into vendor lookup**
  - Add to vendor search flow
  - Store results in `vendor_offers` table
  - Add Nina Protocol to `vendors` table

- [ ] **Update UI**
  - Add Nina Protocol badges/styling
  - Display blockchain metadata (if relevant)
  - Link to Nina Protocol purchase page

- [ ] **Handle blockchain complexity**
  - Research: Do users need Solana wallets?
  - If yes: Add wallet connection flow (future phase)
  - If no: Treat like standard vendor

### Tasks
- [ ] API research and testing
- [ ] Integration implementation
- [ ] UI updates
- [ ] Documentation

### Technical Notes
- Blockchain platforms may have learning curve
- Consider if wallet integration is worth the complexity
- Evaluate actual music catalog vs effort required

### Resources
- [Nina Protocol Developer Docs](https://dev.ninaprotocol.com/)
- [Nina Protocol Website](https://www.ninaprotocol.com/)

---

## Phase 4: Advanced Download Features (Future) 🚀

**Priority**: LOW/FUTURE
**Timeline**: TBD
**Status**: Backlog

### Potential Features
- [ ] **Bandcamp OAuth for authenticated downloads**
  - Allow users to connect Bandcamp account
  - Access their purchased collection
  - Download tracks they already own

- [ ] **Nina Protocol direct downloads**
  - Implement wallet connection (if required)
  - Download blockchain-hosted music

- [ ] **Purchase automation**
  - Research: Can we automate purchases via APIs?
  - Likely requires complex OAuth + payment integrations
  - May violate vendor ToS

- [ ] **Download queue system**
  - Queue downloads for processing
  - Send email when ready
  - Store temporarily or link to vendor downloads

- [ ] **DJ workflow integrations**
  - Export to Rekordbox/Serato formats
  - Folder structure templates
  - Metadata tagging automation

### Notes
These features are **highly speculative** and depend on:
- Vendor API availability
- Legal/ToS compliance
- User demand
- Development resources

---

## Deferred Features ⏸️

Features discussed but deprioritized:

### Download Organization Tool
- **Idea**: Allow users to upload audio files and organize into DJ folder structures
- **Decision**: SKIP - DJs likely use Rekordbox/Serato or local file managers anyway
- **Alternative**: Provide folder structure templates in export formats instead

---

## Technical Debt & Maintenance 🔧

Ongoing tasks to keep the codebase healthy:

- [ ] Set up automated testing (Jest, Playwright)
- [ ] Add error monitoring (Sentry, LogRocket)
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Set up staging environment
- [ ] Add performance monitoring
- [ ] Regular dependency updates
- [ ] Security audits

---

## Resources & References 📚

### APIs & Tools
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)
- [Discogs API](https://www.discogs.com/developers)
- [bandcamp-fetch](https://github.com/patrickkfkan/bandcamp-fetch)
- [Apify Bandcamp Crawler](https://apify.com/service-paradis/bandcamp-crawler)
- [Nina Protocol Dev Docs](https://dev.ninaprotocol.com/)

### Stack Documentation
- [Next.js 14 App Router](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [React 19](https://react.dev/)

---

## How to Use This Roadmap

1. **Check off tasks** as you complete them (GitHub Markdown supports `- [x]` for checked boxes)
2. **Update status** for each phase (Not Started → In Progress → Completed)
3. **Add notes** in the "Technical Notes" sections as you discover new information
4. **Adjust priorities** as user feedback comes in
5. **Keep it up to date** - review weekly during team sync

---

**Last Updated**: 2025-10-21
**Version**: 1.0
