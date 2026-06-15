/**
 * Retry utility — exponential backoff for Firebase operations.
 *
 * Usage:
 *   await retry(() => set(ref, data), { maxAttempts: 3 })
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  onRetry: (_attempt, _error) => {},
};

export async function retry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, onRetry } = {
    ...DEFAULTS,
    ...opts,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts) break;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      onRetry(attempt, lastError);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("Retry failed: unknown error");
}
