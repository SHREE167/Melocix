/**
 * Central UI symbols as unicode escapes — never store raw emoji in templates
 * that may be re-saved with the wrong encoding.
 */
export const SYM = {
  note: '\u266A', // ♪
  heart: '\u2665', // ♥
  heartEmpty: '\u2661', // ♡
  play: '\u25B6', // ▶
  pause: '\u275A\u275A', // ❚❚
  prev: '\u23EE', // ⏮
  next: '\u23ED', // ⏭
  back: '\u2190', // ←
  down: '\u2193', // ↓
  check: '\u2713', // ✓
  plus: '\uFF0B', // ＋
  times: '\u00D7', // ×
  ellipsis: '\u2026', // …
  middot: ' \u00B7 ', // ·
} as const
