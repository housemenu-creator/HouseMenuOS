import { describe, it, expect, vi } from "vitest";
import { retry } from "./retry.js";

describe("retry", () => {
  it("resolves with the result on success", async () => {
    const result = await retry(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("retries on failure and succeeds", async () => {
    let attempts = 0;
    const fn = vi.fn(() => {
      attempts++;
      if (attempts < 3) return Promise.reject(new Error("fail"));
      return Promise.resolve("ok");
    });

    const result = await retry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after max attempts exhausted", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("persistent")));

    await expect(retry(fn, { maxAttempts: 2 })).rejects.toThrow("persistent");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses custom maxAttempts", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("nope")));

    await expect(retry(fn, { maxAttempts: 1 })).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry with attempt number and error", async () => {
    let attempts = 0;
    const onRetry = vi.fn();
    const fn = vi.fn(() => {
      attempts++;
      if (attempts < 2) return Promise.reject(new Error("retry-me"));
      return Promise.resolve("done");
    });

    await retry(fn, { maxAttempts: 3, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ message: "retry-me" }));
  });

  it("wraps non-Error throwables in Error", async () => {
    const fn = vi.fn(() => Promise.reject("string error"));

    await expect(retry(fn, { maxAttempts: 1 })).rejects.toThrow("string error");
  });

  it("uses default baseDelayMs and maxDelayMs", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("timeout-test")));

    const start = Date.now();
    await expect(retry(fn, { maxAttempts: 2 })).rejects.toThrow("timeout-test");
    const elapsed = Date.now() - start;

    // baseDelayMs=1000 for first retry, should be at least 1000ms
    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  it("respects baseDelayMs option", async () => {
    const fn = vi.fn(() => Promise.reject(new Error("slow")));

    const start = Date.now();
    await expect(retry(fn, { maxAttempts: 3, baseDelayMs: 200 })).rejects.toThrow("slow");
    const elapsed = Date.now() - start;

    // Total: 200 + 400 = 600ms minimum (not counting third attempt)
    expect(elapsed).toBeGreaterThanOrEqual(500);
  });

  it("caps delay at maxDelayMs", { timeout: 5000 }, async () => {
    const fn = vi.fn(() => Promise.reject(new Error("cap")));
    const onRetry = vi.fn();

    const start = Date.now();
    await expect(retry(fn, { maxAttempts: 3, baseDelayMs: 5000, maxDelayMs: 500, onRetry })).rejects.toThrow("cap");
    const elapsed = Date.now() - start;

    // Delays: 500 + 500 = ~1000ms (both capped)
    expect(elapsed).toBeGreaterThanOrEqual(400);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("works with synchronous resolve", async () => {
    const result = await retry(() => Promise.resolve(true));
    expect(result).toBe(true);
  });

  it("preserves the result type", async () => {
    const data = { id: 1, name: "test" };
    const result = await retry(() => Promise.resolve(data));
    expect(result).toEqual(data);
    expect(result.name).toBe("test");
  });
});
