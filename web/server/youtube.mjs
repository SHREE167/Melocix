import { spawn } from 'node:child_process'
import { Innertube, UniversalCache, Log } from 'youtubei.js'

Log.setLevel(Log.Level.ERROR)

/** @type {import('youtubei.js').Innertube | null} */
let client = null

async function getClient() {
  if (client) return client
  client = await Innertube.create({
    cache: new UniversalCache(false),
    generate_session_locally: true,
  })
  return client
}

/**
 * @param {any} item
 */
function mapMusicItem(item) {
  try {
    const id = item?.id || item?.video_id || null
    if (!id) return null

    const title =
      (typeof item?.title === 'string' ? item.title : item?.title?.text) ||
      item?.name ||
      'Unknown title'

    let artists = 'Unknown artist'
    if (Array.isArray(item?.artists) && item.artists.length) {
      artists = item.artists.map((a) => a?.name || a?.text || '').filter(Boolean).join(', ')
    } else if (item?.author?.name) {
      artists = item.author.name
    } else if (typeof item?.author === 'string') {
      artists = item.author
    }

    const album =
      item?.album?.name ||
      (typeof item?.album === 'string' ? item.album : undefined) ||
      undefined

    let durationMs = 0
    if (typeof item?.duration?.seconds === 'number') {
      durationMs = item.duration.seconds * 1000
    } else if (typeof item?.duration === 'number') {
      durationMs = item.duration * 1000
    } else if (typeof item?.duration?.text === 'string' && item.duration.text.includes(':')) {
      const parts = item.duration.text.split(':').map(Number)
      if (parts.length === 2) durationMs = (parts[0] * 60 + parts[1]) * 1000
      if (parts.length === 3) durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
    }

    const thumbs = item?.thumbnail?.contents || item?.thumbnails || []
    const thumbList = Array.isArray(thumbs) ? thumbs : []
    const cover =
      thumbList
        .map((t) => t?.url)
        .filter((u) => typeof u === 'string')
        .sort((a, b) => (b?.length || 0) - (a?.length || 0))[0] ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

    return {
      id: String(id),
      title: String(title),
      artist: String(artists || 'Unknown artist'),
      album: album ? String(album) : undefined,
      durationMs,
      cover: String(cover),
    }
  } catch {
    return null
  }
}

/**
 * @param {string} query
 */
export async function searchSongs(query) {
  const yt = await getClient()
  const q = query.trim()
  if (!q) return []

  try {
    const res = await yt.music.search(q, { type: 'song' })
    /** @type {any[]} */
    const songs = []
    for (const shelf of res?.contents || []) {
      const items = shelf?.contents || []
      for (const item of items) {
        const mapped = mapMusicItem(item)
        if (mapped) songs.push(mapped)
      }
    }
    if (songs.length) {
      const seen = new Set()
      return songs.filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
    }
  } catch (err) {
    console.warn('[Melocix] music.search failed', err?.message || err)
  }

  const res = await yt.search(q, { type: 'video' })
  const songs = []
  for (const item of res?.results || []) {
    const mapped = mapMusicItem({
      id: item?.id,
      title: item?.title?.text || item?.title,
      authors: item?.author ? [{ name: item.author.name || item.author }] : undefined,
      author: item?.author?.name || item?.author,
      duration: item?.duration,
      thumbnails: item?.thumbnails,
    })
    if (mapped) songs.push(mapped)
  }
  return songs.slice(0, 30)
}

/** Language id → home recommendation seeds */
const LANG_HOME = {
  en: { name: 'English', seeds: ['top english pop songs', 'english hits official audio'] },
  hi: { name: 'Hindi', seeds: ['bollywood hits songs', 'hindi songs official'] },
  ta: { name: 'Tamil', seeds: ['tamil hits songs', 'kollywood songs official'] },
  te: { name: 'Telugu', seeds: ['telugu hits songs', 'tollywood songs official'] },
  ml: { name: 'Malayalam', seeds: ['malayalam hits songs', 'latest malayalam songs'] },
  kn: { name: 'Kannada', seeds: ['kannada hits songs', 'latest kannada songs'] },
  pa: { name: 'Punjabi', seeds: ['punjabi hits songs', 'latest punjabi songs'] },
  bn: { name: 'Bengali', seeds: ['bengali hits songs', 'bangla songs official'] },
  es: { name: 'Spanish', seeds: ['latin hits spanish songs', 'reggaeton hits'] },
  ko: { name: 'Korean', seeds: ['kpop hits songs', 'korean songs official'] },
  ja: { name: 'Japanese', seeds: ['jpop hits songs', 'japanese songs official'] },
  ar: { name: 'Arabic', seeds: ['arabic hits songs', 'arabic pop songs'] },
  fr: { name: 'French', seeds: ['french pop hits', 'chansons françaises'] },
  pt: { name: 'Portuguese', seeds: ['brazilian funk hits', 'mpb hits brasil'] },
  de: { name: 'German', seeds: ['german pop hits', 'deutsche lieder hits'] },
  it: { name: 'Italian', seeds: ['italian pop hits', 'canzoni italiane'] },
  tr: { name: 'Turkish', seeds: ['turkish pop hits', 'türkçe şarkılar'] },
  zh: { name: 'Chinese', seeds: ['c-pop hits', 'mandarin songs popular'] },
}

/**
 * @param {string[]} [langIds]
 */
