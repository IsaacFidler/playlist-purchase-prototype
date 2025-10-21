# Product Brief: Playlist Purchase Prototype

## Overview

Playlist Purchase Prototype (working title **Gabe’s Crates**) is a web application that helps DJs and music fans transform their streaming playlists into properly purchased and organised music libraries.

The app enables a user to paste a playlist link (starting with Spotify) and receive an ordered list of tracks with direct purchase links from multiple vendors (e.g. Apple iTunes, Bandcamp). Future iterations will support bulk purchases and automatic file organisation into playlist-named folders, streamlining the workflow for DJs and collectors.

---

## Problem Statement

Music curation often happens on streaming services, but professional use (e.g. DJing) requires legally purchased, downloadable tracks. The current process is painful:

- Manually searching for each track on vendor sites.
- Purchasing tracks individually.
- Organising files into folders that match curated playlists.

This results in wasted time and poor workflow for DJs and collectors who want a clean bridge between their curated streaming playlists and their owned music library.

---

## Target Users

- **DJs** who curate sets on Spotify but need purchased, lossless tracks to perform.
- **Music collectors** who want to own and organise curated music beyond streaming.
- **Playlisters** who maintain themed playlists and want to “own” their curation in a structured library.

---

## Value Proposition

- **Time savings**: Instantly map playlists to purchase links instead of searching manually.
- **Organisation**: Keep purchased tracks structured by playlist.
- **Legality**: Encourage and facilitate legal purchasing of tracks.
- **Future opportunity**: Integrate with vendor APIs for affiliate revenue and deeper purchasing automation.

---

## MVP Scope

**In scope**

- User can sign up / log in.
- Paste a Spotify playlist link.
- System extracts tracks and normalises metadata (ISRC preferred).
- Display an ordered list of tracks with purchase links (start with Apple iTunes API).
- Minimal UI with landing page, login, dashboard, playlist import, review screen, and account page.

**Out of scope**

- Automated purchases.
- Bulk download of purchased files.
- File system reorganisation into playlist-named folders.
- Advanced vendor integrations (Beatport, Bandcamp, Juno).

---

## Key Features (MVP)

1. **Playlist ingestion**

   - Input: Spotify playlist URL.
   - Output: Track list with metadata (track, artist, ISRC).

2. **Vendor search**

   - Search vendor APIs for purchase links (Apple iTunes first).
   - Show price, URL, and availability.

3. **Review & export**

   - Table view of tracks with vendor links.
   - Options to export as CSV or open all links in browser.

4. **Accounts**
   - User signup/login (Supabase Auth with real sessions).
   - Dashboard with recent playlists and import history.
   - Account page for basic profile management and preferences.

---

## User Flow

1. **Landing Page** → Learn what the app does → CTA to sign up / log in.
2. **Login / Signup** → Create an account (Supabase Auth).
3. **Dashboard** → View imported playlists and option to import a new playlist.
4. **Import Playlist** → Paste Spotify URL (connects to Spotify via OAuth if needed).
5. **Review Playlist** → See normalized track list with vendor purchase links and availability.
6. **Export / Open Links** → User clicks through to vendor sites to purchase tracks.
7. **Account** → View profile, log out, manage preferences (email notifications, auto-export, preferred vendors).

---

## Success Metrics

- **Functional validation**: ≥80% of tracks from a given playlist return at least one vendor purchase link.
- **User adoption**: DJs and curators can successfully run their playlist through the tool end-to-end.
- **Engagement**: Number of playlists imported per user during prototype testing.
- **Conversion potential** (future): Track affiliate link clicks to measure commercial viability.

---

## Future Opportunities

- Bulk purchasing integrations with vendors (if APIs allow).
- Automated file organisation into playlist-named folders.
- Multi-vendor support (Beatport, Bandcamp, Juno).
- Smart matching (fuzzy search, version/mix disambiguation).
- Affiliate partnerships to monetise the workflow.

---

## Risks & Assumptions

- **APIs**: Limited vendor APIs may constrain bulk purchasing features.
- **Licensing**: Must respect vendor ToS; no downloading without explicit purchase.
- **Matching**: Track metadata differences (mix versions, remixes) could reduce accuracy.
- **Adoption**: DJs may already use workarounds; value proposition must be clear.

---

## Implementation Status

### ✅ Completed
1. **Spotify Developer App**: Registered and implemented PKCE OAuth flow.
2. **Vendor Adapters**: Integrated Apple iTunes Search API and Discogs API.
3. **UI**: Built landing, login, signup, dashboard, import, review, and account pages.
4. **Database**: Supabase PostgreSQL with Drizzle ORM for data persistence.
5. **Real Data**: Playlist imports persist to database with tracks and vendor offers.

### 🚧 In Progress
1. **Review Page**: Migrating to server-side data fetching (currently partially localStorage-based).
2. **Purchase Selection**: Frontend migration to use API routes for selection persistence.
3. **Export**: CSV/JSON export functionality.

### 📋 Next Steps
1. Complete data persistence migration (remove remaining localStorage usage).
2. Add Supabase RLS policies for database security.
3. Implement vendor offer re-sync functionality.
4. Expand vendor integrations (Bandcamp, Beatport, Juno).
5. Validate with DJs/curators and iterate based on feedback.
