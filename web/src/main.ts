import './style.css'
import {
  fetchHealth,
  fetchHome,
  fetchLyrics,
  fetchSearch,
  type LyricsResult,
} from './api'
import { extractPalette } from './colors'
import { library } from './library'
import { offline } from './offline'
import { player } from './player'
import {
  PLAYER_SKINS,
  loadPlayerSkin,
  savePlayerSkin,
  type PlayerSkinId,
} from './playerSkins'
import {
  MAX_LANGS,
  MIN_LANGS,
  MUSIC_LANGUAGES,
  completeOnboarding,
  isOnboardingDone,
  languagesLabel,
  loadMusicLanguages,
  saveMusicLanguages,
} from './onboarding'
import {
  playBootAnimation,
  playHeartBurst,
  playLangGridEnter,
  playOnboardEnter,
  playShellEnter,
} from './animations'
import type { HomeShelf, LibrarySection, Song } from './types'
import { SYM, icon, playPauseIcon } from './uiSymbols'

type Tab = 'home' | 'search' | 'library' | 'you'
type Theme = 'dark' | 'light' | 'black'
type OnboardingStep = 'welcome' | 'languages'

const THEME_KEY = 'melocix-theme'

let onboardingActive = !isOnboardingDone()
let onboardingStep: OnboardingStep = 'welcome'
let selectedLangs: string[] = loadMusicLanguages()
/** When true, language picker is shown from You settings (not first-run) */
let editingLanguages = false

let tab: Tab = 'home'
let searchQuery = ''
let searchResults: Song[] = []
let searchLoading = false
let searchError: string | null = null
let searchTimer: number | undefined

let homeShelves: HomeShelf[] = []
let homeLoading = true
let homeError: string | null = null
let apiOnline = true

let theme: Theme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
let playerSkin: PlayerSkinId = loadPlayerSkin()
let librarySection: LibrarySection = 'liked'
let openPlaylistId: string | null = null
let playerExpanded = false
let playerSheetTab: 'lyrics' | 'queue' | 'more' = 'lyrics'
let playlistPickerOpen = false
let offlineSavingId: string | null = null
let offlineSavePct = 0
let offlineIds = new Set<string>()
let accent = { primary: '#6d28d9', secondary: '#22d3ee', text: '#f4f4f8' }

/** Lyrics state for current track */
let lyricsSongId: string | null = null
let lyricsLoading = false
let lyricsError: string | null = null
let lyricsData: LyricsResult | null = null
let lyricsShowPanel = true
let lastSyncedIndex = -1
let lyricsGen = 0

const app = document.querySelector<HTMLDivElement>('#app')!

