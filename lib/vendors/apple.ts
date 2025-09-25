const ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
const ITUNES_COUNTRY = process.env.NEXT_PUBLIC_ITUNES_COUNTRY ?? "GB"

type ITunesSearchParams = {
  trackName: string
  artistName?: string
  isrc?: string | null
}

type ITunesMatch = {
  url: string
  price?: number
  currency?: string
}

type ITunesApiResponse = {
  resultCount: number
  results: ITunesApiResult[]
}

type ITunesApiResult = {
  trackId?: number
  trackName?: string
  artistName?: string
  collectionName?: string
  trackPrice?: number
  collectionPrice?: number
  currency?: string
  trackViewUrl?: string
  collectionViewUrl?: string
  isrc?: string
}

const CACHE = new Map<string, ITunesMatch | null>()

export async function findITunesOffer(params: ITunesSearchParams) {
  const cacheKey = buildCacheKey(params)
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey) ?? null
  }

  try {
    const match = (await searchByIsrc(params)) ?? (await searchByMetadata(params))
    CACHE.set(cacheKey, match ?? null)
    return match ?? null
  } catch (error) {
    console.warn("Failed to resolve iTunes offer", error)
    CACHE.set(cacheKey, null)
    return null
  }
}

async function searchByIsrc({ isrc }: ITunesSearchParams) {
  if (!isrc) return null

  const url = new URL(ITUNES_SEARCH_URL)
  url.searchParams.set("term", isrc)
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "1")
  url.searchParams.set("country", ITUNES_COUNTRY)

  const response = await fetch(url, { next: { revalidate: 60 * 60 } })
  if (!response.ok) return null

  const data = (await response.json()) as ITunesApiResponse
  if (!data.resultCount || !data.results.length) return null

  return normalizeResult(data.results[0])
}

async function searchByMetadata({ trackName, artistName }: ITunesSearchParams) {
  const term = [trackName, artistName].filter(Boolean).join(" ")
  if (!term) return null

  const url = new URL(ITUNES_SEARCH_URL)
  url.searchParams.set("term", term)
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "5")
  url.searchParams.set("country", ITUNES_COUNTRY)

  const response = await fetch(url, { next: { revalidate: 60 * 60 } })
  if (!response.ok) return null

  const data = (await response.json()) as ITunesApiResponse
  if (!data.resultCount || !data.results.length) return null

  const normalizedTrack = normalizeTerm(trackName)
  const normalizedArtist = normalizeTerm((artistName ?? "").split(",")[0])

  const bestMatch = data.results.find((result) => {
    const resultTrack = normalizeTerm(result.trackName ?? "")
    const resultArtist = normalizeTerm(result.artistName ?? "")
    return resultTrack.includes(normalizedTrack) && (!normalizedArtist || resultArtist.includes(normalizedArtist))
  }) ?? data.results[0]

  return normalizeResult(bestMatch)
}

function normalizeResult(result: ITunesApiResult): ITunesMatch | null {
  const url = result.trackViewUrl ?? result.collectionViewUrl
  if (!url) return null

  const price = result.trackPrice ?? result.collectionPrice
  const currency = result.currency

  return {
    url,
    price,
    currency,
  }
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ")
}

function buildCacheKey({ trackName, artistName, isrc }: ITunesSearchParams) {
  return [isrc ?? "", trackName, artistName ?? ""].map((value) => value?.toLowerCase().trim()).join("|")
}

export function formatITunesPrice(match: ITunesMatch) {
  if (!match.price || !match.currency) return undefined

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: match.currency,
    }).format(match.price)
  } catch {
    return `${match.price} ${match.currency}`
  }
}
