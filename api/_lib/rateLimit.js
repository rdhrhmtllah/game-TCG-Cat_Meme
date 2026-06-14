/**
 * In-memory token bucket rate limiter.
 * Cukup untuk MVP single-region Vercel.
 * Jika traffic tinggi, upgrade ke Upstash Redis (Fase 2).
 */

const buckets = new Map();

// Cleanup bucket yang sudah expired setiap 60 detik
const CLEANUP_INTERVAL = 60_000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > bucket.windowMs * 2) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Cek apakah request diizinkan berdasarkan rate limit.
 *
 * @param {string} key - Identitas unik (misal "login:127.0.0.1" atau "login:username123")
 * @param {number} maxRequests - Maksimum request dalam window
 * @param {number} windowMs - Window waktu dalam milidetik
 * @returns {boolean} true jika diizinkan, false jika melebihi limit
 */
export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxRequests, lastRefill: now, windowMs };
    buckets.set(key, bucket);
  }

  // Refill token jika window sudah lewat
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= windowMs) {
    bucket.tokens = maxRequests;
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }

  return false;
}

/**
 * Helper untuk mendapatkan sisa token (untuk debugging/logging).
 */
export function getRemainingTokens(key) {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  return Math.max(0, bucket.tokens);
}
