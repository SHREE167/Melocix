import express from 'express'
import cors from 'cors'
import {
  searchSongs,
  getHomeShelves,
  getStreamUrl,
  getSongDetails,
} from './youtube.mjs'
import { fetchLyrics } from './lyrics.mjs'

const PORT = Number(process.env.Melocix_API_PORT || 8787)
const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Melocix-api', phase: 2 })
})

app.get('/api/home', async (req, res) => {
  try {
    const langs = String(req.query.langs || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const shelves = await getHomeShelves(langs)
    res.json({ shelves, langs })
  } catch (err) {
    console.error('[home]', err)
    res.status(500).json({ error: err?.message || 'Failed to load home' })
  }
})

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '')
    if (!q.trim()) {
      res.json({ songs: [] })
      return
    }
    const songs = await searchSongs(q)
    res.json({ songs })
  } catch (err) {
    console.error('[search]', err)
    res.status(500).json({ error: err?.message || 'Search failed' })
  }
})

app.get('/api/song/:id', async (req, res) => {
  try {
    const song = await getSongDetails(req.params.id)
    res.json({ song })
  } catch (err) {
    console.error('[song]', err)
    res.status(500).json({ error: err?.message || 'Song lookup failed' })
  }
})

/**
 * Proxied audio stream so the browser can play without CORS/referrer issues.
 * Client should use: /api/stream/:id as the <audio> src.
 */
app.get('/api/stream/:id', async (req, res) => {
  try {
    const { url, mimeType } = await getStreamUrl(req.params.id)
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
    }
    if (req.headers.range) headers.Range = req.headers.range

    const upstream = await fetch(url, { headers })
    if (!upstream.ok && upstream.status !== 206) {
      const text = await upstream.text().catch(() => '')
      console.error('[stream] upstream', upstream.status, text.slice(0, 200))
      res.status(502).json({ error: `Upstream stream failed (${upstream.status})` })
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
    console.error('[stream]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Stream failed' })
    } else {
      res.end()
    }
  }
})

app.get('/api/stream-url/:id', async (req, res) => {
  try {
    const data = await getStreamUrl(req.params.id)
    // Prefer proxied path for browser playback
    res.json({
      proxyUrl: `/api/stream/${req.params.id}`,
      directUrl: data.url,
      mimeType: data.mimeType,
    })
  } catch (err) {
    console.error('[stream-url]', err)
    res.status(500).json({ error: err?.message || 'Stream resolve failed' })
  }
})

/**
 * Lyrics â€” LRCLIB
 * GET /api/lyrics?artist=&title=&album=&duration=
 * duration is seconds (optional)
 */
app.get('/api/lyrics', async (req, res) => {
  try {
    const artist = String(req.query.artist || '')
    const title = String(req.query.title || '')
    const album = String(req.query.album || '')
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
    console.error('[lyrics]', err)
    res.status(500).json({ error: err?.message || 'Lyrics lookup failed' })
  }
})

app.listen(PORT, () => {
  console.log(`[Melocix-api] listening on http://localhost:${PORT}`)
})
