import type { Song } from './types'

const DB_NAME = 'melocix-offline'
const DB_VERSION = 1
const STORE = 'tracks'
const MAX_TRACKS = 40
/** Hard cap per track to avoid tab OOM (bytes) */
const MAX_TRACK_BYTES = 40 * 1024 * 1024

type OfflineRecord = {
  id: string
  song: Song
  blob: Blob
  savedAt: number
  size: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

const listeners = new Set<() => void>()
let cache: Map<string, Song> | null = null
const blobUrls = new Map<string, string>()

function notify() {
  listeners.forEach((fn) => fn())
}

async function refreshIndex() {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readonly')
  const store = tx.objectStore(STORE)
  const req = store.getAll()
  const rows = await new Promise<OfflineRecord[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as OfflineRecord[]) || [])
    req.onerror = () => reject(req.error)
  })
  cache = new Map(rows.map((r) => [r.id, r.song]))
  return rows
}

export const offline = {
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  async isSaved(id: string): Promise<boolean> {
    if (!cache) await refreshIndex()
    return cache!.has(id)
  },

  isSavedSync(id: string): boolean {
    return cache?.has(id) ?? false
  },

  async list(): Promise<Song[]> {
    const rows = await refreshIndex()
    return rows.sort((a, b) => b.savedAt - a.savedAt).map((r) => r.song)
  },

  async getBlobUrl(id: string): Promise<string | null> {
    if (blobUrls.has(id)) return blobUrls.get(id)!
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    const row = await new Promise<OfflineRecord | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as OfflineRecord | undefined)
      req.onerror = () => reject(req.error)
    })
    if (!row?.blob) return null
    const url = URL.createObjectURL(row.blob)
    blobUrls.set(id, url)
    return url
  },

  /**
   * Download stream via our proxy and store for offline.
   * Caps size to MAX_TRACK_BYTES to avoid OOM.
   */
  async save(song: Song, onProgress?: (pct: number) => void): Promise<void> {
    const res = await fetch(`/api/stream/${encodeURIComponent(song.id)}`)
    if (!res.ok) throw new Error(`Download failed (${res.status})`)

    const headerLen = Number(res.headers.get('content-length') || 0)
    if (headerLen > MAX_TRACK_BYTES) {
      throw new Error('Track too large for offline save (max 40 MB)')
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        if (received > MAX_TRACK_BYTES) {
          try {
            reader.cancel()
          } catch {
            /* ignore */
          }
          throw new Error('Track too large for offline save (max 40 MB)')
        }
        chunks.push(value)
        if (headerLen && onProgress) {
          onProgress(Math.min(99, Math.round((received / headerLen) * 100)))
        } else if (onProgress) {
          // indeterminate-ish progress when length unknown
          onProgress(Math.min(95, Math.round((received / (8 * 1024 * 1024)) * 100)))
        }
      }
    }
    onProgress?.(100)

    const mime = res.headers.get('content-type') || 'audio/webm'
    const blob = new Blob(chunks as BlobPart[], { type: mime })

    const db = await openDb()
    const existing = await refreshIndex()
    if (existing.length >= MAX_TRACKS && !existing.find((r) => r.id === song.id)) {
      const oldest = [...existing].sort((a, b) => a.savedAt - b.savedAt)[0]
      if (oldest) {
        const delTx = db.transaction(STORE, 'readwrite')
        delTx.objectStore(STORE).delete(oldest.id)
        await txDone(delTx)
        const oldUrl = blobUrls.get(oldest.id)
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl)
          blobUrls.delete(oldest.id)
        }
      }
    }

    const record: OfflineRecord = {
      id: song.id,
      song,
      blob,
      savedAt: Date.now(),
      size: blob.size,
    }
    const putTx = db.transaction(STORE, 'readwrite')
    putTx.objectStore(STORE).put(record)
    await txDone(putTx)
    cache?.set(song.id, song)
    const old = blobUrls.get(song.id)
    if (old) URL.revokeObjectURL(old)
    blobUrls.set(song.id, URL.createObjectURL(blob))
    notify()
  },

  async remove(id: string): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await txDone(tx)
    cache?.delete(id)
    const url = blobUrls.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      blobUrls.delete(id)
    }
    notify()
  },

  async totalBytes(): Promise<number> {
    const rows = await refreshIndex()
    return rows.reduce((sum, r) => sum + (r.size || 0), 0)
  },
}

void refreshIndex().catch(() => {
  /* ignore */
})
