/**
 * Lyrics via LRCLIB (https://lrclib.net) â€” free, no API key.
 * Used by many FOSS players (similar spirit to Metrolist's lrclib module).
 */

/**
 * @param {string} artist
 * @param {string} title
 * @param {string} [album]
 * @param {number} [durationSec]
 */
export async function fetchLyrics({ artist, title, album, durationSec }) {
  const cleanArtist = (artist || '').split(',')[0].trim()
  const cleanTitle = (title || '')
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, '') // drop (Official Video) etc.
    .replace(/\s*-\s*Topic$/i, '')
    .trim()

  if (!cleanTitle) {
    return { found: false, plain: null, synced: null, source: null }
  }

  // 1) Exact-ish get
  try {
    const params = new URLSearchParams({
      artist_name: cleanArtist || 'Unknown',
      track_name: cleanTitle,
    })
    if (album) params.set('album_name', album)
    if (durationSec && durationSec > 0) {
      params.set('duration', String(Math.round(durationSec)))
    }

    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'MelocixMusic/0.2 (https://github.com/local/Melocix)' },
    })

    if (res.ok) {
      const data = await res.json()
      return normalizeLrc(data)
    }
  } catch (err) {
    console.warn('[lyrics] get failed', err?.message || err)
  }

  // 2) Search fallback
  try {
    const q = [cleanArtist, cleanTitle].filter(Boolean).join(' ')
    const res = await fetch(
      `https://lrclib.net/api/search?${new URLSearchParams({ q })}`,
      { headers: { 'User-Agent': 'MelocixMusic/0.2 (https://github.com/local/Melocix)' } },
    )
    if (!res.ok) {
      return { found: false, plain: null, synced: null, source: null }
    }
    /** @type {any[]} */
    const list = await res.json()
    if (!Array.isArray(list) || !list.length) {
      return { found: false, plain: null, synced: null, source: null }
    }

    // Prefer entry with synced lyrics and closest duration
    let best = list[0]
    if (durationSec && durationSec > 0) {
      best = [...list].sort((a, b) => {
        const da = Math.abs((a.duration || 0) - durationSec)
        const db = Math.abs((b.duration || 0) - durationSec)
        const sa = a.syncedLyrics ? 0 : 1
        const sb = b.syncedLyrics ? 0 : 1
        return sa - sb || da - db
      })[0]
    } else {
      best = list.find((x) => x.syncedLyrics) || list[0]
    }

    return normalizeLrc(best)
  } catch (err) {
    console.warn('[lyrics] search failed', err?.message || err)
    return { found: false, plain: null, synced: null, source: null }
  }
}

/**
 * @param {any} data
 */
function normalizeLrc(data) {
  if (!data) return { found: false, plain: null, synced: null, source: null }

  const plain = data.plainLyrics || null
  const syncedRaw = data.syncedLyrics || null
  const lines = syncedRaw ? parseLrc(syncedRaw) : []

  if (!plain && !lines.length) {
    return { found: false, plain: null, synced: null, source: null }
  }

  return {
    found: true,
    plain: plain || lines.map((l) => l.text).join('\n'),
    synced: lines.length ? lines : null,
    source: 'lrclib',
    meta: {
      id: data.id,
      trackName: data.trackName,
      artistName: data.artistName,
      albumName: data.albumName,
      duration: data.duration,
    },
  }
}

/**
 * Parse simple LRC lines: [mm:ss.xx]text
 * @param {string} lrc
 * @returns {{ time: number, text: string }[]}
 */
export function parseLrc(lrc) {
  const out = []
  for (const line of String(lrc).split(/\r?\n/)) {
    // support multiple timestamps per line
    const multi = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)]
    if (!multi.length) continue
    const text = line.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim()
    if (!text) continue
    for (const ts of multi) {
      const min = Number(ts[1])
      const sec = Number(ts[2])
      let frac = ts[3] || '0'
      if (frac.length === 1) frac = `${frac}00`
      if (frac.length === 2) frac = `${frac}0`
      const ms = Number(frac.padEnd(3, '0').slice(0, 3))
      const time = min * 60 + sec + ms / 1000
      out.push({ time, text })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}
