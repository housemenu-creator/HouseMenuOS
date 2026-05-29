const counters = new Map<string, { timestamps: number[]; expiresAt: number }>();

const MAX_MSG = 5;
const WINDOW_MS = 10000;
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (now > entry.expiresAt) counters.delete(key);
  }
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanExpired();
    lastCleanup = now;
  }

  const entry = counters.get(key);
  const timestamps = entry ? entry.timestamps.filter((t) => now - t < WINDOW_MS) : [];
  if (timestamps.length >= MAX_MSG) return false;
  timestamps.push(now);
  counters.set(key, { timestamps, expiresAt: now + CLEANUP_INTERVAL * 2 });
  return true;
}
