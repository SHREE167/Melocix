import type { HomeShelf, Song } from './types'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const data = await getJson<{ ok: boolean }>('/api/health')
    return !!data.ok
  } catch {
    return false
  }
}

export async function fetchHome(languageIds?: string[]): Promise<HomeShelf[]> {
  const params = new URLSearchParams()
  if (languageIds?.length) params.set('langs', languageIds.join(','))
  const qs = params.toString()
  const data = await getJson<{ shelves: HomeShelf[] }>(`/api/home${qs ? `?${qs}` : ''}`)
  return data.shelves || []
}

export async function fetchSearch(query: string): Promise<Song[]> {
  const q = encodeURIComponent(query.trim())
  if (!q) return []
  const data = await getJson<{ songs: Song[] }>(`/api/search?q=${q}`)
  return data.songs || []
}

/** Browser-playable proxied stream URL */
export function streamUrl(songId: string): string {
  return `/api/stream/${encodeURIComponent(songId)}`
}

export type SyncedLine = { time: number; text: string }

export type LyricsResult = {
  found: boolean
  plain: string | null
  synced: SyncedLine[] | null
  source: string | null
  meta?: {
    id?: number
    trackName?: string
    artistName?: string
    albumName?: string
    duration?: number
  }
}

export async function fetchLyrics(opts: {
  artist: string
  title: string
  album?: string
  durationSec?: number
}): Promise<LyricsResult> {
  const params = new URLSearchParams({
    artist: opts.artist || '',
    title: opts.title || '',
  })
  if (opts.album) params.set('album', opts.album)
  if (opts.durationSec && opts.durationSec > 0) {
    params.set('duration', String(Math.round(opts.durationSec)))
  }
  return getJson<LyricsResult>(`/api/lyrics?${params}`)
}