function applyTheme() {
  document.body.classList.remove('theme-light', 'theme-black', 'theme-dark')
  const mode = theme === 'light' ? 'light' : theme === 'black' ? 'black' : 'dark'
  if (mode === 'light') document.body.classList.add('theme-light')
  else if (mode === 'black') document.body.classList.add('theme-black')
  else document.body.classList.add('theme-dark')
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem(THEME_KEY, theme)
  document.body.dataset.playerSkin = playerSkin
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Safe CSS url() for cover art (blocks quotes / parentheses breakout) */
function cssCoverUrl(url: string): string {
  const cleaned = (url || '').replace(/[\n\r"'()\\]/g, '')
  if (!cleaned) return ''
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('data:image/')) return ''
  return cleaned
}

/** Safe remote image src for <img> */
function safeImgSrc(url: string): string {
  return cssCoverUrl(url)
}

function formatTime(sec: number): string {
  if (!sec || Number.isNaN(sec) || !Number.isFinite(sec)) return '0:00'
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function emptyState(title: string, message: string): string {
  return `
    <div class="empty">
      <div class="empty-icon">${icon('signal', 28)}</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `
}

function spinner(label = 'Loading' + SYM.ellipsis): string {
  return `
    <div class="center-state">
      <div class="spinner" aria-hidden="true"></div>
      <p>${escapeHtml(label)}</p>
    </div>
  `
}

function errorState(message: string, retryAttr: string): string {
  return `
    <div class="center-state">
      <p class="error-text">${escapeHtml(message)}</p>
      <button type="button" class="btn" data-retry="${retryAttr}">Retry</button>
    </div>
  `
}

function songActions(song: Song): string {
  const liked = library.isLiked(song.id)
  const saved = offlineIds.has(song.id)
  const saving = offlineSavingId === song.id
  return `
    <div class="row-actions" data-stop>
      <button type="button" class="icon-btn ${liked ? 'on' : ''}" data-like="${escapeHtml(song.id)}" title="Like">
        ${liked ? SYM.heart : SYM.heartEmpty}
      </button>
      <button type="button" class="icon-btn" data-add-pl="${escapeHtml(song.id)}" title="Add to playlist">${SYM.plus}</button>
      <button type="button" class="icon-btn ${saved ? 'on' : ''}" data-offline="${escapeHtml(song.id)}" title="${saved ? 'Remove offline' : 'Save offline'}">
        ${saving ? `${offlineSavePct}%` : saved ? SYM.down + SYM.check : SYM.down}
      </button>
    </div>
  `
}

function songCard(song: Song): string {
  return `
    <button class="song-card glass" type="button" data-play="${escapeHtml(song.id)}">
      <div class="card-art-wrap">
        <img src="${safeImgSrc(song.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        ${library.isLiked(song.id) ? '<span class="card-heart">' + SYM.heart + '</span>' : ''}
        ${offlineIds.has(song.id) ? '<span class="card-dl">' + SYM.down + '</span>' : ''}
      </div>
      <div class="title">${escapeHtml(song.title)}</div>
      <div class="artist">${escapeHtml(song.artist)}</div>
    </button>
  `
}

function songRow(song: Song, extra = ''): string {
  const active = player.current?.id === song.id
  return `
    <div class="song-row-wrap ${active ? 'active' : ''}">
      <button class="song-row" type="button" data-play="${escapeHtml(song.id)}">
        <img src="${safeImgSrc(song.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        <div class="meta">
          <div class="title">${escapeHtml(song.title)}</div>
          <div class="artist">${escapeHtml(song.artist)}</div>
        </div>
        ${active && player.isPlaying ? '<span class="eq-dot">' + SYM.note + '</span>' : ''}
      </button>
      ${songActions(song)}
      ${extra}
    </div>
  `
}

function renderHome(): string {
  const hist = library.history()
  const continueSong = player.current || hist[0]?.song || homeShelves[0]?.songs?.[0]
  let body: string
  if (homeLoading && !homeShelves.length) body = spinner('Loading recommendations for you' + SYM.ellipsis)
  else if (homeError && !homeShelves.length) body = errorState(homeError, 'home')
  else if (!homeShelves.length) body = emptyState('Nothing here yet', 'Search for a song to start listening.')
  else {
    body = homeShelves
      .map(
        (shelf) => `
      <section class="section">
        <div class="overline">Collection</div>
        <h2 class="section-title">${escapeHtml(shelf.title)}</h2>
        <div class="shelf">${shelf.songs.map(songCard).join('')}</div>
      </section>`,
      )
      .join('')
  }

  const langHint = selectedLangs.length
    ? `Picks for ${escapeHtml(languagesLabel(selectedLangs))}`
    : 'Pick music languages in You for better recommendations'

  const hero = continueSong
    ? `
    <article class="hero-continue">
      <img class="hero-cover" src="${safeImgSrc(continueSong.cover)}" alt="" referrerpolicy="no-referrer" />
      <div class="hero-body">
        <div class="overline">Continue</div>
        <h2>${escapeHtml(continueSong.title)}</h2>
        <p class="caption">${escapeHtml(continueSong.artist)}</p>
        <div class="hero-actions">
          <button type="button" class="btn sm" data-play="${escapeHtml(continueSong.id)}">${SYM.play} Play</button>
          <button type="button" class="btn ghost sm" data-like="${escapeHtml(continueSong.id)}">${library.isLiked(continueSong.id) ? SYM.heart : SYM.heartEmpty}</button>
        </div>
      </div>
    </article>`
    : ''

  return `
    <div class="page-head">
      <div class="overline">Home</div>
      <h1>Good listening</h1>
      <p>${langHint}${apiOnline ? '' : ' · <span class="error-text">API offline</span>'}</p>
    </div>
    ${hero}
    <div class="quick-row">
      <button type="button" class="quick-pill" data-tab-jump="library" data-lib-jump="liked">Liked</button>
      <button type="button" class="quick-pill" data-tab-jump="library" data-lib-jump="offline">Offline</button>
      <button type="button" class="quick-pill" data-tab-jump="library" data-lib-jump="history">History</button>
      <button type="button" class="quick-pill" data-tab-jump="search">Search</button>
    </div>
    ${body}
  `
}

function renderSearch(): string {
  let body: string
  if (!searchQuery.trim()) body = emptyState('Search Melocix', 'Find tracks, then like, playlist, or save offline.')
  else if (searchLoading) body = spinner('Searching' + SYM.ellipsis)
  else if (searchError) body = errorState(searchError, 'search')
  else if (!searchResults.length) body = emptyState('No matches', 'Try another title or artist.')
  else body = `<div class="song-list">${searchResults.map((s) => songRow(s)).join('')}</div>`

  return `
    <div class="page-head">
      <div class="overline">Search</div>
      <h1>Find music</h1>
    </div>
    <input class="search-box" type="search" placeholder="Songs, artists, albums" value="${escapeHtml(searchQuery)}" data-search />
    <div style="margin-top:16px">${body}</div>
  `
}

function renderLibrary(): string {
  const stats = library.stats()
  const sections: { id: LibrarySection; label: string; count: number }[] = [
    { id: 'liked', label: 'Liked', count: stats.liked },
    { id: 'history', label: 'History', count: stats.history },
    { id: 'playlists', label: 'Playlists', count: stats.playlists },
    { id: 'offline', label: 'Offline', count: offlineIds.size },
  ]

  const chips = sections
    .map(
      (s) => `
    <button type="button" class="${librarySection === s.id ? 'active' : ''}" data-lib-section="${s.id}">
      ${s.label}
    </button>`,
    )
    .join('')

  let body = ''
  if (librarySection === 'liked') {
    const songs = library.likedSongs()
    body = songs.length
      ? `<div class="lib-toolbar">
          <button type="button" class="btn ghost" data-play-all="liked">${SYM.play} Play all</button>
        </div>
        <div class="song-list">${songs.map((s) => songRow(s)).join('')}</div>`
      : emptyState('No liked songs', 'Tap the heart on any track to save it here.')
  } else if (librarySection === 'history') {
    const entries = library.history()
    body = entries.length
      ? `<div class="lib-toolbar">
          <button type="button" class="btn ghost" data-play-all="history">${SYM.play} Play all</button>
          <button type="button" class="btn ghost danger" data-clear-history>Clear</button>
        </div>
        <div class="song-list">${entries.map((e) => songRow(e.song)).join('')}</div>`
      : emptyState('No history yet', 'Tracks you play will show up here.')
  } else if (librarySection === 'playlists') {
    if (openPlaylistId) {
      const pl = library.getPlaylist(openPlaylistId)
      const songs = library.playlistSongs(openPlaylistId)
      body = `
        <div class="lib-toolbar">
          <button type="button" class="btn ghost" data-back-playlists>${SYM.back} Back</button>
          <button type="button" class="btn ghost" data-play-all="playlist:${openPlaylistId}">${SYM.play} Play all</button>
          <button type="button" class="btn ghost danger" data-delete-pl="${openPlaylistId}">Delete</button>
        </div>
        <h2 class="section-title">${escapeHtml(pl?.name || 'Playlist')}</h2>
        ${
          songs.length
            ? `<div class="song-list">${songs
                .map(
                  (s) =>
                    songRow(
                      s,
                      `<button type="button" class="icon-btn danger" data-remove-pl-song="${escapeHtml(s.id)}" data-pl="${openPlaylistId}" title="Remove">${SYM.times}</button>`,
                    ),
                )
                .join('')}</div>`
            : emptyState('Empty playlist', 'Add songs with + from search or home.')
        }`
    } else {
      const pls = library.playlists()
      body = `
        <div class="lib-toolbar">
          <button type="button" class="btn" data-create-pl>${SYM.plus} New playlist</button>
        </div>
        ${
          pls.length
            ? `<div class="playlist-grid">${pls
                .map(
                  (p) => `
              <button type="button" class="playlist-card glass" data-open-pl="${p.id}">
                <div class="pl-icon">▦</div>
                <div class="pl-meta">
                  <div class="title">${escapeHtml(p.name)}</div>
                  <div class="artist">${p.songIds.length} songs</div>
                </div>
              </button>`,
                )
                .join('')}</div>`
            : emptyState('No playlists', 'Create one and add tracks from search.')
        }`
    }
  } else {
    // offline — rendered async content placeholder; filled after list loads via re-render
    body = `<div id="offline-body">${spinner('Loading offline library' + SYM.ellipsis)}</div>`
  }

  return `
    <div class="page-head">
      <div class="overline">Library</div>
      <h1>Your music</h1>
      <p>Liked, history, playlists, offline — on this device</p>
    </div>
    <div class="segmented">${chips}</div>
    ${body}
  `
}

function renderYou(): string {
  const stats = library.stats()
  const themes: Theme[] = ['dark', 'light', 'black']
  const skinCards = PLAYER_SKINS.map(
    (s) => `
    <button type="button" class="skin-card ${playerSkin === s.id ? 'selected' : ''}" data-player-skin="${s.id}">
      <div class="skin-preview" style="background:${s.preview}">
        <div class="skin-preview-mini skin-preview--${s.id}">
          <span class="spm-art"></span>
          <span class="spm-bars"><i></i><i></i><i></i></span>
          <span class="spm-btn"></span>
        </div>
      </div>
      <div class="skin-info">
        <div class="skin-name">${escapeHtml(s.name)} ${playerSkin === s.id ? '<span class="skin-badge">Active</span>' : ''}</div>
        <div class="skin-tag">${escapeHtml(s.tagline)}</div>
        <div class="skin-inspired">Inspired by: ${escapeHtml(s.inspiredBy)}</div>
      </div>
    </button>`,
  ).join('')

  return `
    <div class="page-head">
      <div class="overline">Profile</div>
      <h1>You</h1>
      <p>Appearance, player layout, and library</p>
    </div>

    <div class="settings-group">
      <div class="overline">Appearance</div>
      <div class="settings-card">
        <div class="theme-cards">
          ${themes
            .map(
              (th) => `
            <button type="button" class="theme-card ${theme === th ? 'active' : ''}" data-theme="${th}">
              <div class="theme-swatch ${th}"></div>
              <strong>${th[0].toUpperCase() + th.slice(1)}</strong>
            </button>`,
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="overline">Player // SIGNAL</div>
      <p class="section-hint">Custom Melocix deck variants. Same hard geometry — Signal, Overdrive, Terminal.</p>
      <div class="skin-grid">${skinCards}</div>
    </div>

    <div class="settings-group">
      <div class="overline">Music languages</div>
      <div class="settings-card">
        <p class="section-hint" style="margin:0 0 12px">
          Home recommendations use these (1–${MAX_LANGS}).
          ${selectedLangs.length ? `<br/>Current: <strong>${escapeHtml(languagesLabel(selectedLangs))}</strong>` : ''}
        </p>
        <button type="button" class="btn ghost" data-edit-languages>Edit languages</button>
      </div>
    </div>

    <div class="settings-group">
      <div class="overline">Library stats</div>
      <div class="stats-grid">
        <div class="stat"><b>${stats.liked}</b><span>Liked</span></div>
        <div class="stat"><b>${stats.history}</b><span>History</span></div>
        <div class="stat"><b>${stats.playlists}</b><span>Playlists</span></div>
        <div class="stat"><b>${offlineIds.size}</b><span>Offline</span></div>
      </div>
    </div>

    <div class="about">
      <strong style="color:var(--text)">Melocix SIGNAL</strong><br />
      Cyber deck player · sharp icons · language picks · library · lyrics.<br />
      Data stays in this browser (localStorage + IndexedDB).<br />
      API: ${apiOnline ? 'connected' : 'offline'} · Not affiliated with Google/YouTube.
    </div>
  `
}

function onboardingHtml(): string {
  if (onboardingStep === 'welcome' && !editingLanguages) {
    return `
      <div class="onboard">
        <div class="onboard-orb" aria-hidden="true"></div>
        <div class="onboard-card">
          <div class="onboard-logo">${icon('signal', 28)}</div>
          <div class="onboard-wordmark">MELOCIX</div>
          <h1>Listen with focus</h1>
          <p class="onboard-lead">
            Search, stream, save offline, and sing along — a calm listening stage built around your languages.
          </p>
          <button type="button" class="btn onboard-cta" data-onboard-next>Start listening</button>
          <p class="onboard-fine">Not affiliated with Google or YouTube</p>
        </div>
      </div>`
  }

  // Language step (first-run or edit)
  const count = selectedLangs.length
  const canContinue = count >= MIN_LANGS && count <= MAX_LANGS
  const chips = MUSIC_LANGUAGES.map((lang) => {
    const on = selectedLangs.includes(lang.id)
    return `
      <button type="button"
        class="lang-chip ${on ? 'selected' : ''}"
        data-lang-id="${lang.id}"
        ${!on && count >= MAX_LANGS ? 'disabled' : ''}>
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-names">
          <strong>${escapeHtml(lang.name)}</strong>
          <small>${escapeHtml(lang.nativeName)}</small>
        </span>
        <span class="lang-check">${on ? '✓' : ''}</span>
      </button>`
  }).join('')

  return `
    <div class="onboard">
      <div class="onboard-orb" aria-hidden="true"></div>
      <div class="onboard-card onboard-wide">
        ${editingLanguages ? '' : '<div class="onboard-step">2 / 2</div>'}
        <h1>${editingLanguages ? 'Music languages' : 'What do you listen to?'}</h1>
        <p class="onboard-lead">
          Choose <strong>at least ${MIN_LANGS}</strong> and up to <strong>${MAX_LANGS}</strong> languages for Home recommendations.
        </p>
        <div class="lang-counter ${canContinue ? 'ok' : ''}">
          ${count} / ${MAX_LANGS} selected
          ${count < MIN_LANGS ? `· pick at least ${MIN_LANGS}` : ''}
        </div>
        <div class="lang-grid">${chips}</div>
        <div class="onboard-actions">
          ${
            editingLanguages
              ? `<button type="button" class="btn ghost" data-onboard-cancel>Cancel</button>`
              : `<button type="button" class="btn ghost" data-onboard-back>Back</button>`
          }
          <button type="button" class="btn onboard-cta" data-onboard-finish ${canContinue ? '' : 'disabled'}>
            ${editingLanguages ? 'Save & refresh Home' : 'Enter Melocix'}
          </button>
        </div>
      </div>
    </div>`
}

function pageHtml(): string {
  switch (tab) {
    case 'home':
      return renderHome()
    case 'search':
      return renderSearch()
    case 'library':
      return renderLibrary()
    case 'you':
      return renderYou()
  }
}

function miniPlayerHtml(): string {
  const song = player.current
  if (!song) return `<div class="mini-player signal skin-${playerSkin}" id="mini"></div>`
  const progress = Math.round(player.progress * 100)
  const liked = library.isLiked(song.id)
  const playIcon = playPauseIcon(player.isPlaying, player.isLoading, 18)

  return `
    <div class="mini-player signal visible skin-${playerSkin}" id="mini" data-expand-player>
      <div class="progress-line signal-progress"><span style="width:${progress}%"></span></div>
      <div class="mini-art-wrap">
        <img class="mini-art" src="${safeImgSrc(song.cover)}" alt="" referrerpolicy="no-referrer" />
      </div>
      <div class="mini-meta">
        <div class="title">${escapeHtml(song.title)}</div>
        <div class="artist">${escapeHtml(song.artist)}${player.isLoading ? SYM.middot + 'loading' + SYM.ellipsis : ''}</div>
      </div>
      <div class="mini-controls" data-stop>
        <button type="button" class="icon-btn sharp ${liked ? 'on' : ''}" data-like="${escapeHtml(song.id)}" title="Like" aria-label="Like">${liked ? icon('heartOn', 18) : icon('heart', 18)}</button>
        <button type="button" class="mini-btn sharp" data-toggle aria-label="Play or pause">${playIcon}</button>
        <button type="button" class="icon-btn sharp mini-expand" aria-label="Open player">${icon('chevronUp', 16)}</button>
      </div>
      ${player.lastError ? `<div class="mini-error">${escapeHtml(player.lastError)}</div>` : ''}
    </div>
  `
}

/** Melocix SIGNAL — custom cyber deck full player */
function fullPlayerHtml(): string {
  if (!playerExpanded || !player.current) return ''
  const song = player.current
  const liked = library.isLiked(song.id)
  const saved = offlineIds.has(song.id)
  const progress = Math.round(player.progress * 1000)
  const progressPct = Math.round(player.progress * 100)
  const queue = player.queueList
  const playIcon = playPauseIcon(player.isPlaying, player.isLoading, 26)
  const status = player.isLoading ? 'BUFFER' : player.isPlaying ? 'PLAYING' : 'IDLE'
  const repeatIcon =
    player.repeatMode === 'one' ? icon('repeatOne', 18) : icon('repeat', 18)

  const sheetLyrics = playerSheetTab === 'lyrics' ? lyricsPanelHtml() : ''
  const sheetQueue =
    playerSheetTab === 'queue'
      ? `<div class="fp-queue-list">
          ${
            queue.length
              ? queue
                  .map(
                    (s, i) => `
            <button type="button" class="fp-queue-item ${i === player.queueIndex ? 'active' : ''}" data-play="${escapeHtml(s.id)}" data-queue-play>
              <span class="qi">${i === player.queueIndex ? icon('signal', 14) : i + 1}</span>
              <span class="qt">${escapeHtml(s.title)}</span>
              <span class="qa">${escapeHtml(s.artist)}</span>
            </button>`,
                  )
                  .join('')
              : '<p class="muted">Queue is empty</p>'
          }
        </div>`
      : ''
  const sheetMore =
    playerSheetTab === 'more'
      ? `<div class="more-actions">
          <button type="button" class="btn ghost sharp" data-add-pl="${escapeHtml(song.id)}">${icon('plus', 16)} Add to playlist</button>
          <button type="button" class="btn ghost sharp" data-offline="${escapeHtml(song.id)}">
            ${offlineSavingId === song.id ? `Saving ${offlineSavePct}%` : saved ? 'Remove offline' : `${icon('download', 16)} Save offline`}
          </button>
          ${player.lastError ? `<p class="error-text">${escapeHtml(player.lastError)}</p>` : ''}
        </div>`
      : ''

  return `
    <div class="full-player signal skin-${playerSkin}" id="full-player">
      <div class="fp-void" style="--cover-wash:url('${cssCoverUrl(song.cover)}')"></div>
      <div class="fp-frame" aria-hidden="true">
        <span class="br tl"></span><span class="br tr"></span>
        <span class="br bl"></span><span class="br brc"></span>
      </div>
      <section class="fp-stage">
        <header class="fp-header">
          <button type="button" class="icon-btn sharp" data-collapse-player aria-label="Close">${icon('x', 18)}</button>
          <div class="fp-now"><span class="fp-sys">SIGNAL</span> // LIVE</div>
          <button type="button" class="icon-btn sharp ${liked ? 'on' : ''}" data-like="${escapeHtml(song.id)}" aria-label="Like">${liked ? icon('heartOn', 18) : icon('heart', 18)}</button>
        </header>
        <div class="fp-art-rig ${player.isPlaying ? 'playing' : ''}">
          <div class="art-brackets" aria-hidden="true"></div>
          <img class="art" src="${safeImgSrc(song.cover)}" alt="" referrerpolicy="no-referrer" />
          <div class="art-status">${status}</div>
        </div>
        <div class="fp-meta">
          <h2>${escapeHtml(song.title)}</h2>
          <p>${escapeHtml(song.artist)}${song.album ? ` · ${escapeHtml(song.album)}` : ''}</p>
        </div>
        <div class="fp-seek-rail">
          <div class="seek-track">
            <div class="seek-fill" style="width:${progressPct}%"></div>
            <div class="seek-ticks" aria-hidden="true"></div>
            <input type="range" min="0" max="1000" value="${progress}" data-seek aria-label="Seek" />
          </div>
          <div class="fp-times">
            <span data-cur-time>${formatTime(player.currentTime)}</span>
            <span data-dur-time>${formatTime(player.duration)}</span>
          </div>
        </div>
        <div class="fp-deck">
          <button type="button" class="fp-side sharp ${player.shuffleOn ? 'on' : ''}" data-shuffle title="Shuffle">${icon('shuffle', 18)}</button>
          <button type="button" class="fp-side sharp" data-prev title="Previous">${icon('prev', 20)}</button>
          <button type="button" class="fp-main sharp" data-toggle title="Play/Pause">${playIcon}</button>
          <button type="button" class="fp-side sharp" data-next title="Next">${icon('next', 20)}</button>
          <button type="button" class="fp-side sharp ${player.repeatMode !== 'off' ? 'on' : ''}" data-repeat title="Repeat">${repeatIcon}</button>
        </div>
      </section>
      <section class="fp-sheet signal-sheet">
        <div class="fp-sheet-tabs">
          <button type="button" class="${playerSheetTab === 'lyrics' ? 'active' : ''}" data-sheet-tab="lyrics">${icon('lyrics', 14)} Lyrics</button>
          <button type="button" class="${playerSheetTab === 'queue' ? 'active' : ''}" data-sheet-tab="queue">${icon('queue', 14)} Queue</button>
          <button type="button" class="${playerSheetTab === 'more' ? 'active' : ''}" data-sheet-tab="more">${icon('more', 14)} More</button>
        </div>
        <div class="fp-sheet-body">
          ${sheetLyrics}${sheetQueue}${sheetMore}
        </div>
      </section>
    </div>
  `
}

function lyricsPanelHtml(): string {
  if (lyricsLoading) {
    return `
      <div class="lyrics-panel glass" id="lyrics-panel">
        <div class="lyrics-head">
          <span>Lyrics</span>
          <span class="lyrics-src">loading${SYM.ellipsis}</span>
        </div>
        <div class="lyrics-body lyrics-center">
          <div class="spinner"></div>
          <p>Fetching from LRCLIB${SYM.ellipsis}</p>
        </div>
      </div>`
  }

  if (lyricsError) {
    return `
      <div class="lyrics-panel glass" id="lyrics-panel">
        <div class="lyrics-head">
          <span>Lyrics</span>
          <button type="button" class="btn ghost glass-btn sm" data-reload-lyrics>Retry</button>
        </div>
        <div class="lyrics-body lyrics-center">
          <p class="error-text">${escapeHtml(lyricsError)}</p>
        </div>
      </div>`
  }

  if (!lyricsData?.found) {
    return `
      <div class="lyrics-panel glass" id="lyrics-panel">
        <div class="lyrics-head">
          <span>Lyrics</span>
          <button type="button" class="btn ghost glass-btn sm" data-reload-lyrics>Retry</button>
        </div>
        <div class="lyrics-body lyrics-center">
          <p>No lyrics found for this track.</p>
          <p class="muted">Source: LRCLIB · titles with "(Official Video)" are cleaned automatically.</p>
        </div>
      </div>`
  }

  if (lyricsData.synced?.length) {
    const lines = lyricsData.synced
      .map(
        (line, i) => `
      <p class="lrc-line" data-lrc-i="${i}" data-lrc-t="${line.time}">${escapeHtml(line.text)}</p>`,
      )
      .join('')
    return `
      <div class="lyrics-panel glass" id="lyrics-panel">
        <div class="lyrics-head">
          <span>Synced lyrics</span>
          <span class="lyrics-src">${escapeHtml(lyricsData.source || 'lrclib')}</span>
        </div>
        <div class="lyrics-body lyrics-synced" id="lyrics-scroll">${lines}</div>
      </div>`
  }

  const plain = escapeHtml(lyricsData.plain || '')
    .split('\n')
    .map((l) => `<p class="lrc-plain">${l || '&nbsp;'}</p>`)
    .join('')

  return `
    <div class="lyrics-panel glass" id="lyrics-panel">
      <div class="lyrics-head">
        <span>Lyrics</span>
        <span class="lyrics-src">${escapeHtml(lyricsData.source || 'lrclib')}</span>
      </div>
      <div class="lyrics-body">${plain}</div>
    </div>`
}

async function loadLyricsForCurrent(force = false) {
  const song = player.current
  if (!song) return
  if (!force && lyricsSongId === song.id && (lyricsData || lyricsError)) return

  const gen = ++lyricsGen
  lyricsSongId = song.id
  lyricsLoading = true
  lyricsError = null
  lyricsData = null
  lastSyncedIndex = -1

  if (playerExpanded) {
    render()
  }

  try {
    const durationSec =
      player.duration > 0 ? player.duration : song.durationMs > 0 ? song.durationMs / 1000 : undefined
    const data = await fetchLyrics({
      artist: song.artist,
      title: song.title,
      album: song.album,
      durationSec,
    })
    if (gen !== lyricsGen) return
    lyricsData = data
    lyricsError = null
  } catch (err) {
    if (gen !== lyricsGen) return
    lyricsData = null
    lyricsError = err instanceof Error ? err.message : 'Lyrics request failed'
  } finally {
    if (gen !== lyricsGen) return
    lyricsLoading = false
    if (playerExpanded && player.current?.id === song.id) {
      render()
      updateSyncedLyrics(true)
    }
  }
}

function updateSyncedLyrics(forceScroll = false) {
  if (!lyricsData?.synced?.length) return
  const t = player.currentTime
  const lines = lyricsData.synced
  let idx = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= t + 0.15) idx = i
    else break
  }
  if (idx === lastSyncedIndex && !forceScroll) return
  lastSyncedIndex = idx

  const root = document.getElementById('lyrics-scroll')
  if (!root) return
  root.querySelectorAll('.lrc-line').forEach((el, i) => {
    el.classList.toggle('active', i === idx)
    el.classList.toggle('past', i < idx)
  })
  const active = root.querySelector('.lrc-line.active') as HTMLElement | null
  if (active) {
    active.scrollIntoView({ block: 'center', behavior: forceScroll ? 'auto' : 'smooth' })
  }
}

function playlistPickerHtml(): string {
  if (!playlistPickerOpen) return ''
  const songId = (window as unknown as { __addSongId?: string }).__addSongId
  if (!songId) return ''
  const song = findSongById(songId)
  if (!song) return ''
  const pls = library.playlists()
  return `
    <div class="modal-backdrop" data-close-picker>
      <div class="modal glass" data-stop>
        <h3>Add to playlist</h3>
        <p class="modal-sub">${escapeHtml(song.title)}</p>
        <button type="button" class="btn full" data-create-pl-and-add>${SYM.plus} New playlist</button>
        <div class="picker-list">
          ${
            pls.length
              ? pls
                  .map(
                    (p) => `
            <button type="button" class="picker-item" data-pick-pl="${p.id}">
              ${escapeHtml(p.name)} <span>${p.songIds.length}</span>
            </button>`,
                  )
                  .join('')
              : '<p class="muted">No playlists yet</p>'
          }
        </div>
        <button type="button" class="btn ghost full" data-close-picker>Cancel</button>
      </div>
    </div>
  `
}

function navBtn(id: Tab, glyph: string, label: string): string {
  return `
    <button type="button" data-tab="${id}" class="${tab === id ? 'active' : ''}">
      <span class="icon">${glyph}</span>${label}
    </button>`
}

function render() {
  applyTheme()

  // First-run welcome / language setup (or edit languages overlay)
  if (onboardingActive || editingLanguages) {
    app.innerHTML = onboardingHtml()
    bindOnboardingEvents()
    return
  }

  const wide = typeof window !== 'undefined' && window.innerWidth >= 960
  app.innerHTML = `
    <div class="app-shell skin-${playerSkin} ${playerExpanded ? 'player-open' : ''} ${wide ? 'has-desktop-stage' : ''}">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">${icon('signal', 16)}</span> MELOCIX</div>
        <div class="topbar-meta">
          <span class="status-dot ${apiOnline ? 'on' : ''}"></span>
          ${apiOnline ? 'Live' : 'Offline'}
        </div>
      </header>
      <main class="content content-enter" id="content">${pageHtml()}</main>
      <aside class="desktop-stage">
        ${
          player.current
            ? `<div class="overline">Now playing</div>
               <img class="hero-cover" src="${safeImgSrc(player.current.cover)}" alt="" referrerpolicy="no-referrer" />
               <h2 class="title">${escapeHtml(player.current.title)}</h2>
               <p class="caption">${escapeHtml(player.current.artist)}</p>`
            : `<div class="overline">Stage</div><p class="muted">Play a track to fill the listening stage.</p>`
        }
      </aside>
      ${miniPlayerHtml()}
      <nav class="nav">
        ${navBtn('home', icon('home', 20), 'Home')}
        ${navBtn('search', icon('search', 20), 'Search')}
        ${navBtn('library', icon('library', 20), 'Library')}
        ${navBtn('you', icon('user', 20), 'You')}
      </nav>
      ${fullPlayerHtml()}
      ${playlistPickerHtml()}
    </div>
  `
  const shell = app.querySelector('.app-shell') as HTMLElement | null
  if (shell && !playerExpanded && !shellEnterPlayed) {
    shellEnterPlayed = true
    playShellEnter(shell)
  }
  bindEvents()
  if (tab === 'library' && librarySection === 'offline') void fillOfflineSection()
}

function bindOnboardingEvents() {
  const card = app.querySelector('.onboard-card') as HTMLElement | null
  if (card) playOnboardEnter(card)
  const grid = app.querySelector('.lang-grid') as HTMLElement | null
  if (grid) playLangGridEnter(grid)

  app.querySelector('[data-onboard-next]')?.addEventListener('click', () => {
    onboardingStep = 'languages'
    render()
  })

  app.querySelector('[data-onboard-back]')?.addEventListener('click', () => {
    onboardingStep = 'welcome'
    render()
  })

  app.querySelector('[data-onboard-cancel]')?.addEventListener('click', () => {
    editingLanguages = false
    selectedLangs = loadMusicLanguages()
    render()
  })

  app.querySelectorAll<HTMLButtonElement>('[data-lang-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.langId!
      const i = selectedLangs.indexOf(id)
      if (i >= 0) {
        selectedLangs = selectedLangs.filter((x) => x !== id)
      } else if (selectedLangs.length < MAX_LANGS) {
        selectedLangs = [...selectedLangs, id]
      }
      render()
    })
  })

  app.querySelector('[data-onboard-finish]')?.addEventListener('click', () => {
    if (selectedLangs.length < MIN_LANGS || selectedLangs.length > MAX_LANGS) return
    if (editingLanguages) {
      saveMusicLanguages(selectedLangs)
      editingLanguages = false
      tab = 'home'
      render()
      void loadHome()
      return
    }
    completeOnboarding(selectedLangs)
    onboardingActive = false
    onboardingStep = 'welcome'
    tab = 'home'
    render()
    void loadHome()
  })
}

