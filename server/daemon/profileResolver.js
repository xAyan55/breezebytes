/**
 * Bounded Mojang UUID & Profile Resolver
 * Features:
 * - 1-hour TTL for successful resolutions
 * - 5-minute negative cache for nonexistent usernames
 * - In-flight Promise deduplication (thundering-herd protection)
 * - 4-second timeout to isolate external network latency
 * - Concurrency limit (max 5 active outbound requests)
 * - LRU/bounded memory limit (max 500 cached entries)
 */

class ProfileResolver {
  constructor() {
    this.cache = new Map(); // key: normalized username -> { uuid, username, expiresAt, negative }
    this.inflight = new Map(); // key -> Promise
    this.activeRequests = 0;
    this.maxConcurrent = 5;
    this.maxCacheSize = 500;
  }

  /**
   * Normalize username key
   */
  normalize(username) {
    return (username || '').toLowerCase().trim();
  }

  /**
   * Format dashed UUID (8-4-4-4-12) if un-dashed (32 chars)
   */
  formatUuid(raw) {
    if (!raw) return '';
    const clean = raw.replace(/-/g, '');
    if (clean.length === 32) {
      return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20)}`;
    }
    return raw;
  }

  /**
   * Get cached resolution if valid
   */
  getCached(username) {
    const key = this.normalize(username);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Set cached item, enforcing max capacity
   */
  setCached(username, data, ttlMs) {
    const key = this.normalize(username);
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      ...data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Resolve username to UUID via Mojang API
   */
  async resolve(username) {
    if (!username || typeof username !== 'string') return null;
    const clean = username.trim();
    if (!clean) return null;
    const key = this.normalize(clean);

    // 1. Check cache
    const cached = this.getCached(key);
    if (cached) {
      if (cached.negative) return null;
      return { uuid: cached.uuid, username: cached.username };
    }

    // 2. Check inflight
    if (this.inflight.has(key)) {
      return this.inflight.get(key);
    }

    // 3. Create throttled request
    const promise = this._fetchFromMojang(clean, key);
    this.inflight.set(key, promise);

    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  async _fetchFromMojang(username, key) {
    // Wait for concurrency slot if needed
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.activeRequests++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const url = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BreezeBytes-ProfileResolver/1.0' }
      });

      if (res.status === 200) {
        const json = await res.json();
        if (json && json.id) {
          const formattedUuid = this.formatUuid(json.id);
          const result = {
            uuid: formattedUuid,
            username: json.name || username
          };
          // Cache successful resolution for 1 hour
          this.setCached(key, { uuid: formattedUuid, username: json.name || username, negative: false }, 3600 * 1000);
          return result;
        }
      }

      if (res.status === 204 || res.status === 404) {
        // Negative cache: not a valid Mojang user, cooldown for 5 minutes
        this.setCached(key, { negative: true }, 5 * 60 * 1000);
        return null;
      }

      return null;
    } catch {
      // Failure cooldown: 30 seconds
      this.setCached(key, { negative: true }, 30 * 1000);
      return null;
    } finally {
      clearTimeout(timeout);
      this.activeRequests--;
    }
  }
}

export const profileResolver = new ProfileResolver();
export default profileResolver;
