/**
 * First-run onboarding: welcome + music languages (1â€“5).
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

export const MUSIC_LANGUAGES: MusicLanguage[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: 'ðŸ‡¬ðŸ‡§',
    seeds: ['top english pop songs', 'english hits official audio', 'trending english songs'],
  },
  {
    id: 'hi',
    name: 'Hindi',
    nativeName: 'à¤¹à¤¿à¤¨à¥à¤¦à¥€',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['bollywood hits songs', 'hindi songs official', 'latest hindi songs'],
  },
  {
    id: 'ta',
    name: 'Tamil',
    nativeName: 'à®¤à®®à®¿à®´à¯',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['tamil hits songs', 'kollywood songs official', 'latest tamil songs'],
  },
  {
    id: 'te',
    name: 'Telugu',
    nativeName: 'à°¤à±†à°²à±à°—à±',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['telugu hits songs', 'tollywood songs official', 'latest telugu songs'],
  },
  {
    id: 'ml',
    name: 'Malayalam',
    nativeName: 'à´®à´²à´¯à´¾à´³à´‚',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['malayalam hits songs', 'mollywood songs', 'latest malayalam songs'],
  },
  {
    id: 'kn',
    name: 'Kannada',
    nativeName: 'à²•à²¨à³à²¨à²¡',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['kannada hits songs', 'sandalwood songs', 'latest kannada songs'],
  },
  {
    id: 'pa',
    name: 'Punjabi',
    nativeName: 'à¨ªà©°à¨œà¨¾à¨¬à©€',
    flag: 'ðŸ‡®ðŸ‡³',
    seeds: ['punjabi hits songs', 'latest punjabi songs', 'punjabi party songs'],
  },
  {
    id: 'bn',
    name: 'Bengali',
    nativeName: 'à¦¬à¦¾à¦‚à¦²à¦¾',
    flag: 'ðŸ‡§ðŸ‡©',
    seeds: ['bengali hits songs', 'bangla songs official', 'latest bengali songs'],
  },
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'EspaÃ±ol',
    flag: 'ðŸ‡ªðŸ‡¸',
    seeds: ['latin hits spanish songs', 'reggaeton hits', 'spanish pop songs'],
  },
  {
    id: 'ko',
    name: 'Korean',
    nativeName: 'í•œêµ­ì–´',
    flag: 'ðŸ‡°ðŸ‡·',
    seeds: ['kpop hits songs', 'korean songs official', 'trending kpop'],
  },
  {
    id: 'ja',
    name: 'Japanese',
    nativeName: 'æ—¥æœ¬èªž',
    flag: 'ðŸ‡¯ðŸ‡µ',
    seeds: ['jpop hits songs', 'japanese songs official', 'anime songs popular'],
  },
  {
    id: 'ar',
    name: 'Arabic',
    nativeName: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©',
    flag: 'ðŸ‡¸ðŸ‡¦',
    seeds: ['arabic hits songs', 'arabic pop songs', 'latest arabic songs'],
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'FranÃ§ais',
    flag: 'ðŸ‡«ðŸ‡·',
    seeds: ['french pop hits', 'chansons franÃ§aises', 'french songs official'],
  },
  {
    id: 'pt',
    name: 'Portuguese',
    nativeName: 'PortuguÃªs',
    flag: 'ðŸ‡§ðŸ‡·',
    seeds: ['brazilian funk hits', 'mpb hits', 'portuguese songs brasil'],
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: 'ðŸ‡©ðŸ‡ª',
    seeds: ['german pop hits', 'deutsche lieder hits', 'german songs official'],
  },
  {
    id: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: 'ðŸ‡®ðŸ‡¹',
    seeds: ['italian pop hits', 'canzoni italiane', 'italian songs official'],
  },
  {
    id: 'tr',
    name: 'Turkish',
    nativeName: 'TÃ¼rkÃ§e',
    flag: 'ðŸ‡¹ðŸ‡·',
    seeds: ['turkish pop hits', 'tÃ¼rkÃ§e ÅŸarkÄ±lar', 'turkish songs official'],
  },
  {
    id: 'zh',
    name: 'Chinese',
    nativeName: 'ä¸­æ–‡',
    flag: 'ðŸ‡¨ðŸ‡³',
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