async function fillOfflineSection() {
  const host = document.getElementById('offline-body')
  if (!host) return
  try {
    const songs = await offline.list()
    offlineIds = new Set(songs.map((s) => s.id))
    const bytes = await offline.totalBytes()
    host.innerHTML = songs.length
      ? `<div class="lib-toolbar">
          <span class="muted">${songs.length} tracks · ${formatBytes(bytes)}</span>
          <button type="button" class="btn ghost" data-play-all="offline">${SYM.play} Play all</button>
        </div>
        <div class="song-list">${songs.map((s) => songRow(s)).join('')}</div>`
      : emptyState('Nothing offline', 'Tap download on a track to save for offline play.')
    // re-bind offline list actions
    bindSongActions(host)
    host.querySelector('[data-play-all="offline"]')?.addEventListener('click', () => {
      if (songs[0]) void player.play(songs[0], songs)
    })
  } catch (err) {
    host.innerHTML = errorState(err instanceof Error ? err.message : 'Offline load failed', 'offline')
  }
}

function findSongById(id: string): Song | undefined {
  if (player.current?.id === id) return player.current
  const fromLib = library.getSong(id)
  if (fromLib) return fromLib
  for (const s of searchResults) if (s.id === id) return s
  for (const shelf of homeShelves) {
    const s = shelf.songs.find((x) => x.id === id)
    if (s) return s
  }
  for (const s of library.likedSongs()) if (s.id === id) return s
  for (const h of library.history()) if (h.song.id === id) return h.song
  return undefined
}

