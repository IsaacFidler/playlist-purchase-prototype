/**
 * Server-side Spotify Token Management
 *
 * This module handles secure Spotify OAuth token storage and refresh.
 * Tokens are stored in the database (spotify_accounts table) instead of
 * localStorage, providing better security and automatic refresh capability.
 */

import { db } from "@/db/client"
import { spotifyAccounts } from "@/db/schema"
import { eq } from "drizzle-orm"

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before actual expiry

interface SpotifyTokenData {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string
  tokenType: string
}

/**
 * Get Spotify access token for a user, refreshing if necessary
 *
 * @param userId - User ID from Supabase auth
 * @returns Valid access token or null if no account linked
 */
export async function getSpotifyToken(userId: string): Promise<string | null> {
  try {
    const account = await db.query.spotifyAccounts.findFirst({
      where: eq(spotifyAccounts.userId, userId),
    })

    if (!account) {
      console.warn(`[spotify-auth] No Spotify account found for user ${userId}`)
      return null
    }

    // Check if token is expired or about to expire
    const now = new Date()
    const expiresAt = account.expiresAt ? new Date(account.expiresAt) : new Date(0)
    const isExpired = expiresAt.getTime() - now.getTime() < TOKEN_EXPIRY_BUFFER_MS

    if (!isExpired) {
      return account.accessToken
    }

    // Token is expired/expiring - refresh it
    if (!account.refreshToken) {
      console.error(`[spotify-auth] No refresh token for user ${userId}`)
      return null
    }

    console.info(`[spotify-auth] Refreshing Spotify token for user ${userId}`)
    const refreshed = await refreshSpotifyToken(userId, account.refreshToken)

    if (!refreshed) {
      return null
    }

    return refreshed.accessToken
  } catch (error) {
    console.error(`[spotify-auth] Error getting Spotify token:`, error)
    return null
  }
}

/**
 * Save Spotify OAuth tokens to database
 *
 * @param userId - User ID from Supabase auth
 * @param data - Token data from Spotify OAuth flow
 */
export async function saveSpotifyToken(
  userId: string,
  data: SpotifyTokenData
): Promise<void> {
  try {
    await db
      .insert(spotifyAccounts)
      .values({
        id: `spotify_${userId}`,
        userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiresAt: data.expiresAt,
        scope: data.scope,
        tokenType: data.tokenType,
        lastSyncedAt: new Date(),
        lastError: null,
      })
      .onConflictDoUpdate({
        target: spotifyAccounts.id,
        set: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? null,
          expiresAt: data.expiresAt,
          scope: data.scope,
          tokenType: data.tokenType,
          lastSyncedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      })

    console.info(`[spotify-auth] Saved Spotify tokens for user ${userId}`)
  } catch (error) {
    console.error(`[spotify-auth] Error saving Spotify tokens:`, error)
    throw error
  }
}

/**
 * Refresh Spotify access token using refresh token
 *
 * @param userId - User ID from Supabase auth
 * @param refreshToken - Refresh token from Spotify
 * @returns New token data or null if refresh failed
 */
async function refreshSpotifyToken(
  userId: string,
  refreshToken: string
): Promise<SpotifyTokenData | null> {
  try {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error(`[spotify-auth] Missing Spotify credentials`)
      return null
    }

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[spotify-auth] Token refresh failed:`, errorText)

      // Update account with error
      await db
        .update(spotifyAccounts)
        .set({
          lastError: `Token refresh failed: ${response.statusText}`,
          updatedAt: new Date(),
        })
        .where(eq(spotifyAccounts.userId, userId))

      return null
    }

    const data = await response.json()

    const tokenData: SpotifyTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken, // Spotify may return new refresh token
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      scope: data.scope ?? "",
      tokenType: data.token_type ?? "Bearer",
    }

    // Save refreshed tokens
    await saveSpotifyToken(userId, tokenData)

    return tokenData
  } catch (error) {
    console.error(`[spotify-auth] Error refreshing token:`, error)

    // Update account with error
    await db
      .update(spotifyAccounts)
      .set({
        lastError: error instanceof Error ? error.message : "Token refresh error",
        updatedAt: new Date(),
      })
      .where(eq(spotifyAccounts.userId, userId))

    return null
  }
}

/**
 * Delete Spotify account linkage for a user
 *
 * @param userId - User ID from Supabase auth
 */
export async function deleteSpotifyAccount(userId: string): Promise<void> {
  try {
    await db.delete(spotifyAccounts).where(eq(spotifyAccounts.userId, userId))
    console.info(`[spotify-auth] Deleted Spotify account for user ${userId}`)
  } catch (error) {
    console.error(`[spotify-auth] Error deleting Spotify account:`, error)
    throw error
  }
}

/**
 * Check if user has a Spotify account linked
 *
 * @param userId - User ID from Supabase auth
 * @returns True if account is linked
 */
export async function hasSpotifyAccount(userId: string): Promise<boolean> {
  try {
    const account = await db.query.spotifyAccounts.findFirst({
      where: eq(spotifyAccounts.userId, userId),
    })
    return !!account
  } catch (error) {
    console.error(`[spotify-auth] Error checking Spotify account:`, error)
    return false
  }
}