export async function getHomeShelves(langIds = []) {
  /** @type {{ title: string, songs: any[] }[]} */
  const shelves = []
  const langs = (langIds || []).map((x) => String(x).trim()).filter((id) => LANG_HOME[id])

  // Personalized shelves from user music languages
  if (langs.length) {
    for (const id of langs.slice(0, 5)) {
      const cfg = LANG_HOME[id]
      const q = cfg.seeds[0]
      try {
        const songs = await searchSongs(q)
        if (songs.length) {
          shelves.push({
            title: `For you · ${cfg.name}`,
            songs: songs.slice(0, 12),
          })
        }
        // Second shelf per language if only 1–2 langs selected
        if (langs.length <= 2 && cfg.seeds[1]) {
          const more = await searchSongs(cfg.seeds[1])
          if (more.length) {
            shelves.push({
              title: `More ${cfg.name}`,
              songs: more.slice(0, 12),
            })
          }
        }
      } catch (err) {
        console.warn('[Melocix] lang shelf failed', id, err?.message || err)
      }
    }
    // Mixed discovery shelf
    if (langs.length >= 2) {
      try {
        const mixQ = langs
          .slice(0, 3)
          .map((id) => LANG_HOME[id].name)
          .join(' ')
        const mix = await searchSongs(`${mixQ} hits playlist songs`)
        if (mix.length) {
          shelves.push({ title: 'Mixed for you', songs: mix.slice(0, 12) })
        }
      } catch {
        /* ignore */
      }
    }
    if (shelves.length) return shelves
  }

  // Default: YT Music home feed
  try {
    const yt = await getClient()
    const home = await yt.music.getHomeFeed()
    const sections = home?.sections || home?.contents || []
    for (const section of sections.slice(0, 8)) {
      const title =
        section?.header?.title?.text ||
        section?.title?.text ||
        section?.title ||
        'For you'
      const items = section?.contents || section?.items || []
      const songs = []
      for (const item of items) {
        const mapped = mapMusicItem(item)
        if (mapped) songs.push(mapped)
      }
      if (songs.length) shelves.push({ title: String(title), songs: songs.slice(0, 12) })
    }
  } catch (err) {
    console.warn('[Melocix] getHomeFeed failed', err?.message || err)
  }

  if (!shelves.length) {
    const seeds = [
      { title: 'Trending now', q: 'top hits official audio' },
      { title: 'Chill', q: 'chill lo-fi beats' },
      { title: 'Energy', q: 'upbeat pop songs official' },
    ]
    for (const seed of seeds) {
      try {
        const songs = await searchSongs(seed.q)
        if (songs.length) shelves.push({ title: seed.title, songs: songs.slice(0, 10) })
      } catch {
        /* ignore */
      }
    }
  }

  return shelves
}

/**
 * Run yt-dlp and return stdout lines.
 * @param {string[]} args
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const bin = process.env.YT_DLP_PATH || 'yt-dlp'
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', (e) => {
      reject(new Error(`yt-dlp not found or failed to start: ${e.message}`))
    })
    child.on('close', (code) => {
      // yt-dlp often exits non-zero when warnings print to stderr but still returns URLs
      const lines = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith('http'))
      if (lines.length) {
        resolve(lines)
        return
      }
      reject(new Error(err.trim() || `yt-dlp exited with code ${code}`))
    })
  })
}

/**
 * Resolve a direct audio stream URL for a video id.
 * Primary: yt-dlp (reliable with JS runtime). Fallback: youtubei.js.
 * @param {string} videoId
 */
export async function getStreamUrl(videoId) {
  // Hard validate before spawning yt-dlp or calling YouTube
  if (typeof videoId !== 'string' || !/^[\w-]{6,20}$/.test(videoId)) {
    throw new Error('Invalid video id')
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const nodePath = process.execPath

  // Prefer yt-dlp with Node as JS runtime
  try {
    const lines = await runYtDlp([
      '--js-runtimes',
      `node:${nodePath}`,
      '-f',
      'ba/bestaudio[ext=m4a]/bestaudio/best',
      '-g',
      '--no-playlist',
      '--no-warnings',
      '--',
      watchUrl,
    ])
    const url = lines[0]
    if (url) {
      return {
        url,
        mimeType: url.includes('mime=audio%2Fmp4') || url.includes('itag=140')
          ? 'audio/mp4'
          : 'audio/webm',
      }
    }
  } catch (err) {
    console.warn('[Melocix] yt-dlp failed, trying youtubei', err?.message || err)
  }

  // Fallback: youtubei (often missing URLs without poToken — try anyway)
  try {
    const yt = await getClient()
    const info = await yt.getBasicInfo(videoId)
    const format =
      info.chooseFormat({ type: 'audio', quality: 'best' }) ||
      info.streaming_data?.adaptive_formats?.find((f) => f.has_audio && !f.has_video)

    if (format) {
      let url = format.url
      if (!url && typeof format.decipher === 'function') {
        url = await format.decipher(yt.session.player)
      }
      if (url && typeof url === 'string') {
        return { url, mimeType: format.mime_type || 'audio/mp4' }
      }
    }
  } catch (err) {
    console.warn('[Melocix] youtubei stream failed', err?.message || err)
  }

  throw new Error(
    'Could not resolve stream. Install yt-dlp on PATH (https://github.com/yt-dlp/yt-dlp), restart Melocix, or try another track.',
  )
}

/**
 * @param {string} videoId
 */
export async function getSongDetails(videoId) {
  try {
    const yt = await getClient()
    const info = await yt.getBasicInfo(videoId)
    const b = info.basic_info
    return {
      id: videoId,
      title: b?.title || 'Unknown',
      artist: b?.author || 'Unknown',
      album: undefined,
      durationMs: (b?.duration || 0) * 1000,
      cover:
        b?.thumbnail?.[0]?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  } catch {
    return {
      id: videoId,
      title: videoId,
      artist: 'Unknown',
      durationMs: 0,
      cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  }
}