function songsForContext(songId: string): Song[] {
  if (tab === 'search' && searchResults.length) return searchResults
  if (tab === 'library') {
    if (librarySection === 'liked') return library.likedSongs()
    if (librarySection === 'history') return library.history().map((h) => h.song)
    if (librarySection === 'playlists' && openPlaylistId) return library.playlistSongs(openPlaylistId)
  }
  for (const shelf of homeShelves) {
    if (shelf.songs.some((s) => s.id === songId)) return shelf.songs
  }
  const q = player.queueList
  if (q.some((s) => s.id === songId)) return q
  return searchResults.length ? searchResults : homeShelves.flatMap((s) => s.songs)
}

function bindSongActions(root: ParentNode = app) {
  root.querySelectorAll<HTMLButtonElement>('[data-play]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.play!
      const pool = btn.hasAttribute('data-queue-play')
        ? player.queueList
        : songsForContext(id)
      const song = pool.find((s) => s.id === id) || findSongById(id)
      if (song) void player.play(song, pool.length ? pool : [song])
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-like]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.like!
      const song = findSongById(id)
      if (song) {
        const nowLiked = library.toggleLike(song)
        playHeartBurst(btn, nowLiked)
        // Defer re-render so the burst animation can play
        window.setTimeout(() => render(), nowLiked ? 320 : 180)
      }
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-add-pl]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      ;(window as unknown as { __addSongId?: string }).__addSongId = btn.dataset.addPl
      playlistPickerOpen = true
      render()
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-offline]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.offline!
      void handleOfflineToggle(id)
    })
  })
}

