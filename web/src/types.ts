export type Song = {
  id: string
  title: string
  artist: string
  album?: string
  durationMs: number
  cover: string
}

export type HomeShelf = {
  title: string
  songs: Song[]
}

export type Playlist = {
  id: string
  name: string
  songIds: string[]
  createdAt: number
  updatedAt: number
}

export type HistoryEntry = {
  song: Song
  playedAt: number
}

export type LibrarySection = 'liked' | 'history' | 'playlists' | 'offline'
