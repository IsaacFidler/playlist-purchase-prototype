-- Row Level Security Policies for Playlist Purchase Platform
--
-- This migration adds RLS policies to ensure users can only access their own data.
-- Even if the API layer is bypassed, the database will enforce data isolation.

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all user data tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spotify_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "playlist_imports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "playlist_tracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important for admin/superuser access)
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "spotify_accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "playlist_imports" FORCE ROW LEVEL SECURITY;
ALTER TABLE "playlist_tracks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "vendor_offers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "import_activities" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;

-- Note: vendors table does NOT have RLS enabled - it's shared reference data

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON "profiles"
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON "profiles"
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_own"
  ON "profiles"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- SPOTIFY ACCOUNTS TABLE POLICIES
-- =============================================================================

-- Users can view their own Spotify account
CREATE POLICY "spotify_accounts_select_own"
  ON "spotify_accounts"
  FOR SELECT
  USING (auth.uid() = "user_id");

-- Users can insert their own Spotify account
CREATE POLICY "spotify_accounts_insert_own"
  ON "spotify_accounts"
  FOR INSERT
  WITH CHECK (auth.uid() = "user_id");

-- Users can update their own Spotify account
CREATE POLICY "spotify_accounts_update_own"
  ON "spotify_accounts"
  FOR UPDATE
  USING (auth.uid() = "user_id")
  WITH CHECK (auth.uid() = "user_id");

-- Users can delete their own Spotify account
CREATE POLICY "spotify_accounts_delete_own"
  ON "spotify_accounts"
  FOR DELETE
  USING (auth.uid() = "user_id");

-- =============================================================================
-- PLAYLIST IMPORTS TABLE POLICIES
-- =============================================================================

-- Users can view their own playlist imports
CREATE POLICY "playlist_imports_select_own"
  ON "playlist_imports"
  FOR SELECT
  USING (auth.uid() = "user_id");

-- Users can create their own playlist imports
CREATE POLICY "playlist_imports_insert_own"
  ON "playlist_imports"
  FOR INSERT
  WITH CHECK (auth.uid() = "user_id");

-- Users can update their own playlist imports
CREATE POLICY "playlist_imports_update_own"
  ON "playlist_imports"
  FOR UPDATE
  USING (auth.uid() = "user_id")
  WITH CHECK (auth.uid() = "user_id");

-- Users can delete their own playlist imports
CREATE POLICY "playlist_imports_delete_own"
  ON "playlist_imports"
  FOR DELETE
  USING (auth.uid() = "user_id");

-- =============================================================================
-- PLAYLIST TRACKS TABLE POLICIES
-- =============================================================================

-- Users can view tracks from their own playlist imports
CREATE POLICY "playlist_tracks_select_own"
  ON "playlist_tracks"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "playlist_tracks"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can insert tracks for their own playlist imports
CREATE POLICY "playlist_tracks_insert_own"
  ON "playlist_tracks"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "playlist_tracks"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can update tracks from their own playlist imports
CREATE POLICY "playlist_tracks_update_own"
  ON "playlist_tracks"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "playlist_tracks"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "playlist_tracks"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can delete tracks from their own playlist imports
CREATE POLICY "playlist_tracks_delete_own"
  ON "playlist_tracks"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "playlist_tracks"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- =============================================================================
-- VENDOR OFFERS TABLE POLICIES
-- =============================================================================

-- Users can view vendor offers for tracks in their own playlist imports
CREATE POLICY "vendor_offers_select_own"
  ON "vendor_offers"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_tracks"
      JOIN "playlist_imports" ON "playlist_imports"."id" = "playlist_tracks"."import_id"
      WHERE "playlist_tracks"."id" = "vendor_offers"."track_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can insert vendor offers for tracks in their own playlist imports
CREATE POLICY "vendor_offers_insert_own"
  ON "vendor_offers"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "playlist_tracks"
      JOIN "playlist_imports" ON "playlist_imports"."id" = "playlist_tracks"."import_id"
      WHERE "playlist_tracks"."id" = "vendor_offers"."track_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can update vendor offers for tracks in their own playlist imports
CREATE POLICY "vendor_offers_update_own"
  ON "vendor_offers"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_tracks"
      JOIN "playlist_imports" ON "playlist_imports"."id" = "playlist_tracks"."import_id"
      WHERE "playlist_tracks"."id" = "vendor_offers"."track_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "playlist_tracks"
      JOIN "playlist_imports" ON "playlist_imports"."id" = "playlist_tracks"."import_id"
      WHERE "playlist_tracks"."id" = "vendor_offers"."track_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can delete vendor offers for tracks in their own playlist imports
CREATE POLICY "vendor_offers_delete_own"
  ON "vendor_offers"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_tracks"
      JOIN "playlist_imports" ON "playlist_imports"."id" = "playlist_tracks"."import_id"
      WHERE "playlist_tracks"."id" = "vendor_offers"."track_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- =============================================================================
-- IMPORT ACTIVITIES TABLE POLICIES
-- =============================================================================

-- Users can view activities for their own playlist imports
CREATE POLICY "import_activities_select_own"
  ON "import_activities"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "import_activities"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- Users can insert activities for their own playlist imports
CREATE POLICY "import_activities_insert_own"
  ON "import_activities"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "playlist_imports"
      WHERE "playlist_imports"."id" = "import_activities"."import_id"
        AND "playlist_imports"."user_id" = auth.uid()
    )
  );

-- =============================================================================
-- USER PREFERENCES TABLE POLICIES
-- =============================================================================

-- Users can view their own preferences
CREATE POLICY "user_preferences_select_own"
  ON "user_preferences"
  FOR SELECT
  USING (auth.uid() = "user_id");

-- Users can insert their own preferences
CREATE POLICY "user_preferences_insert_own"
  ON "user_preferences"
  FOR INSERT
  WITH CHECK (auth.uid() = "user_id");

-- Users can update their own preferences
CREATE POLICY "user_preferences_update_own"
  ON "user_preferences"
  FOR UPDATE
  USING (auth.uid() = "user_id")
  WITH CHECK (auth.uid() = "user_id");

-- Users can delete their own preferences
CREATE POLICY "user_preferences_delete_own"
  ON "user_preferences"
  FOR DELETE
  USING (auth.uid() = "user_id");

-- =============================================================================
-- NOTES
-- =============================================================================

-- RLS policies are enforced at the database level, providing defense in depth:
-- 1. API routes check authentication and authorization
-- 2. Database RLS policies prevent direct data access bypass
-- 3. Service role (used by server-side code) can bypass RLS when needed
--
-- To test RLS policies:
-- 1. Create two test users
-- 2. Attempt to query another user's data using SQL
-- 3. Verify the query returns no results (due to RLS)
