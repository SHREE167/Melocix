/**
 * Melocix UI symbols — sharp SVG icons + text-safe punctuation.
 * Prefer icon helpers from ./ui/icons for interactive chrome.
 */
import { icon, playPauseIcon } from './ui/icons'

export { icon, playPauseIcon }

/** Text-safe punctuation for labels (never emoji-heavy chrome). */
export const SYM = {
  note: icon('signal', 18),
  heart: icon('heartOn', 18),
  heartEmpty: icon('heart', 18),
  play: icon('play', 16),
  pause: icon('pause', 16),
  prev: icon('prev', 18),
  next: icon('next', 18),
  back: icon('back', 16),
  down: icon('download', 16),
  check: icon('check', 14),
  plus: icon('plus', 16),
  times: icon('x', 18),
  ellipsis: '\u2026',
  middot: ' \u00B7 ',
} as const
