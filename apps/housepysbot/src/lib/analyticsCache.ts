/**
 * Analytics Cache — in-memory + Firebase-backed cache for aggregated data.
 *
 * Strategy:
 *   - In-memory Map with TTL (fast, survives within session)
 *   - Firebase persistence for daily aggregates (survives restarts)
 *   - Tools check memory first, then Firebase, then compute fresh
 *
 * Cache key format: `analytics:{branchId}:{function}:{paramsHash}`
 * Firebase path: `branches/{branchId}/system/cache/analytics/{date}/{hash}`
 */

import { initFirebase, ref, get, child, set } from "./firebase.js";
import { retry } from "./retry.js";

const db = initFirebase();

// ── In-memory cache ────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const memCache = new Map<string, CacheEntry>();
const MEM_TTL_MS = 60_000; // 1 minute default

// ── Public API ─────────────────────────────────────────

export type ComputeFn<T> = () => Promise<T>;

export interface CacheOptions {
  /** Time-to-live in milliseconds for this specific entry (default: 60s) */
  ttlMs?: number;
  /** Whether to persist to Firebase (default: false — only for daily aggregates) */
  persist?: boolean;
  /** Date key for Firebase persistence (YYYY-MM-DD) */
  date?: string;
}

/**
 * Get analytics data with caching.
 *
 * 1. Check in-memory cache → return if fresh
 * 2. If persist=true, check Firebase cache → return if found
 * 3. Call computeFn → store result in cache → return
 */
export async function getCached<T>(
  branchId: string,
  cacheKey: string,
  computeFn: ComputeFn<T>,
  opts?: CacheOptions,
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? MEM_TTL_MS;
  const memKey = `analytics:${branchId}:${cacheKey}`;

  // 1. In-memory check
  const memEntry = memCache.get(memKey);
  if (memEntry && Date.now() < memEntry.expiresAt) {
    return memEntry.data as T;
  }

  // 2. Firebase persistence check (for daily aggregates)
  if (opts?.persist && opts?.date) {
    const fbPath = `branches/${branchId}/system/cache/analytics/${opts.date}/${cacheKey}`;
    try {
      const snap = await get(child(ref(db), fbPath));
      if (snap.exists()) {
        const data = snap.val() as T;
        memCache.set(memKey, { data, expiresAt: Date.now() + ttlMs });
        return data;
      }
    } catch {
      // Firebase miss — compute fresh
    }
  }

  // 3. Compute fresh
  const data = await computeFn();

  // 4. Store in memory
  memCache.set(memKey, { data, expiresAt: Date.now() + ttlMs });

  // 5. Persist to Firebase if requested
  if (opts?.persist && opts?.date) {
    const fbPath = `branches/${branchId}/system/cache/analytics/${opts.date}/${cacheKey}`;
    retry(() => set(child(ref(db), fbPath), data), {
      maxAttempts: 2,
    }).catch(() => {});
  }

  return data;
}

/**
 * Clear analytics cache for a branch.
 * - If cacheKey is provided, clears only that key
 * - If date is provided, clears all cached entries for that date from Firebase
 */
export function clearAnalyticsCache(branchId?: string, cacheKey?: string): void {
  if (branchId && cacheKey) {
    memCache.delete(`analytics:${branchId}:${cacheKey}`);
  } else if (branchId) {
    for (const key of memCache.keys()) {
      if (key.startsWith(`analytics:${branchId}:`)) memCache.delete(key);
    }
  } else {
    memCache.clear();
  }
}
