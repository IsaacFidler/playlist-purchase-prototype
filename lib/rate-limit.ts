/**
 * Simple in-memory rate limiter using sliding window algorithm
 *
 * Note: This resets on deployment/server restart. For production at scale,
 * consider using Redis (Vercel KV, Upstash) for persistent rate limiting.
 */

interface RateLimitConfig {
  /**
   * Unique identifier for the rate limit bucket (e.g., endpoint name)
   */
  id: string
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number
  /**
   * Time window in milliseconds
   */
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store: Map<bucketId, Map<userId, RateLimitEntry>>
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>()

/**
 * Check if a user has exceeded the rate limit for a specific endpoint
 *
 * @param userId - Unique user identifier
 * @param config - Rate limit configuration
 * @returns Object with success status and remaining count
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const now = Date.now()

  // Get or create bucket for this rate limit ID
  if (!rateLimitStore.has(config.id)) {
    rateLimitStore.set(config.id, new Map())
  }

  const bucket = rateLimitStore.get(config.id)!

  // Get or create entry for this user
  let entry = bucket.get(userId)

  // If no entry or window expired, reset
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    bucket.set(userId, entry)
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    }
  }

  // Increment count
  entry.count++
  bucket.set(userId, entry)

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Clean up expired entries (run periodically to prevent memory leaks)
 */
export function cleanupExpiredEntries() {
  const now = Date.now()

  for (const [bucketId, bucket] of rateLimitStore.entries()) {
    for (const [userId, entry] of bucket.entries()) {
      if (now >= entry.resetTime) {
        bucket.delete(userId)
      }
    }

    // Remove empty buckets
    if (bucket.size === 0) {
      rateLimitStore.delete(bucketId)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}

/**
 * Preset rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  SPOTIFY_PLAYLIST: {
    id: 'spotify-playlist',
    limit: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  IMPORT_CREATE: {
    id: 'import-create',
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  IMPORT_LIST: {
    id: 'import-list',
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  SELECTION_SAVE: {
    id: 'selection-save',
    limit: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const

/**
 * Helper to create rate limit response headers
 */
export function createRateLimitHeaders(result: {
  remaining: number
  resetTime: number
  retryAfter?: number
}) {
  const headers = new Headers()
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.resetTime.toString())

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return headers
}
