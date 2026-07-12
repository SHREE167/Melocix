/** Shared security helpers for Melocix API */

/** YouTube video id: 6–20 chars of [A-Za-z0-9_-] (covers classic 11-char IDs) */
export function isValidVideoId(id) {
  return typeof id === 'string' && /^[\w-]{6,20}$/.test(id)
}

/**
 * Very small in-memory rate limiter (per IP + route key).
 * @param {{ windowMs?: number, max?: number }} opts
 */
export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  /** @type {Map<string, { count: number, reset: number }>} */
  const hits = new Map()

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const key = `${ip}:${req.path.split('/')[1] || 'root'}`
    const now = Date.now()
    let bucket = hits.get(key)
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + windowMs }
      hits.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > max) {
      res.status(429).json({ error: 'Too many requests — slow down' })
      return
    }
    next()
  }
}

/** Allow only local origins in dev (browser + same machine) */
export function localCorsOrigin(origin, cb) {
  if (!origin) {
    // non-browser / same-origin audio element may omit Origin
    cb(null, true)
    return
  }
  try {
    const u = new URL(origin)
    const host = u.hostname
    const ok =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.localhost')
    cb(null, ok)
  } catch {
    cb(null, false)
  }
}
