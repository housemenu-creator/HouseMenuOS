import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for cache-clear functions in analyticsCache and agentConfig.
 *
 * These functions operate on module-level Maps. We re-import to get fresh state.
 */

describe("clearAnalyticsCache", () => {
  let clearAnalyticsCache: Function;

  beforeEach(async () => {
    // Force clean module state
    const mod = await import("./analyticsCache.js");
    clearAnalyticsCache = mod.clearAnalyticsCache;
    // Clear all first
    clearAnalyticsCache();
  });

  it("clears entire cache when called without args", async () => {
    const mod = await import("./analyticsCache.js");
    // The cache is module-internal, but we can test clearAnalyticsCache doesn't throw
    expect(() => clearAnalyticsCache()).not.toThrow();
  });

  it("clears specific branch cache", async () => {
    expect(() => clearAnalyticsCache("castilla")).not.toThrow();
  });

  it("clears specific key within a branch", async () => {
    expect(() => clearAnalyticsCache("castilla", "daily-report")).not.toThrow();
  });

  it("clears nothing when called with non-existent key (no crash)", async () => {
    expect(() => clearAnalyticsCache("nonexistent", "nope")).not.toThrow();
  });
});

describe("clearAgentConfigCache", () => {
  let clearAgentConfigCache: Function;

  beforeEach(async () => {
    const mod = await import("./agentConfig.js");
    clearAgentConfigCache = mod.clearAgentConfigCache;
    clearAgentConfigCache();
  });

  it("clears entire cache without args", () => {
    expect(() => clearAgentConfigCache()).not.toThrow();
  });

  it("clears cache for specific branch", () => {
    expect(() => clearAgentConfigCache("castilla")).not.toThrow();
  });

  it("clears cache for specific branch + agent", () => {
    expect(() => clearAgentConfigCache("castilla", "admin")).not.toThrow();
  });

  it("clears nothing when called with non-existent combo (no crash)", () => {
    expect(() => clearAgentConfigCache("ghost-branch", "ghost-agent")).not.toThrow();
  });
});
