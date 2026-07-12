import type { HistoryEntry, Playlist, Song } from './types'

const KEY = 'melocix-library-v1'
const MAX_HISTORY = 100

type LibraryData = {
  songs: Record<string, Song>
  likedIds: string[]
  history: HistoryEntry[]
  playlists: Playlist[]
}

function empty(): LibraryData {
  return { songs: {}, likedIds: [], history: [], playlists: [] }
}

function load(): LibraryData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const data = JSON.parse(raw) as LibraryData
    return {
      songs: data.songs || {},
      likedIds: data.likedIds || [],
      history: data.history || [],
      playlists: data.playlists || [],
    }
  } catch {
    return empty()
  }
}

function save(data: LibraryData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

let state = load()
const listeners = new Set<() => void>()

function notify() {
  save(state)
  listeners.forEach((fn) => fn())
}

export const library = {
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  rememberSong(song: Song) {
    state.songs[song.id] = song
    notify()
  },

  getSong(id: string): Song | undefined {
    return state.songs[id]
  },

  isLiked(id: string): boolean {
    return state.likedIds.includes(id)
  },

  toggleLike(song: Song): boolean {
    state.songs[song.id] = song
    const i = state.likedIds.indexOf(song.id)
    if (i >= 0) {
      state.likedIds.splice(i, 1)
      notify()
      return false
    }
    state.likedIds.unshift(song.id)
    notify()
    return true
  },

  likedSongs(): Song[] {
    return state.likedIds.map((id) => state.songs[id]).filter(Boolean)
  },

  addHistory(song: Song) {
    state.songs[song.id] = song
    state.history = [
      { song, playedAt: Date.now() },
      ...state.history.filter((h) => h.song.id !== song.id),
    ].slice(0, MAX_HISTORY)
    notify()
  },

  history(): HistoryEntry[] {
    return state.history
  },

  clearHistory() {
    state.history = []
    notify()
  },

  playlists(): Playlist[] {
    return [...state.playlists].sort((a, b) => b.updatedAt - a.updatedAt)
  },

  getPlaylist(id: string): Playlist | undefined {
    return state.playlists.find((p) => p.id === id)
  },

  playlistSongs(id: string): Song[] {
    const p = this.getPlaylist(id)
    if (!p) return []
    return p.songIds.map((sid) => state.songs[sid]).filter(Boolean)
  },

  createPlaylist(name: string): Playlist {
    const pl: Playlist = {
      id: `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'My playlist',
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    state.playlists.unshift(pl)
    notify()
    return pl
  },

  renamePlaylist(id: string, name: string) {
    const p = state.playlists.find((x) => x.id === id)
    if (!p) return
    p.name = name.trim() || p.name
    p.updatedAt = Date.now()
    notify()
  },

  deletePlaylist(id: string) {
    state.playlists = state.playlists.filter((p) => p.id !== id)
    notify()
  },

  addToPlaylist(playlistId: string, song: Song) {
    const p = state.playlists.find((x) => x.id === playlistId)
    if (!p) return
    state.songs[song.id] = song
    if (!p.songIds.includes(song.id)) {
      p.songIds.push(song.id)
      p.updatedAt = Date.now()
      notify()
    }
  },

  removeFromPlaylist(playlistId: string, songId: string) {
    const p = state.playlists.find((x) => x.id === playlistId)
    if (!p) return
    p.songIds = p.songIds.filter((id) => id !== songId)
    p.updatedAt = Date.now()
    notify()
  },

  stats() {
    return {
      liked: state.likedIds.length,
      history: state.history.length,
      playlists: state.playlists.length,
      catalog: Object.keys(state.songs).length,
    }
  },
}
