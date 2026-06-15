/**
 * Rate Limiter — per-agent-type, burst + sustained windows.
 *
 * Key format: "{source}:{userId}:{agentId}" (e.g. "tg:12345:admin")
 * Limits vary by agentId to allow admin more throughput.
 */

// ── Config per agent type ─────────────────────────────

interface RateLimitConfig {
  burst: number;        // max requests in burst window
  burstWindowMs: number;
  sustained: number;    // max requests in sustained window
  sustainedWindowMs: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
  burst: 5,
  burstWindowMs: 10_000,
  sustained: 20,
  sustainedWindowMs: 60_000,
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  admin: {
    burst: 30,
    burstWindowMs: 10_000,
    sustained: 120,
    sustainedWindowMs: 60_000,
  },
  atencion: {
    burst: 5,
    burstWindowMs: 10_000,
    sustained: 20,
    sustainedWindowMs: 60_000,
  },
  cocina: {
    burst: 10,
    burstWindowMs: 10_000,
    sustained: 40,
    sustainedWindowMs: 60_000,
  },
};

// ── In-memory slide window store ──────────────────────

interface Entry {
  timestamps: number[];
  expiresAt: number;
}

const store = new Map<string, Entry>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

function agentIdFromKey(key: string): string {
  // Key format: "{source}:{userId}:{agentId}" or plain "{userId}"
  const parts = key.split(":");
  return parts.length >= 3 ? parts[2] : "atencion";
}

function getLimits(key: string): RateLimitConfig {
  const agentId = agentIdFromKey(key);
  return RATE_LIMITS[agentId] || DEFAULT_LIMITS;
}

// ── Public API ────────────────────────────────────────

export function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanExpired();
    lastCleanup = now;
  }

  const limits = getLimits(key);

  // Get or create entry (extend expiry on use)
  let entry = store.get(key);
  const timestamps = entry
    ? entry.timestamps.filter((t) => now - t < limits.sustainedWindowMs)
    : [];

  // Check BURST limit (within short window)
  const burstTimestamps = timestamps.filter((t) => now - t < limits.burstWindowMs);
  if (burstTimestamps.length >= limits.burst) return false;

  // Check SUSTAINED limit (within long window)
  if (timestamps.length >= limits.sustained) return false;

  // Allow
  timestamps.push(now);
  store.set(key, {
    timestamps,
    expiresAt: now + CLEANUP_INTERVAL * 2,
  });

  return true;
}

/** Reset rate limit for a specific key (useful after admin override) */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Get current usage stats for a key (for monitoring) */
export function getRateLimitStats(key: string): {
  limited: boolean;
  burstUsed: number;
  burstMax: number;
  sustainedUsed: number;
  sustainedMax: number;
  resetsInMs: number;
} | null {
  const limits = getLimits(key);
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return null;

  const timestamps = entry.timestamps.filter((t) => now - t < limits.sustainedWindowMs);
  const burstTimestamps = timestamps.filter((t) => now - t < limits.burstWindowMs);

  return {
    limited: burstTimestamps.length >= limits.burst || timestamps.length >= limits.sustained,
    burstUsed: burstTimestamps.length,
    burstMax: limits.burst,
    sustainedUsed: timestamps.length,
    sustainedMax: limits.sustained,
    resetsInMs: timestamps.length > 0
      ? Math.max(0, limits.sustainedWindowMs - (now - timestamps[0]))
      : 0,
  };
}
