/**
 * Player layout variants (Melocix Orbit).
 * Brand colors stay red/black or blue/white — skins change stage layout, not the palette.
 * IDs kept for localStorage compatibility: glass | neon | soft.
 */

export type PlayerSkinId = 'glass' | 'neon' | 'soft'

export type PlayerSkin = {
  id: PlayerSkinId
  name: string
  tagline: string
  inspiredBy: string
  /** CSS gradient for preview card */
  preview: string
}

export const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: 'glass',
    name: 'Stage',
    tagline: 'Large centered art, classic transport',
    inspiredBy: 'Listening theater · vinyl stage',
    preview: 'linear-gradient(145deg, #0a0a0a 0%, #e11d48 55%, #fb7185 100%)',
  },
  {
    id: 'neon',
    name: 'Cinema',
    tagline: 'Full-bleed glow, bold cover focus',
    inspiredBy: 'Immersive dark cinema card',
    preview: 'linear-gradient(135deg, #050505 0%, #be123c 40%, #9f1239 100%)',
  },
  {
    id: 'soft',
    name: 'Compact',
    tagline: 'Softer art, calm tactile controls',
    inspiredBy: 'Desktop-friendly compact stage',
    preview: 'linear-gradient(160deg, #111 0%, #9f1239 45%, #f43f5e 100%)',
  },
]

const KEY = 'melocix-player-skin'

export function loadPlayerSkin(): PlayerSkinId {
  const v = localStorage.getItem(KEY)
  if (v === 'glass' || v === 'neon' || v === 'soft') return v
  return 'glass'
}

export function savePlayerSkin(id: PlayerSkinId) {
  localStorage.setItem(KEY, id)
}

export function getSkin(id: PlayerSkinId): PlayerSkin {
  return PLAYER_SKINS.find((s) => s.id === id) || PLAYER_SKINS[0]
}
