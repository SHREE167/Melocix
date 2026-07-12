/**
 * Player skins inspired by freefrontend.com/javascript-music-players/
 * - glass: glassmorphism + vinyl (expanding card)
 * - neon: dynamic color card / neon dock
 * - soft: soft UI / tactile rounded player
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
    name: 'Glass Vinyl',
    tagline: 'Frosted panels, spinning disc, blurred cover',
    inspiredBy: 'Glassmorphism dashboard players',
    preview: 'linear-gradient(145deg, #0a0a0a 0%, #e11d48 55%, #fb7185 100%)',
  },
  {
    id: 'neon',
    name: 'Neon Wave',
    tagline: 'Bold card, color-reactive glow, wave seek',
    inspiredBy: 'Dynamic color-extracting media players',
    preview: 'linear-gradient(135deg, #050505 0%, #be123c 40%, #2563eb 100%)',
  },
  {
    id: 'soft',
    name: 'Soft Pulse',
    tagline: 'Soft UI, pill controls, calm tactile feel',
    inspiredBy: 'Soft UI / neumorphic music players',
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
