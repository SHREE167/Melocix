/**
 * Melocix SIGNAL player variants — hard cyber geometry only.
 * Legacy IDs kept for localStorage: glass | neon | soft.
 */

export type PlayerSkinId = 'glass' | 'neon' | 'soft'

export type PlayerSkin = {
  id: PlayerSkinId
  name: string
  tagline: string
  inspiredBy: string
  preview: string
}

export const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: 'glass',
    name: 'Signal',
    tagline: 'Framed art, hard deck, crimson edge',
    inspiredBy: 'Melocix SIGNAL · default deck',
    preview: 'linear-gradient(145deg, #030303 0%, #1a0508 40%, #e11d48 100%)',
  },
  {
    id: 'neon',
    name: 'Overdrive',
    tagline: 'Hot accent rails, denser HUD chrome',
    inspiredBy: 'High-gain SIGNAL overdrive',
    preview: 'linear-gradient(135deg, #000 0%, #7f1d1d 45%, #e11d48 100%)',
  },
  {
    id: 'soft',
    name: 'Terminal',
    tagline: 'Compact stage, mono ticks, dense deck',
    inspiredBy: 'Operator terminal layout',
    preview: 'linear-gradient(160deg, #050505 0%, #141414 50%, #9f1239 100%)',
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
