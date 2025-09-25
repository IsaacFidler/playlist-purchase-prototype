const DISCOGS_API_BASE = "https://api.discogs.com"
const DISCOGS_USER_AGENT =
  process.env.DISCOGS_USER_AGENT ?? "PlaylistPurchasePrototype/1.0 (+https://playlist-purchase-prototype.vercel.app)"

type DiscogsSearchParams = {
  trackName: string
  artistName?: string
  albumName?: string | null
}

type DiscogsMatch = {
  marketplaceUrl: string
  lowestPrice?: number
  currency?: string
  numForSale?: number
  bandcampUrl?: string
  videoUrls?: string[]
}

type DiscogsSearchResponse = {
  results: DiscogsSearchResult[]
}

type DiscogsSearchResult = {
  id: number
  title: string
  type: string
  format?: string[]
  country?: string
  year?: string
  resource_url: string
  uri: string
  catno?: string
  master_id?: number
  score?: number
}

type DiscogsRelease = {
  id: number
  uri: string
  lowest_price?: number
  num_for_sale?: number
  formats?: Array<{ name: string }>
  videos?: Array<{ uri: string }>
}

type DiscogsMaster = {
  urls?: string[]
  videos?: Array<{ uri: string }>
}

const CACHE = new Map<string, DiscogsMatch | null>()

export async function findDiscogsOffer(params: DiscogsSearchParams) {
  const token = process.env.DISCOGS_TOKEN
  if (!token) return null

  const cacheKey = buildCacheKey(params)
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey) ?? null
  }

  try {
    const result = await searchDiscogs(params, token)
    if (!result) {
      CACHE.set(cacheKey, null)
      return null
    }

    const release = await fetchRelease(result.resource_url, token)
    if (!release) {
      CACHE.set(cacheKey, null)
      return null
    }

    const master = result.master_id ? await fetchMaster(result.master_id, token) : null

    const bandcampUrl = master?.urls?.find((url) => url.toLowerCase().includes("bandcamp.com"))
    const videoUrls = gatherVideoUrls(release, master)

    const match: DiscogsMatch = {
      marketplaceUrl: release.uri,
      lowestPrice: release.lowest_price,
      currency: release.lowest_price ? "GBP" : undefined,
      numForSale: release.num_for_sale,
      bandcampUrl,
      videoUrls,
    }

    CACHE.set(cacheKey, match)
    return match
  } catch (error) {
    console.warn("Failed to fetch Discogs data", error)
    CACHE.set(cacheKey, null)
    return null
  }
}

function gatherVideoUrls(release: DiscogsRelease, master: DiscogsMaster | null) {
  const urls = new Set<string>()
  release.videos?.forEach((video) => video.uri && urls.add(video.uri))
  master?.videos?.forEach((video) => video.uri && urls.add(video.uri))
  return Array.from(urls)
}

async function searchDiscogs(params: DiscogsSearchParams, token: string) {
  const { trackName, artistName, albumName } = params
  const url = new URL(`${DISCOGS_API_BASE}/database/search`)
  url.searchParams.set("type", "release")
  url.searchParams.set("per_page", "5")
  url.searchParams.set("token", token)

  const termParts = [trackName, artistName, albumName].filter(Boolean)
  if (termParts.length) {
    url.searchParams.set("q", termParts.join(" "))
  }
  if (artistName) {
    url.searchParams.set("artist", artistName)
  }
  if (trackName) {
    url.searchParams.set("track", trackName)
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": DISCOGS_USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) return null

  const data = (await response.json()) as DiscogsSearchResponse
  if (!data.results?.length) return null

  const normalizedTrack = normalizeTerm(trackName)
  const normalizedArtist = normalizeTerm((artistName ?? "").split(",")[0])

  const bestMatch = data.results.find((result) => {
    if (result.type !== "release") return false
    const normalizedTitle = normalizeTerm(result.title)
    return normalizedTitle.includes(normalizedTrack) && (!normalizedArtist || normalizedTitle.includes(normalizedArtist))
  }) ?? data.results[0]

  return bestMatch
}

async function fetchRelease(resourceUrl: string, token: string) {
  const url = new URL(resourceUrl)
  url.searchParams.set("token", token)
  url.searchParams.set("currency", "GBP")

  const response = await fetch(url, {
    headers: {
      "User-Agent": DISCOGS_USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) return null
  return (await response.json()) as DiscogsRelease
}

async function fetchMaster(masterId: number, token: string) {
  const url = new URL(`${DISCOGS_API_BASE}/masters/${masterId}`)
  url.searchParams.set("token", token)
  url.searchParams.set("currency", "GBP")

  const response = await fetch(url, {
    headers: {
      "User-Agent": DISCOGS_USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) return null
  return (await response.json()) as DiscogsMaster
}

function buildCacheKey({ trackName, artistName, albumName }: DiscogsSearchParams) {
  return [trackName, artistName ?? "", albumName ?? ""].map(normalizeTerm).join("|")
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase()
}

export function formatDiscogsPrice(match: DiscogsMatch) {
  if (!match.lowestPrice) return undefined

  const currency = match.currency ?? "GBP"

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(match.lowestPrice)
  } catch {
    return `${match.lowestPrice} ${currency}`
  }
}