async function handleOfflineToggle(id: string) {
  const song = findSongById(id)
  if (!song) return
  if (offlineIds.has(id)) {
    await offline.remove(id)
    offlineIds.delete(id)
    render()
    return
  }
  offlineSavingId = id
  offlineSavePct = 0
  render()
  try {
    await offline.save(song, (pct) => {
      offlineSavePct = pct
      const btn = app.querySelector(`[data-offline="${id}"]`)
      if (btn) btn.textContent = `${pct}%`
    })
    offlineIds.add(id)
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Offline save failed')
  } finally {
    offlineSavingId = null
    offlineSavePct = 0
    render()
  }
}

function bindEvents() {
  app.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab as Tab
      openPlaylistId = null
      render()
    })
  })

  bindSongActions()

  app.querySelectorAll('[data-stop]').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation())
  })

  app.querySelector('#mini')?.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('[data-stop]')) return
    playerExpanded = true
    playerSheetTab = 'lyrics'
    if (player.current && lyricsSongId !== player.current.id) {
      lyricsLoading = true
      lyricsData = null
      lyricsError = null
    }
    void refreshAccent()
    render()
    void loadLyricsForCurrent()
  })

  app.querySelector('[data-collapse-player]')?.addEventListener('click', () => {
    playerExpanded = false
    render()
  })

  app.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      void player.toggle()
    })
  })
  app.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      void player.next()
    })
  })
  app.querySelectorAll('[data-prev]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      void player.prev()
    })
  })
  app.querySelector('[data-shuffle]')?.addEventListener('click', () => player.toggleShuffle())
  app.querySelector('[data-repeat]')?.addEventListener('click', () => {
    player.cycleRepeat()
    render()
  })

  const seek = app.querySelectorAll<HTMLInputElement>('[data-seek]')
  seek.forEach((el) => {
    el.addEventListener('input', () => player.seek(Number(el.value) / 1000))
  })


  app.querySelectorAll<HTMLButtonElement>('[data-sheet-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playerSheetTab = btn.dataset.sheetTab as 'lyrics' | 'queue' | 'more'
      if (playerSheetTab === 'lyrics') void loadLyricsForCurrent()
      render()
    })
  })

  app.querySelectorAll<HTMLButtonElement>('[data-tab-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tabJump as Tab
      const lib = btn.dataset.libJump as LibrarySection | undefined
      if (lib) librarySection = lib
      openPlaylistId = null
      render()
    })
  })

  app.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      theme = btn.dataset.theme as Theme
      render()
    })
  })

  app.querySelectorAll<HTMLButtonElement>('[data-player-skin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.playerSkin as PlayerSkinId
      if (id === 'glass' || id === 'neon' || id === 'soft') {
        playerSkin = id
        savePlayerSkin(id)
        render()
      }
    })
  })

  app.querySelector('[data-edit-languages]')?.addEventListener('click', () => {
    selectedLangs = loadMusicLanguages()
    editingLanguages = true
    onboardingStep = 'languages'
    render()
  })

  app.querySelector('[data-toggle-lyrics]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    lyricsShowPanel = !lyricsShowPanel
    render()
    if (lyricsShowPanel) void loadLyricsForCurrent()
  })

  app.querySelector('[data-reload-lyrics]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    void loadLyricsForCurrent(true)
  })

  app.querySelectorAll<HTMLButtonElement>('[data-lib-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      librarySection = btn.dataset.libSection as LibrarySection
      openPlaylistId = null
      render()
    })
  })

  app.querySelector('[data-create-pl]')?.addEventListener('click', () => {
    const name = prompt('Playlist name', 'My playlist')
    if (name) {
      const pl = library.createPlaylist(name)
      openPlaylistId = pl.id
      librarySection = 'playlists'
      render()
    }
  })

  app.querySelectorAll<HTMLButtonElement>('[data-open-pl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openPlaylistId = btn.dataset.openPl || null
      render()
    })
  })

  app.querySelector('[data-back-playlists]')?.addEventListener('click', () => {
    openPlaylistId = null
    render()
  })

  app.querySelectorAll<HTMLButtonElement>('[data-delete-pl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this playlist?')) {
        library.deletePlaylist(btn.dataset.deletePl!)
        openPlaylistId = null
        render()
      }
    })
  })

  app.querySelectorAll<HTMLButtonElement>('[data-remove-pl-song]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const pl = btn.dataset.pl!
      const sid = btn.dataset.removePlSong!
      library.removeFromPlaylist(pl, sid)
      render()
    })
  })

  app.querySelector('[data-clear-history]')?.addEventListener('click', () => {
    if (confirm('Clear play history?')) {
      library.clearHistory()
      render()
    }
  })

  app.querySelectorAll<HTMLButtonElement>('[data-play-all]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.playAll!
      let songs: Song[] = []
      if (key === 'liked') songs = library.likedSongs()
      else if (key === 'history') songs = library.history().map((h) => h.song)
      else if (key?.startsWith('playlist:')) songs = library.playlistSongs(key.slice(9))
      if (songs[0]) void player.play(songs[0], songs)
    })
  })

  // playlist picker
  app.querySelectorAll('[data-close-picker]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target !== el && !(el as HTMLElement).hasAttribute('data-close-picker')) return
      if ((e.target as HTMLElement).closest('[data-stop]') && el.classList.contains('modal-backdrop')) {
        if (e.target !== el) return
      }
      playlistPickerOpen = false
      render()
    })
  })

  app.querySelector('[data-create-pl-and-add]')?.addEventListener('click', () => {
    const name = prompt('Playlist name', 'My playlist')
    const songId = (window as unknown as { __addSongId?: string }).__addSongId
    const song = songId ? findSongById(songId) : undefined
    if (name && song) {
      const pl = library.createPlaylist(name)
      library.addToPlaylist(pl.id, song)
      playlistPickerOpen = false
      render()
    }
  })

  app.querySelectorAll<HTMLButtonElement>('[data-pick-pl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const songId = (window as unknown as { __addSongId?: string }).__addSongId
      const song = songId ? findSongById(songId) : undefined
      if (song) library.addToPlaylist(btn.dataset.pickPl!, song)
      playlistPickerOpen = false
      render()
    })
  })

  app.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.retry === 'home') void loadHome()
      if (btn.dataset.retry === 'search') void runSearch(searchQuery)
      if (btn.dataset.retry === 'offline') void fillOfflineSection()
    })
  })

  const search = app.querySelector<HTMLInputElement>('[data-search]')
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value
      window.clearTimeout(searchTimer)
      searchTimer = window.setTimeout(() => void runSearch(searchQuery), 350)
      if (!searchQuery.trim()) {
        searchResults = []
        searchError = null
        searchLoading = false
        render()
        focusSearch()
      }
    })
  }
}

