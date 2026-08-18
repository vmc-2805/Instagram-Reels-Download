'use strict';

/**
 * Minimal in-memory TTL cache. Keeps repeated lookups of the same post from
 * hammering Instagram, which is the fastest way to get an IP throttled.
 */
class TtlCache {
  constructor({ ttlMs = 900000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh recency so the eviction below drops genuinely cold entries.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    return value;
  }

  clear() {
    this.store.clear();
  }
}

module.exports = { TtlCache };
