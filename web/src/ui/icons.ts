/**
 * Melocix SIGNAL — sharp stroke icons (cyber / industrial).
 * 24 viewBox, currentColor, miter joins — no emoji, no soft bubbles.
 */

export type IconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'shuffle'
  | 'repeat'
  | 'repeatOne'
  | 'heart'
  | 'heartOn'
  | 'plus'
  | 'x'
  | 'check'
  | 'chevronUp'
  | 'chevronDown'
  | 'back'
  | 'download'
  | 'search'
  | 'home'
  | 'library'
  | 'user'
  | 'signal'
  | 'note'
  | 'queue'
  | 'lyrics'
  | 'more'
  | 'ellipsis'

const PATHS: Record<IconName, string> = {
  play: '<path d="M8 5v14l12-7z" fill="currentColor" stroke="none"/>',
  pause:
    '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  prev: '<path d="M6 6v12M18 6l-9 6 9 6V6z" fill="none"/>',
  next: '<path d="M18 6v12M6 6l9 6-9 6V6z" fill="none"/>',
  shuffle:
    '<path d="M4 7h4l4 5 3-3h3M17 5l3 2-3 2M4 17h4l3-3M14 14l1 1h3M17 15l3 2-3 2" fill="none"/>',
  repeat: '<path d="M7 7h9v3l4-4-4-4v3H5v6M17 17H8v-3l-4 4 4 4v-3h11v-6" fill="none"/>',
  repeatOne:
    '<path d="M7 7h9v3l4-4-4-4v3H5v6M17 17H8v-3l-4 4 4 4v-3h11v-6M12 10v6M12 10h-1.5" fill="none"/>',
  heart:
    '<path d="M12 20l-7.5-7.2C2.5 10.9 2.8 7.5 5.4 6.1 7.2 5.1 9.4 5.6 12 8c2.6-2.4 4.8-2.9 6.6-1.9 2.6 1.4 2.9 4.8.9 6.7L12 20z" fill="none"/>',
  heartOn:
    '<path d="M12 20l-7.5-7.2C2.5 10.9 2.8 7.5 5.4 6.1 7.2 5.1 9.4 5.6 12 8c2.6-2.4 4.8-2.9 6.6-1.9 2.6 1.4 2.9 4.8.9 6.7L12 20z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14" fill="none"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" fill="none"/>',
  check: '<path d="M5 12l5 5 9-10" fill="none"/>',
  chevronUp: '<path d="M6 14l6-6 6 6" fill="none"/>',
  chevronDown: '<path d="M6 10l6 6 6-6" fill="none"/>',
  back: '<path d="M15 6l-6 6 6 6M9 12h10" fill="none"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 19h14" fill="none"/>',
  search: '<path d="M10.5 10.5a4.5 4.5 0 1 1 0-.01M14 14l5 5" fill="none"/>',
  home: '<path d="M4 11l8-7 8 7v9H4v-9zM9 20v-7h6v7" fill="none"/>',
  library: '<path d="M5 4h3v16H5zM11 4h3v16h-3zM17 7h3v13h-3z" fill="none"/>',
  user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" fill="none"/>',
  signal:
    '<path d="M4 16v4M8 12v8M12 8v12M16 5v15M20 10v10" fill="none" stroke-linecap="square"/>',
  note: '<path d="M9 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM11.5 15.5V6l8-2v8.5M17.5 14.5a2.5 2.5 0 1 0 0-5" fill="none"/>',
  queue: '<path d="M5 7h14M5 12h14M5 17h10" fill="none"/>',
  lyrics: '<path d="M6 5h12v14H6zM9 9h6M9 13h6M9 17h3" fill="none"/>',
  more: '<path d="M6 12h.01M12 12h.01M18 12h.01" fill="none" stroke-linecap="square"/>',
  ellipsis: '<path d="M6 12h.01M12 12h.01M18 12h.01" fill="none" stroke-linecap="square"/>',
}

const FILL_ICONS = new Set<IconName>(['play', 'pause', 'heartOn'])

export function icon(name: IconName, size = 20, className = 'ico'): string {
  const body = PATHS[name]
  if (!body) return ''
  const stroke = FILL_ICONS.has(name) ? '' : ' stroke="currentColor" stroke-width="1.75"'
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"${stroke} stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">${body}</svg>`
}

/** Transport glyph that updates via innerHTML */
export function playPauseIcon(isPlaying: boolean, isLoading: boolean, size = 22): string {
  if (isLoading) return icon('ellipsis', size)
  return isPlaying ? icon('pause', size) : icon('play', size)
}
