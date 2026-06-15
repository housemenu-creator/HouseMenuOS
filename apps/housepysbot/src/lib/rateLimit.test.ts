import { describe, it, expect } from "vitest";
import { checkRateLimit, getRateLimitStats, resetRateLimit } from "./rateLimit.js";

describe("rateLimit", () => {
  describe("checkRateLimit", () => {
    it("allows first request", () => {
      const key = `test:user1:atencion`;
      resetRateLimit(key);
      expect(checkRateLimit(key)).toBe(true);
    });

    it("allows up to burst limit for atencion", () => {
      const key = `test:burst:atencion`;
      resetRateLimit(key);

      // 5 requests should be allowed (burst limit for atencion)
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
    });

    it("blocks after burst limit for atencion", () => {
      const key = `test:burstblock:atencion`;
      resetRateLimit(key);

      // Use up burst (5 requests)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key);
      }

      // 6th should be blocked
      expect(checkRateLimit(key)).toBe(false);
    });

    it("allows more requests for admin", () => {
      const key = `test:burstadmin:admin`;
      resetRateLimit(key);

      // Admin burst limit is 30, so 10 requests should be fine
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
    });

    it("uses default limits for unknown agent type", () => {
      const key = `test:unknown:unknown_agent`;
      resetRateLimit(key);

      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
      expect(checkRateLimit(key)).toBe(false);
    });

    it("handles plain keys without agent prefix", () => {
      const key = `some-plain-key`;
      resetRateLimit(key);

      // Falls back to "atencion" limits
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
      expect(checkRateLimit(key)).toBe(false);
    });
  });

  describe("getRateLimitStats", () => {
    it("returns null for unknown key", () => {
      expect(getRateLimitStats("nonexistent:key:admin")).toBeNull();
    });

    it("returns stats after requests", () => {
      const key = `test:stats:atencion`;
      resetRateLimit(key);
      checkRateLimit(key);

      const stats = getRateLimitStats(key);
      expect(stats).not.toBeNull();
      expect(stats!.burstUsed).toBe(1);
      expect(stats!.burstMax).toBe(5);
      expect(stats!.sustainedMax).toBe(20);
    });

    it("shows limited=true when burst exceeded", () => {
      const key = `test:statslimited:atencion`;
      resetRateLimit(key);

      for (let i = 0; i < 5; i++) checkRateLimit(key);

      const stats = getRateLimitStats(key);
      expect(stats?.limited).toBe(true);
    });
  });

  describe("resetRateLimit", () => {
    it("resets the limit counter", () => {
      const key = `test:reset:atencion`;
      resetRateLimit(key);

      // Exhaust limit
      for (let i = 0; i < 5; i++) checkRateLimit(key);
      expect(checkRateLimit(key)).toBe(false);

      // Reset
      resetRateLimit(key);
      expect(checkRateLimit(key)).toBe(true);
    });
  });
});
