import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/rateLimit.js", () => ({
  getRateLimitStats: vi.fn(() => "{}"),
  resetRateLimit: vi.fn(),
  checkRateLimit: vi.fn(() => true),
}));
vi.mock("../../../lib/wa-status.js", () => ({
  getWhatsAppStatus: vi.fn(() => JSON.stringify({ status: "connected", number: "+51999123456" })),
}));
vi.mock("../../../lib/agentConfig.js", () => ({
  clearAgentConfigCache: vi.fn(),
}));

import { systemTools } from "../system.js";

type ExecuteFn = (args: Record<string, any>, branchId: string) => Promise<any>;
function tool(name: string): ExecuteFn {
  const t = systemTools.find((x: any) => x.name === name);
  if (!t) throw new Error(`Tool "${name}" not found`);
  return t.execute.bind(t);
}

describe("systemTools", () => {
  describe("sistema_estado", () => {
    it("shows system status with WhatsApp connected", async () => {
      const res = await tool("sistema_estado")({}, "test-branch");
      expect(res.success).toBe(true);
      expect(res.message).toContain("WhatsApp");
      expect(res.message).toContain("Conectado");
    });
  });

  describe("resetear_rate_limit", () => {
    it("resets a rate limit", async () => {
      const res = await tool("resetear_rate_limit")({ usuario: "tg:12345:admin" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("reseteado");
    });

    it("returns error without usuario", async () => {
      const res = await tool("resetear_rate_limit")({}, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Especificá");
    });
  });

  describe("kds_url", () => {
    it("returns KDS URL", async () => {
      const res = await tool("kds_url")({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data.url).toContain("/kds?branch=branch-1");
    });
  });
});
