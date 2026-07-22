import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/firebase.js");
vi.mock("../../../lib/logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { mockGet, mockSet, mockUpdate, mockPush } from "../../../lib/firebase.js";

function ok(exists = true, data: any = {}) {
  return { exists: () => exists, val: () => data };
}

type ExecuteFn = (args: Record<string, any>, branchId: string) => Promise<any>;
function tool(name: string, tools: any[]): ExecuteFn {
  const t = tools.find((x: any) => x.name === name);
  if (!t) throw new Error(`Tool "${name}" not found`);
  return t.execute.bind(t);
}

// ─────────────────────────────────────────────────────────
// BRANCH TOOLS
// ─────────────────────────────────────────────────────────
describe("branchTools", () => {
  let tools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockUpdate.mockReset();
    const mod = await import("../branch.js");
    tools = mod.branchTools;
  });

  describe("info_restaurante", () => {
    it("shows restaurant info", async () => {
      mockGet.mockResolvedValue(ok(true, {
        name: "Mi Resto", address: "Av. Central 123", phone: "999000111",
        schedule: "Lun-Sáb 12-22", deliveryEnabled: true, deliveryFee: 7, freeThreshold: 50,
      }));
      const res = await tool("info_restaurante", tools)({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Mi Resto");
      expect(res.message).toContain("Gratis");
    });

    it("returns error when no data", async () => {
      mockGet.mockResolvedValue(ok(false));
      const res = await tool("info_restaurante", tools)({}, "branch-1");
      expect(res.success).toBe(false);
    });
  });

  describe("actualizar_horario", () => {
    it("updates schedule", async () => {
      const res = await tool("actualizar_horario", tools)({ horario: "Lun-Dom 10-23" }, "branch-1");
      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────
// SUNAT TOOLS
// ─────────────────────────────────────────────────────────
describe("sunatTools", () => {
  let tools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockPush.mockReset();
    mockPush.mockImplementation(() => ({ key: "cpe-001" }));
    const mod = await import("../sunat.js");
    tools = mod.sunatTools;
  });

  describe("generar_cpe", () => {
    it("generates invoice (factura)", async () => {
      mockGet.mockResolvedValue(ok(true, {
        cliente: "Empresa SAC", total: 236, items: [{ name: "Servicio", quantity: 1, price: 236 }],
      }));
      const res = await tool("generar_cpe", tools)({
        pedido_id: "ord-1", tipo: "factura", ruc: "20123456789", razon_social: "Empresa SAC",
      }, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data.cpeId).toBe("cpe-001");
      expect(mockSet).toHaveBeenCalled();
    });

    it("requires RUC for factura", async () => {
      const res = await tool("generar_cpe", tools)({ pedido_id: "ord-1", tipo: "factura" }, "branch-1");
      expect(res.success).toBe(false);
      expect(res.error).toContain("RUC");
    });

    it("generates receipt (boleta)", async () => {
      mockGet.mockResolvedValue(ok(true, {
        cliente: "Juan", total: 50, items: [{ name: "Plato", quantity: 1, price: 50 }],
      }));
      const res = await tool("generar_cpe", tools)({ pedido_id: "ord-1", tipo: "boleta" }, "branch-1");
      expect(res.success).toBe(true);
    });
  });

  describe("historial_cpes", () => {
    it("shows CPE history", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "c1": { tipo: "boleta", serie: "B001", numero: "00000001", total: 50, estado: "generado", createdAt: new Date().toISOString() },
      }));
      const res = await tool("historial_cpes", tools)({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(1);
    });

    it("returns empty when none", async () => {
      mockGet.mockResolvedValue(ok(false));
      const res = await tool("historial_cpes", tools)({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.message).toContain("No hay comprobantes");
    });
  });
});

// ─────────────────────────────────────────────────────────
// STAFF TOOLS
// ─────────────────────────────────────────────────────────
describe("staffTools", () => {
  let tools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    const mod = await import("../staff.js");
    tools = mod.staffTools;
  });

  describe("consultar_staff", () => {
    it("lists active employees", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, {
          "e1": { name: "Juan", role: "cocinero", phone: "999111222", email: "juan@resto.com", active: true, schedule: { lunes: { active: true, start: "08:00", end: "16:00" } } },
          "e2": { name: "Ana", role: "mozo", phone: "999333444", email: "ana@resto.com", active: true },
        }))
        .mockResolvedValueOnce(ok(true, {}));
      const res = await tool("consultar_staff", tools)({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
    });

    it("handles no employees", async () => {
      mockGet.mockResolvedValue(ok(false));
      const res = await tool("consultar_staff", tools)({}, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
    });

    it("filters by role", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, {
          "e1": { name: "Juan", role: "cocinero", active: true },
          "e2": { name: "Ana", role: "mozo", active: true },
        }))
        .mockResolvedValueOnce(ok(true, {}));
      const res = await tool("consultar_staff", tools)({ rol: "mozo" }, "branch-1");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].rol).toBe("mozo");
    });
  });
});

// ─────────────────────────────────────────────────────────
// CLIENTES TOOLS (minimal — complex internal logic)
// ─────────────────────────────────────────────────────────
describe("customerTools", () => {
  let tools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    const mod = await import("../clientes.js");
    tools = mod.customerTools;
  });

  describe("cliente_recomendar", () => {
    it("says not found for unknown phone", async () => {
      mockGet.mockResolvedValue(ok(false)); // customers ref is empty
      const res = await tool("cliente_recomendar", tools)({ telefono: "999888777" }, "branch-1");
      expect(res.success).toBe(true);
      expect(res.message).toContain("No encontré al cliente");
    });

    it("requires phone", async () => {
      const res = await tool("cliente_recomendar", tools)({}, "branch-1");
      expect(res.success).toBe(false);
      expect(res.error).toContain("teléfono");
    });
  });

  describe("cliente_buscar", () => {
    it("searches customer by phone", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, { "c1": { name: "Carlos", phone: "999888777", totalOrders: 5, totalSpent: 400 } }))
        .mockResolvedValueOnce(ok(true, { "o1": { id: "o1", total: 100, createdAt: new Date().toISOString(), items: [] } }))
        .mockResolvedValueOnce(ok(false));
      const res = await tool("cliente_buscar", tools)({ telefono: "999888777" }, "branch-1");
      expect(res.success).toBe(true);
    });
  });
});
