/**
 * First-run onboarding: welcome + music languages (1-5).
 * Home recommendations are driven by selected languages.
 */

export type MusicLanguage = {
  id: string
  name: string
  nativeName: string
  flag: string
  /** Search seeds for home shelves (YT Music) */
  seeds: string[]
}

// Native names written with \u escapes so the file never gets mojibake again.
export const MUSIC_LANGUAGES: MusicLanguage[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '\u{1F1EC}\u{1F1E7}',
    seeds: ['top english pop songs', 'english hits official audio', 'trending english songs'],
  },
  {
    id: 'hi',
    name: 'Hindi',
    nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['bollywood hits songs', 'hindi songs official', 'latest hindi songs'],
  },
  {
    id: 'ta',
    name: 'Tamil',
    nativeName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['tamil hits songs', 'kollywood songs official', 'latest tamil songs'],
  },
  {
    id: 'te',
    name: 'Telugu',
    nativeName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['telugu hits songs', 'tollywood songs official', 'latest telugu songs'],
  },
  {
    id: 'ml',
    name: 'Malayalam',
    nativeName: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['malayalam hits songs', 'mollywood songs', 'latest malayalam songs'],
  },
  {
    id: 'kn',
    name: 'Kannada',
    nativeName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['kannada hits songs', 'sandalwood songs', 'latest kannada songs'],
  },
  {
    id: 'pa',
    name: 'Punjabi',
    nativeName: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40',
    flag: '\u{1F1EE}\u{1F1F3}',
    seeds: ['punjabi hits songs', 'latest punjabi songs', 'punjabi party songs'],
  },
  {
    id: 'bn',
    name: 'Bengali',
    nativeName: '\u09AC\u09BE\u0982\u09B2\u09BE',
    flag: '\u{1F1E7}\u{1F1E9}',
    seeds: ['bengali hits songs', 'bangla songs official', 'latest bengali songs'],
  },
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Espa\u00F1ol',
    flag: '\u{1F1EA}\u{1F1F8}',
    seeds: ['latin hits spanish songs', 'reggaeton hits', 'spanish pop songs'],
  },
  {
    id: 'ko',
    name: 'Korean',
    nativeName: '\uD55C\uAD6D\uC5B4',
    flag: '\u{1F1F0}\u{1F1F7}',
    seeds: ['kpop hits songs', 'korean songs official', 'trending kpop'],
  },
  {
    id: 'ja',
    name: 'Japanese',
    nativeName: '\u65E5\u672C\u8A9E',
    flag: '\u{1F1EF}\u{1F1F5}',
    seeds: ['jpop hits songs', 'japanese songs official', 'anime songs popular'],
  },
  {
    id: 'ar',
    name: 'Arabic',
    nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
    flag: '\u{1F1F8}\u{1F1E6}',
    seeds: ['arabic hits songs', 'arabic pop songs', 'latest arabic songs'],
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'Fran\u00E7ais',
    flag: '\u{1F1EB}\u{1F1F7}',
    seeds: ['french pop hits', 'chansons francaises', 'french songs official'],
  },
  {
    id: 'pt',
    name: 'Portuguese',
    nativeName: 'Portugu\u00EAs',
    flag: '\u{1F1E7}\u{1F1F7}',
    seeds: ['brazilian funk hits', 'mpb hits', 'portuguese songs brasil'],
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '\u{1F1E9}\u{1F1EA}',
    seeds: ['german pop hits', 'deutsche lieder hits', 'german songs official'],
  },
  {
    id: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '\u{1F1EE}\u{1F1F9}',
    seeds: ['italian pop hits', 'canzoni italiane', 'italian songs official'],
  },
  {
    id: 'tr',
    name: 'Turkish',
    nativeName: 'T\u00FCrk\u00E7e',
    flag: '\u{1F1F9}\u{1F1F7}',
    seeds: ['turkish pop hits', 'turkce sarkilar', 'turkish songs official'],
  },
  {
    id: 'zh',
    name: 'Chinese',
    nativeName: '\u4E2D\u6587',
    flag: '\u{1F1E8}\u{1F1F3}',
    seeds: ['c-pop hits', 'mandarin songs popular', 'chinese pop songs'],
  },
]

const DONE_KEY = 'melocix-onboarding-done'
const LANGS_KEY = 'melocix-music-languages'

export const MIN_LANGS = 1
export const MAX_LANGS = 5

export function isOnboardingDone(): boolean {
  return localStorage.getItem(DONE_KEY) === '1'
}

export function completeOnboarding(languageIds: string[]) {
  saveMusicLanguages(languageIds)
  localStorage.setItem(DONE_KEY, '1')
}

export function resetOnboarding() {
  localStorage.removeItem(DONE_KEY)
}

export function loadMusicLanguages(): string[] {
  try {
    const raw = localStorage.getItem(LANGS_KEY)
    if (!raw) return []
    const ids = JSON.parse(raw) as string[]
    if (!Array.isArray(ids)) return []
    return ids.filter((id) => MUSIC_LANGUAGES.some((l) => l.id === id)).slice(0, MAX_LANGS)
  } catch {
    return []
  }
}

export function saveMusicLanguages(ids: string[]) {
  const clean = [...new Set(ids)]
    .filter((id) => MUSIC_LANGUAGES.some((l) => l.id === id))
    .slice(0, MAX_LANGS)
  localStorage.setItem(LANGS_KEY, JSON.stringify(clean))
}

export function getLanguage(id: string): MusicLanguage | undefined {
  return MUSIC_LANGUAGES.find((l) => l.id === id)
}

export function languagesLabel(ids: string[]): string {
  return ids
    .map((id) => getLanguage(id)?.name)
    .filter(Boolean)
    .join(', ')
}
