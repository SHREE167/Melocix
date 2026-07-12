import type { Song } from './types'
import { streamUrl } from './api'
import { library } from './library'
import { offline } from './offline'

type Listener = () => void

class Player {
  private audio = new Audio()
  private song: Song | null = null
  private queue: Song[] = []
  private index = -1
  private listeners = new Set<Listener>()
  private loading = false
  private error: string | null = null
  private shuffle = false
  private repeat: 'off' | 'all' | 'one' = 'off'

  constructor() {
    this.audio.preload = 'metadata'
    this.audio.addEventListener('timeupdate', () => this.emit())
    this.audio.addEventListener('play', () => this.emit())
    this.audio.addEventListener('pause', () => this.emit())
    this.audio.addEventListener('ended', () => {
      void this.onEnded()
    })
    this.audio.addEventListener('error', () => {
      this.error = 'Playback failed — try another track or offline copy'
      this.loading = false
      this.emit()
    })
    this.audio.addEventListener('waiting', () => {
      this.loading = true
      this.emit()
    })
    this.audio.addEventListener('canplay', () => {
      this.loading = false
      this.emit()
    })
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  get current(): Song | null {
    return this.song
  }

  get queueList(): Song[] {
    return this.queue
  }

  get queueIndex(): number {
    return this.index
  }

  get isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended
  }

  get isLoading(): boolean {
    return this.loading
  }

  get lastError(): string | null {
    return this.error
  }

  get progress(): number {
    const d = this.audio.duration
    if (!d || Number.isNaN(d)) return 0
    return this.audio.currentTime / d
  }

  get currentTime(): number {
    return this.audio.currentTime || 0
  }

  get duration(): number {
    return this.audio.duration || (this.song?.durationMs || 0) / 1000
  }

  get hasNext(): boolean {
    if (this.repeat === 'all' && this.queue.length > 1) return true
    return this.index >= 0 && this.index < this.queue.length - 1
  }

  get hasPrev(): boolean {
    return this.index > 0 || this.currentTime > 3
  }

  get shuffleOn(): boolean {
    return this.shuffle
  }

  get repeatMode(): 'off' | 'all' | 'one' {
    return this.repeat
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle
    this.emit()
  }

  cycleRepeat() {
    this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off'
    this.emit()
  }

  async play(song: Song, queue?: Song[]) {
    this.error = null
    if (queue) {
      this.queue = [...queue]
      this.index = Math.max(
        0,
        this.queue.findIndex((s) => s.id === song.id),
      )
      if (this.index < 0) {
        this.queue.unshift(song)
        this.index = 0
      }
    } else {
      const existing = this.queue.findIndex((s) => s.id === song.id)
      if (existing >= 0) {
        this.index = existing
      } else {
        this.queue = [song]
        this.index = 0
      }
    }
    await this.loadAndPlay(this.queue[this.index])
  }

  private async resolveSrc(song: Song): Promise<string> {
    // Prefer offline blob when available
    try {
      const blobUrl = await offline.getBlobUrl(song.id)
      if (blobUrl) return blobUrl
    } catch {
      /* fall through */
    }
    return streamUrl(song.id)
  }

  private async loadAndPlay(song: Song) {
    this.song = song
    this.loading = true
    this.error = null
    library.rememberSong(song)
    library.addHistory(song)
    this.emit()

    try {
      const src = await this.resolveSrc(song)
      this.audio.src = src
      await this.audio.play()
      this.loading = false
      this.error = null
    } catch (err) {
      console.warn('Playback blocked or failed', err)
      this.loading = false
      this.error = err instanceof Error ? err.message : 'Could not start playback'
    }
    this.emit()
  }

  async toggle() {
    if (!this.song) return
    if (this.audio.paused) {
      try {
        await this.audio.play()
        this.error = null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Play failed'
      }
    } else {
      this.audio.pause()
    }
    this.emit()
  }

  private async onEnded() {
    if (this.repeat === 'one' && this.song) {
      this.audio.currentTime = 0
      await this.audio.play().catch(() => undefined)
      this.emit()
      return
    }
    await this.next()
  }

  async next() {
    if (!this.queue.length) return

    if (this.shuffle && this.queue.length > 1) {
      let next = this.index
      while (next === this.index) {
        next = Math.floor(Math.random() * this.queue.length)
      }
      this.index = next
      await this.loadAndPlay(this.queue[this.index])
      return
    }

    if (this.index < this.queue.length - 1) {
      this.index += 1
      await this.loadAndPlay(this.queue[this.index])
      return
    }

    if (this.repeat === 'all') {
      this.index = 0
      await this.loadAndPlay(this.queue[this.index])
      return
    }

    this.audio.pause()
    this.emit()
  }

  async prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0
      this.emit()
      return
    }
    if (this.index > 0) {
      this.index -= 1
      await this.loadAndPlay(this.queue[this.index])
      return
    }
    this.audio.currentTime = 0
    this.emit()
  }

  seek(ratio: number) {
    const d = this.audio.duration
    if (!d || Number.isNaN(d)) return
    this.audio.currentTime = Math.min(Math.max(ratio, 0), 1) * d
    this.emit()
  }
}

export const player = new Player()
