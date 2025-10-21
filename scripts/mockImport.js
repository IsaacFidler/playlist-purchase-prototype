const postgres = require('postgres')
const crypto = require('crypto')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL missing')
}

const sql = postgres(connectionString, { ssl: 'require', max: 1, prepare: false })

async function run() {
  const playlistId = crypto.randomUUID()
  const userId = '44411360-b4fd-4d38-b9ee-c1754edf97e2'
  const tracks = Array.from({ length: 4 }).map((_, index) => ({
    id: crypto.randomUUID(),
    importId: playlistId,
    orderIndex: index,
    name: `Mock Track ${index + 1}`,
    artists: 'Mock Artist',
    album: 'Mock Album',
    spotifyTrackId: `mock-${index + 1}`,
    spotifyTrackUrl: `https://example.com/mock-${index + 1}`,
    isrc: null,
    discNumber: 1,
    trackNumber: null,
    durationMs: 200000 + index * 1000,
    explicit: false,
    previewUrl: null,
    artworkUrl: null,
    popularity: null,
  }))

  const offers = tracks.flatMap((track) => (
    [
      {
        id: crypto.randomUUID(),
        trackId: track.id,
        vendorId: 'itunes',
        title: track.name,
        subtitle: track.artists,
        externalId: null,
        externalUrl: `https://itunes.example/${track.id}`,
        currencyCode: 'GBP',
        priceValue: 1.29,
        availability: 'AVAILABLE',
        isPreview: false,
        countryCode: null,
        releaseDate: null,
        rawPayload: { vendor: 'Apple iTunes' },
      },
    ]
  ))

  const start = Date.now()
  await sql.begin(async (tx) => {
    await tx`set local statement_timeout = 60000`
    await tx`
      insert into playlist_imports (id, user_id, source, source_playlist_id, source_url, name, description, status, total_tracks, matched_tracks, available_offers)
      values (${playlistId}, ${userId}, 'SPOTIFY', 'mock', 'https://example.com/mock', 'Mock Playlist', 'Test', 'READY', ${tracks.length}, ${tracks.length}, ${offers.length})
    `
    await tx`
      insert into playlist_tracks (id, import_id, order_index, name, artists, album, spotify_track_id, spotify_track_url, isrc, disc_number, track_number, duration_ms, explicit, preview_url, artwork_url, popularity)
      values ${sql(tracks.map((track) => [
        track.id,
        track.importId,
        track.orderIndex,
        track.name,
        track.artists,
        track.album,
        track.spotifyTrackId,
        track.spotifyTrackUrl,
        track.isrc,
        track.discNumber,
        track.trackNumber,
        track.durationMs,
        track.explicit,
        track.previewUrl,
        track.artworkUrl,
        track.popularity,
      ]))}
    `
    await tx`
      insert into vendor_offers (id, track_id, vendor_id, title, subtitle, external_id, external_url, currency_code, price_value, availability, is_preview, country_code, release_date, raw_payload)
      values ${sql(offers.map((offer) => [
        offer.id,
        offer.trackId,
        offer.vendorId,
        offer.title,
        offer.subtitle,
        offer.externalId,
        offer.externalUrl,
        offer.currencyCode,
        offer.priceValue,
        offer.availability,
        offer.isPreview,
        offer.countryCode,
        offer.releaseDate,
        offer.rawPayload,
      ]))}
      on conflict (track_id, vendor_id) do nothing
    `
  })
  console.log("Mock import inserted in", Date.now() - start, "ms")
  await sql.end({ timeout: 5 })
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
