import express from 'express'
import cors from 'cors'
import {
  searchSongs,
  getHomeShelves,
  getStreamUrl,
  getSongDetails,
} from './youtube.mjs'
import { fetchLyrics } from './lyrics.mjs'
import { createRateLimiter, isValidVideoId, localCorsOrigin } from './security.mjs'

const PORT = Number(process.env.MELOCIX_API_PORT || process.env.PORT || 8787)
const HOST = process.env.MELOCIX_API_HOST || '127.0.0.1'

const app = express()
app.set('trust proxy', false)

app.use(
  cors({
    origin: localCorsOrigin,
    credentials: false,
  }),
)
app.use(express.json({ limit: '32kb' }))

const limitGeneral = createRateLimiter({ windowMs: 60_000, max: 90 })
const limitStream = createRateLimiter({ windowMs: 60_000, max: 30 })
const limitSearch = createRateLimiter({ windowMs: 60_000, max: 40 })

app.use('/api', limitGeneral)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'melocix-api', phase: 'bugfix-ii' })
})

app.get('/api/home', async (req, res) => {
  try {
    const langs = String(req.query.langs || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
    const shelves = await getHomeShelves(langs)
    res.json({ shelves, langs })
  } catch (err) {
    console.error('[home]', err)
    res.status(500).json({ error: 'Failed to load home' })
  }
})

app.get('/api/search', limitSearch, async (req, res) => {
  try {
    const q = String(req.query.q || '').slice(0, 200)
    if (!q.trim()) {
      res.json({ songs: [] })
      return
    }
    const songs = await searchSongs(q)
    res.json({ songs })
  } catch (err) {
    console.error('[search]', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

app.get('/api/song/:id', async (req, res) => {
  try {
    if (!isValidVideoId(req.params.id)) {
      res.status(400).json({ error: 'Invalid video id' })
      return
    }
    const song = await getSongDetails(req.params.id)
    res.json({ song })
  } catch (err) {
    console.error('[song]', err)
    res.status(500).json({ error: 'Song lookup failed' })
  }
})

/**
 * Proxied audio stream (browser-safe).
 * Video id is validated before yt-dlp / upstream fetch.
 */
app.get('/api/stream/:id', limitStream, async (req, res) => {
  try {
    if (!isValidVideoId(req.params.id)) {
      res.status(400).json({ error: 'Invalid video id' })
      return
    }

    const { url, mimeType } = await getStreamUrl(req.params.id)
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
    }
    if (req.headers.range) headers.Range = req.headers.range

    const upstream = await fetch(url, { headers })
    if (!upstream.ok && upstream.status !== 206) {
      console.error('[stream] upstream', upstream.status)
      res.status(502).json({ error: 'Upstream stream failed' })
      return
    }

    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || mimeType || 'audio/mp4')
    res.setHeader('Accept-Ranges', 'bytes')
    const len = upstream.headers.get('content-length')
    if (len) res.setHeader('Content-Length', len)
    const cr = upstream.headers.get('content-range')
    if (cr) res.setHeader('Content-Range', cr)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (!upstream.body) {
      res.end()
      return
    }

    const reader = upstream.body.getReader()
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!res.write(Buffer.from(value))) {
          await new Promise((resolve) => res.once('drain', resolve))
        }
      }
      res.end()
    }
    req.on('close', () => {
      try {
        reader.cancel()
      } catch {
        /* ignore */
      }
    })
    await pump()
  } catch (err) {
    console.error('[stream]', err?.message || err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' })
    } else {
      res.end()
    }
  }
})

/**
 * Only returns the app-relative proxy path — never raw CDN URLs.
 */
app.get('/api/stream-url/:id', limitStream, async (req, res) => {
  try {
    if (!isValidVideoId(req.params.id)) {
      res.status(400).json({ error: 'Invalid video id' })
      return
    }
    // Ensure stream is resolvable (without exposing URL)
    await getStreamUrl(req.params.id)
    res.json({
      proxyUrl: `/api/stream/${encodeURIComponent(req.params.id)}`,
    })
  } catch (err) {
    console.error('[stream-url]', err?.message || err)
    res.status(500).json({ error: 'Stream resolve failed' })
  }
})

app.get('/api/lyrics', async (req, res) => {
  try {
    const artist = String(req.query.artist || '').slice(0, 200)
    const title = String(req.query.title || '').slice(0, 200)
    const album = String(req.query.album || '').slice(0, 200)
    const duration = Number(req.query.duration || 0)
    if (!title.trim()) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    const lyrics = await fetchLyrics({
      artist,
      title,
      album: album || undefined,
      durationSec: duration > 0 ? duration : undefined,
    })
    res.json(lyrics)
  } catch (err) {
    console.error('[lyrics]', err?.message || err)
    res.status(500).json({ error: 'Lyrics lookup failed' })
  }
})

app.listen(PORT, HOST, () => {
  console.log(`[melocix-api] listening on http://${HOST}:${PORT}`)
})
