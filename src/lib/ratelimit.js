'use strict';

/**
 * Fixed-window per-IP rate limiter. Enough for a single-process deployment;
 * swap for Redis if the app is ever scaled horizontally.
 */
function createRateLimiter({ limit = 20, windowMs = 60000 } = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, limit - entry.count);
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(remaining));

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        ok: false,
        error: `Too many requests. Please wait ${retryAfter}s and try again.`,
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
