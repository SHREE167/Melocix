/**
 * Extract a vibrant palette from album art (Canvas) — freefrontend-style dynamic player.
 */
export async function extractPalette(imageUrl: string): Promise<{
  primary: string
  secondary: string
  text: string
}> {
  const fallback = {
    primary: '#8b5cf6',
    secondary: '#22d3ee',
    text: '#f4f4f8',
  }

  try {
    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    const size = 48
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    let r = 0
    let g = 0
    let b = 0
    let count = 0
    let maxSat = 0
    let sr = 80
    let sg = 60
    let sb = 200

    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i]
      const pg = data[i + 1]
      const pb = data[i + 2]
      const pa = data[i + 3]
      if (pa < 128) continue
      // skip near-black / near-white
      const max = Math.max(pr, pg, pb)
      const min = Math.min(pr, pg, pb)
      if (max < 30 || min > 230) continue
      r += pr
      g += pg
      b += pb
      count++
      const sat = max - min
      if (sat > maxSat) {
        maxSat = sat
        sr = pr
        sg = pg
        sb = pb
      }
    }

    if (!count) return fallback
    r = Math.round(r / count)
    g = Math.round(g / count)
    b = Math.round(b / count)

    // darken primary for backgrounds
    const primary = rgb(mix(r, 20, 0.55), mix(g, 16, 0.55), mix(b, 40, 0.55))
    const secondary = rgb(sr, sg, sb)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const text = lum > 0.55 ? '#12121a' : '#f4f4f8'

    return { primary, secondary, text }
  } catch {
    return fallback
  }
}

function mix(c: number, t: number, amount: number) {
  return Math.round(c * (1 - amount) + t * amount)
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, n))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    // try proxy-less; covers from yt may fail CORS — use referrerpolicy via attr not available on Image
    img.referrerPolicy = 'no-referrer'
    img.src = url
  })
}