function focusSearch() {
  const again = app.querySelector<HTMLInputElement>('[data-search]')
  if (again) {
    again.focus()
    again.setSelectionRange(searchQuery.length, searchQuery.length)
  }
}

async function refreshAccent() {
  if (!player.current) return
  // Keep brand theme tokens on :root; only tint full-player chrome from cover art.
  accent = await extractPalette(player.current.cover)
  const fp = document.getElementById('full-player')
  if (fp) {
    fp.style.setProperty('--fp-bg', accent.primary)
    fp.style.setProperty('--fp-accent', accent.secondary)
  }
}

async function runSearch(q: string) {
  if (!q.trim()) {
    searchResults = []
    searchLoading = false
    searchError = null
    if (tab === 'search') render()
    return
  }
  searchLoading = true
  searchError = null
  if (tab === 'search') {
    render()
    focusSearch()
  }
  try {
    searchResults = await fetchSearch(q)
    searchError = null
  } catch (err) {
    searchResults = []
    searchError = err instanceof Error ? err.message : 'Search failed'
  } finally {
    searchLoading = false
    if (tab === 'search') {
      render()
      focusSearch()
    }
  }
}

async function loadHome() {
  if (onboardingActive) return
  homeLoading = true
  homeError = null
  render()
  try {
    apiOnline = await fetchHealth()
    const langs = loadMusicLanguages()
    selectedLangs = langs
    homeShelves = await fetchHome(langs)
    homeError = null
  } catch (err) {
    homeError = err instanceof Error ? err.message : 'Failed to load home'
    apiOnline = false
  } finally {
    homeLoading = false
    render()
  }
}

