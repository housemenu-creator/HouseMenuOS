import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ── Use __mocks__/firebase.ts ──────────────────────────
vi.mock("../../../lib/firebase.js");
vi.mock("../../../lib/logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { mockGet, mockSet, mockUpdate, mockPush } from "../../../lib/firebase.js";

const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
globalThis.fetch = mockFetch;

function ok(exists = true, data: any = {}) {
  return { exists: () => exists, val: () => data };
}

beforeEach(() => {
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

type ExecuteFn = (args: Record<string, any>, branchId: string) => Promise<any>;

function tool(name: string, tools: any[]): ExecuteFn {
  const t = tools.find((x: any) => x.name === name);
  if (!t) throw new Error(`Tool "${name}" not found`);
  return t.execute.bind(t);
}

// ─────────────────────────────────────────────────────────
// ORDERS TOOLS
// ─────────────────────────────────────────────────────────
describe("ordersTools", () => {
  let ordersTools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockPush.mockReset(() => ({ key: "test-id-001" }));
    const mod = await import("../orders.js");
    ordersTools = mod.ordersTools;
  });

  describe("crear_pedido", () => {
    it("creates an order successfully", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "prod-1": { name: "Lomo Saltado", base_price: 28, price: 28, available: true },
      }));
      const exec = tool("crear_pedido", ordersTools);
      const res = await exec({
        cliente: "Carlos", items: [{ name: "Lomo Saltado", quantity: 2 }],
        tipo: "delivery",
      }, "test-branch");
      expect(res.success).toBe(true);
      expect(res.data.orderId).toBe("test-id-001");
      expect(mockSet).toHaveBeenCalled();
    });

    it("returns error when catalog not found", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("crear_pedido", ordersTools);
      const res = await exec({ cliente: "Test", items: [{ name: "X" }] }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("menú no está disponible");
    });

    it("returns error when item not in menu", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "prod-1": { name: "Arroz", base_price: 10 },
      }));
      const exec = tool("crear_pedido", ordersTools);
      const res = await exec({ cliente: "Test", items: [{ name: "Pizza" }] }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("No encontré");
    });

    it("returns error when no items could be parsed", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "prod-1": { name: "Arroz", base_price: 10 },
      }));
      const exec = tool("crear_pedido", ordersTools);
      const res = await exec({ cliente: "Test", items: [] }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("No se pudo identificar");
    });
  });

  describe("consultar_pedido", () => {
    it("returns order details", async () => {
      mockGet.mockResolvedValue(ok(true, {
        cliente: "Ana", status: "recibido", total: 45,
        items: [{ name: "Tallarín", quantity: 1, price: 22 }],
        metodo_pago: "efectivo", tipo: "delivery",
      }));
      const exec = tool("consultar_pedido", ordersTools);
      const res = await exec({ id: "order-1" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Ana");
    });

    it("returns error when order not found", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("consultar_pedido", ordersTools);
      const res = await exec({ id: "nonexistent" }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("No encontré");
    });
  });

  describe("cambiar_estado_pedido", () => {
    it("updates order status", async () => {
      mockGet.mockResolvedValue(ok(true, { status: "recibido" }));
      const exec = tool("cambiar_estado_pedido", ordersTools);
      const res = await exec({ id: "order-1", estado: "preparando" }, "test");
      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("rejects invalid status", async () => {
      const exec = tool("cambiar_estado_pedido", ordersTools);
      const res = await exec({ id: "order-1", estado: "invalid_status" }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("inválido");
    });

    it("rejects invalid transition", async () => {
      mockGet.mockResolvedValue(ok(true, { status: "recibido" }));
      const exec = tool("cambiar_estado_pedido", ordersTools);
      const res = await exec({ id: "order-1", estado: "entregado" }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Transición inválida");
    });
  });

  describe("ver_pendientes_cocina", () => {
    it("shows pending kitchen orders", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, {
          "ord-1": { cliente: "Test", total: 30, items: [{ name: "Plato", quantity: 1 }] },
        }))
        .mockResolvedValueOnce(ok(false));
      const exec = tool("ver_pendientes_cocina", ordersTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
    });

    it("shows empty when no pending orders", async () => {
      mockGet
        .mockResolvedValueOnce(ok(false))
        .mockResolvedValueOnce(ok(false));
      const exec = tool("ver_pendientes_cocina", ordersTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("No hay pedidos pendientes");
    });
  });

  describe("consultar_pedidos", () => {
    it("filters by date and returns summary", async () => {
      const today = new Date().toISOString();
      mockGet.mockResolvedValue(ok(true, {
        "o1": { cliente: "Ana", status: "entregado", total: 50, items: [{ name: "P1" }], createdAt: today },
      }));
      const exec = tool("consultar_pedidos", ordersTools);
      const res = await exec({ desde: "hoy" }, "test");
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(1);
    });

    it("returns empty when no orders", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("consultar_pedidos", ordersTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("No hay pedidos");
    });
  });

  describe("cancelar_pedido", () => {
    it("cancels an existing order", async () => {
      mockGet.mockResolvedValue(ok(true, { status: "recibido" }));
      const exec = tool("cancelar_pedido", ordersTools);
      const res = await exec({ id: "order-1", motivo: "Cliente canceló" }, "test");
      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns error when order not found", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("cancelar_pedido", ordersTools);
      const res = await exec({ id: "nonexistent" }, "test");
      expect(res.success).toBe(false);
    });
  });

  describe("ordenes_stats_hoy", () => {
    it("returns today stats with data", async () => {
      const today = new Date().toISOString();
      mockGet.mockResolvedValue(ok(true, {
        "o1": { cliente: "A", status: "entregado", total: 100, items: [], metodo_pago: "efectivo", createdAt: today },
      }));
      const exec = tool("ordenes_stats_hoy", ordersTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.data.totalOrders).toBe(1);
    });

    it("returns empty when no orders today", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("ordenes_stats_hoy", ordersTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.data.totalOrders).toBe(0);
    });
  });

  describe("ordenes_stats_semana", () => {
    it("returns weekly stats with breakdown", async () => {
      const today = new Date().toISOString().split("T")[0];
      mockGet.mockResolvedValue(ok(true, {
        "o1": { cliente: "A", status: "entregado", total: 100, items: [], createdAt: today + "T12:00:00Z" },
      }));
      const exec = tool("ordenes_stats_semana", ordersTools);
      const res = await exec({ dias: "7" }, "test");
      expect(res.success).toBe(true);
      expect(res.data.totalOrders).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────
// MENU TOOLS
// ─────────────────────────────────────────────────────────
describe("menuTools", () => {
  let menuTools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockPush.mockReset(() => ({ key: "test-id-001" }));
    const mod = await import("../menu.js");
    menuTools = mod.menuTools;
  });

  describe("ver_menu", () => {
    it("returns available products grouped by category", async () => {
      mockGet.mockResolvedValue(ok(true, {
        products: {
          "p1": { name: "Lomo", base_price: 28, available: true, category: "Platos" },
          "p2": { name: "Ceviche", price: 32, available: true, category: "Entradas" },
        },
      }));
      const exec = tool("ver_menu", menuTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Lomo");
    });

    it("filters by category", async () => {
      mockGet.mockResolvedValue(ok(true, {
        products: {
          "p1": { name: "Lomo", base_price: 28, available: true, category: "Platos" },
        },
      }));
      const exec = tool("ver_menu", menuTools);
      const res = await exec({ categoria: "Platos" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Lomo");
    });

    it("returns error when menu not available", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("ver_menu", menuTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(false);
    });
  });

  describe("buscar_producto", () => {
    it("finds product by name", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "p1": { name: "Lomo Saltado", base_price: 28, description: "Delicioso lomo" },
      }));
      const exec = tool("buscar_producto", menuTools);
      const res = await exec({ q: "lomo" }, "test");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("returns no results for missing product", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "p1": { name: "Arroz", base_price: 10 },
      }));
      const exec = tool("buscar_producto", menuTools);
      const res = await exec({ q: "pizza" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("No encontré");
    });
  });

  describe("toggle_disponible", () => {
    it("enables a product", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Lomo" } }));
      const exec = tool("toggle_disponible", menuTools);
      const res = await exec({ nombre: "Lomo", disponible: "si" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("disponible");
    });

    it("disables a product", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Lomo" } }));
      const exec = tool("toggle_disponible", menuTools);
      const res = await exec({ nombre: "Lomo", disponible: "no" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("no disponible");
    });

    it("returns error when product not found", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Arroz" } }));
      const exec = tool("toggle_disponible", menuTools);
      const res = await exec({ nombre: "Pizza", disponible: "si" }, "test");
      expect(res.success).toBe(false);
    });
  });

  describe("actualizar_precio", () => {
    it("updates product price", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Lomo", base_price: 25 } }));
      const exec = tool("actualizar_precio", menuTools);
      const res = await exec({ nombre: "Lomo", precio: "30" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("30.00");
    });
  });

  describe("crear_producto", () => {
    it("creates a new product", async () => {
      const exec = tool("crear_producto", menuTools);
      const res = await exec({ nombre: "Nuevo Plato", precio: "25", categoria: "Platos" }, "test");
      expect(res.success).toBe(true);
      expect(mockPush).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────
// INVENTORY TOOLS
// ─────────────────────────────────────────────────────────
describe("inventoryTools", () => {
  let inventoryTools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockPush.mockReset(() => ({ key: "mov-id-001" }));
    const mod = await import("../inventory.js");
    inventoryTools = mod.inventoryTools;
  });

  describe("ver_stock", () => {
    it("shows stock with tracked products", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "p1": { name: "Arroz", trackStock: true, stock: 10 },
        "p2": { name: "Fideo", trackStock: false },
      }));
      const exec = tool("ver_stock", inventoryTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Arroz");
    });
  });

  describe("ajustar_stock", () => {
    it("adjusts stock up", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Arroz", stock: 10 } }));
      const exec = tool("ajustar_stock", inventoryTools);
      const res = await exec({ nombre: "Arroz", cantidad: "5", motivo: "compra" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("→ 15");
    });

    it("adjusts stock down", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Arroz", stock: 10 } }));
      const exec = tool("ajustar_stock", inventoryTools);
      const res = await exec({ nombre: "Arroz", cantidad: "-3" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("→ 7");
    });
  });

  describe("alertas_stock_bajo", () => {
    it("shows low stock alerts", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "p1": { name: "Arroz", trackStock: true, stock: 2 },
        "p2": { name: "Fideo", trackStock: true, stock: 20 },
      }));
      const exec = tool("alertas_stock_bajo", inventoryTools);
      const res = await exec({ limite: "5" }, "test");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });
  });

  describe("registrar_movimiento", () => {
    it("registers a movement", async () => {
      mockGet.mockResolvedValue(ok(true, { "p1": { name: "Arroz", stock: 10 } }));
      const exec = tool("registrar_movimiento", inventoryTools);
      const res = await exec({ nombre: "Arroz", tipo: "entrada", cantidad: "5", motivo: "conteo" }, "test");
      expect(res.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────
// DELIVERY TOOLS
// ─────────────────────────────────────────────────────────
describe("deliveryTools", () => {
  let deliveryTools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockPush.mockReset(() => ({ key: "zone-id-001" }));
    const mod = await import("../delivery.js");
    deliveryTools = mod.deliveryTools;
  });

  describe("calcular_costo_zona", () => {
    it("calculates delivery cost for a zone", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "z1": { name: "Centro", fee: 7, active: true, keywords: "centro,plaza", estimatedMinutes: 30 },
      }));
      const exec = tool("calcular_costo_zona", deliveryTools);
      const res = await exec({ direccion: "Av. Principal 123, centro" }, "test");
      expect(res.success).toBe(true);
      expect(res.data.fee).toBe(7);
    });

    it("applies free threshold", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "z1": { name: "Centro", fee: 7, freeThreshold: 50, active: true, keywords: "centro" },
      }));
      const exec = tool("calcular_costo_zona", deliveryTools);
      const res = await exec({ direccion: "centro", subtotal: "60" }, "test");
      expect(res.success).toBe(true);
      expect(res.data.fee).toBe(0);
    });

    it("returns error when no zones", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("calcular_costo_zona", deliveryTools);
      const res = await exec({ direccion: "test" }, "test");
      expect(res.success).toBe(false);
    });
  });

  describe("ver_repartidores", () => {
    it("lists drivers", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "d1": { name: "Juan", available: true, vehicle: "Moto", active: true },
        "d2": { name: "Pedro", available: false, active: true, totalDeliveries: 5 },
      }));
      const exec = tool("ver_repartidores", deliveryTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.data.available).toHaveLength(1);
    });
  });

  describe("asignar_repartidor", () => {
    it("assigns a driver", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, { "d1": { name: "Juan", available: true } }))
        .mockResolvedValueOnce(ok(true, { status: "recibido" }));
      const exec = tool("asignar_repartidor", deliveryTools);
      const res = await exec({ pedido_id: "order-1", repartidor_nombre: "Juan" }, "test");
      expect(res.success).toBe(true);
    });
  });

  describe("crear_zona_delivery", () => {
    it("creates a delivery zone", async () => {
      const exec = tool("crear_zona_delivery", deliveryTools);
      const res = await exec({ nombre: "Norte", costo: "8", tiempo_estimado: "25" }, "test");
      expect(res.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────
// CAJA TOOLS
// ─────────────────────────────────────────────────────────
describe("cajaTools", () => {
  let cajaTools: any[];
  beforeEach(async () => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockPush.mockReset(() => ({ key: "ses-id-001" }));
    const mod = await import("../caja.js");
    cajaTools = mod.cajaTools;
  });

  describe("resumen_dia", () => {
    it("shows daily summary", async () => {
      const today = new Date().toISOString().split("T")[0];
      mockGet.mockResolvedValue(ok(true, {
        "o1": { cliente: "A", status: "entregado", total: 100, metodo_pago: "efectivo", createdAt: today + "T12:00:00Z" },
      }));
      const exec = tool("resumen_dia", cajaTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(100);
    });
  });

  describe("abrir_turno", () => {
    it("opens a cash session", async () => {
      mockGet.mockResolvedValue(ok(false));
      const exec = tool("abrir_turno", cajaTools);
      const res = await exec({ monto_inicial: "200", encargado: "Juan" }, "test");
      expect(res.success).toBe(true);
    });

    it("rejects when session already open", async () => {
      mockGet.mockResolvedValue(ok(true, {
        "s1": { status: "open", openTime: "2025-01-01" },
      }));
      const exec = tool("abrir_turno", cajaTools);
      const res = await exec({ monto_inicial: "200", encargado: "Juan" }, "test");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Ya hay un turno abierto");
    });
  });

  describe("cerrar_turno", () => {
    it("closes an open session", async () => {
      mockGet
        .mockResolvedValueOnce(ok(true, {
          "s1": { status: "open", openTime: "2025-01-01T00:00:00Z", initialAmount: 200 },
        }))
        .mockResolvedValueOnce(ok(true, {
          "o1": { total: 600, status: "entregado", createdAt: "2025-01-01T06:00:00Z" },
        }));
      const exec = tool("cerrar_turno", cajaTools);
      const res = await exec({ monto_final: "850" }, "test");
      expect(res.success).toBe(true);
      expect(res.message).toContain("CERRADO");
    });
  });

  describe("ventas_por_metodo", () => {
    it("shows sales by payment method", async () => {
      const today = new Date().toISOString().split("T")[0];
      mockGet.mockResolvedValue(ok(true, {
        "o1": { total: 100, metodo_pago: "efectivo", status: "entregado", createdAt: today + "T12:00:00Z" },
        "o2": { total: 50, metodo_pago: "tarjeta", status: "entregado", createdAt: today + "T13:00:00Z" },
      }));
      const exec = tool("ventas_por_metodo", cajaTools);
      const res = await exec({}, "test");
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(150);
    });
  });
});