async function refreshOfflineIds() {
  try {
    const songs = await offline.list()
    offlineIds = new Set(songs.map((s) => s.id))
  } catch {
    offlineIds = new Set()
  }
}

// Player UI soft updates
let lastSongId = ''
player.subscribe(() => {
  if (player.current?.id && player.current.id !== lastSongId) {
    lastSongId = player.current.id
    lyricsSongId = null
    lyricsData = null
    lyricsError = null
    lyricsLoading = false
    lastSyncedIndex = -1
    void refreshAccent()
    // full re-render on track change for queue highlight etc.
    render()
    if (playerExpanded) void loadLyricsForCurrent(true)
    return
  }

  updateSyncedLyrics()

  const mini = document.getElementById('mini')
  const full = document.getElementById('full-player')

  if (!player.current) {
    // Soft-clear mini only; avoid full-tree re-render storms
    const miniEl = document.getElementById('mini')
    if (miniEl && miniEl.classList.contains('visible')) render()
    return
  }

  if (mini?.classList.contains('visible')) {
    const title = mini.querySelector('.title')
    const artist = mini.querySelector('.artist')
    const art = mini.querySelector('img')
    const toggle = mini.querySelector('[data-toggle]')
    const line = mini.querySelector('.progress-line > span') as HTMLElement | null
    if (title) title.textContent = player.current.title
    if (artist)
      artist.textContent = `${player.current.artist}${player.isLoading ? SYM.middot + 'loading' + SYM.ellipsis : ''}`
    if (art) art.setAttribute('src', player.current.cover)
    if (toggle) toggle.innerHTML = playPauseIcon(player.isPlaying, player.isLoading, 18)
    if (line) line.style.width = `${Math.round(player.progress * 100)}%`
  }

  if (full) {
    const toggle = full.querySelector('[data-toggle]')
    const seek = full.querySelector<HTMLInputElement>('[data-seek]')
    const cur = full.querySelector('[data-cur-time]')
    const dur = full.querySelector('[data-dur-time]')
    const fill = full.querySelector('.seek-fill') as HTMLElement | null
    const rig = full.querySelector('.fp-art-rig')
    const status = full.querySelector('.art-status')
    if (toggle) toggle.innerHTML = playPauseIcon(player.isPlaying, player.isLoading, 26)
    if (cur) cur.textContent = formatTime(player.currentTime)
    if (dur) dur.textContent = formatTime(player.duration)
    if (seek && document.activeElement !== seek) seek.value = String(Math.round(player.progress * 1000))
    if (fill) fill.style.width = `${Math.round(player.progress * 100)}%`
    rig?.classList.toggle('playing', player.isPlaying)
    if (status)
      status.textContent = player.isLoading ? 'BUFFER' : player.isPlaying ? 'PLAYING' : 'IDLE'
  }
})

library.subscribe(() => {
  // lightweight — only if library tab
  if (tab === 'library' || tab === 'you') render()
})

offline.subscribe(() => {
  void refreshOfflineIds().then(() => {
    if (tab === 'library' && librarySection === 'offline') render()
  })
})

let bootDone = false
let shellEnterPlayed = false

async function startApp() {
  if (!bootDone) {
    bootDone = true
    try {
      await playBootAnimation(app)
    } catch {
      /* ignore animation failures */
    }
  }
  await refreshOfflineIds()
  render()
  if (!onboardingActive) void loadHome()
}

void startApp()

console.info(
  '%cMelocix',
  'color:#a78bfa;font-weight:bold',
  '\u2014 onboarding \u00b7 language picks \u00b7 library \u00b7 lyrics \u00b7 skins',
)
