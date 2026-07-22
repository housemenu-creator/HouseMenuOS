import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted mock variables — accessible in factory AND test assertions
const { mockSet, mockPush, mockChild, mockRef, mockInitFirebase } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockPush: vi.fn(() => ({ key: "mock-order-key" })),
  mockChild: vi.fn(() => ({})),
  mockRef: vi.fn(),
  mockInitFirebase: vi.fn(() => ({})),
}));

vi.mock("../lib/branch.js", () => ({
  getAllBranchIds: () => ["castilla", "default"],
}));

vi.mock("../lib/firebase.js", () => ({
  ref: mockRef,
  child: mockChild,
  push: mockPush,
  set: mockSet,
  initFirebase: mockInitFirebase,
}));

type WH = typeof import("./webhooks.js");
let webhooks: WH;

beforeEach(async () => {
  vi.clearAllMocks();
  webhooks = await import("./webhooks.js");
});

describe("normalizeProviderOrder", () => {
  it("normalizes Rappi payload", () => {
    const result = webhooks.normalizeProviderOrder("rappi", {
      order: {
        id: "rappi-123",
        customer: { name: "Carlos", phone: "+51999000011" },
        items: [{ id: "p1", name: "Lomo Saltado", quantity: 2, price: 25 }],
        delivery_address: "Av. Principal 123",
        instructions: "Sin cebolla",
      },
    });
    expect(result).toMatchObject({
      cliente: "Carlos",
      telefono: "+51999000011",
      items: [{ name: "Lomo Saltado", quantity: 2, price: 25 }],
      direccion: "Av. Principal 123",
      nota: "Sin cebolla",
      provider: "rappi",
      providerOrderId: "rappi-123",
    });
  });

  it("normalizes PedidosYa payload", () => {
    const result = webhooks.normalizeProviderOrder("pedidos_ya", {
      order: {
        id: "py-456",
        delivery: {
          customer: { name: "María", phone: "+51999000022" },
          address: "Jr. Las Flores 456",
        },
        items: [{ id: "p2", title: "Ceviche", quantity: 1, unit_price: 32 }],
        instructions: "Con hielo",
      },
    });
    expect(result).toMatchObject({
      cliente: "María",
      telefono: "+51999000022",
      items: [{ name: "Ceviche", quantity: 1, price: 32 }],
      provider: "pedidos_ya",
    });
  });

  it("normalizes Uber payload", () => {
    const result = webhooks.normalizeProviderOrder("uber", {
      order: {
        id: "uber-789",
        delivery: {
          customer: { name: "José", phone: "+51999000033" },
          location: { address: "Av. Central 789" },
        },
        cart: {
          items: [{ product_name: "Pizza", quantity: 1, price_amount: 45 }],
        },
        instructions: "Tocá timbre",
      },
    });
    expect(result).toMatchObject({
      cliente: "José",
      telefono: "+51999000033",
      items: [{ name: "Pizza", quantity: 1, price: 45 }],
      provider: "uber_eats",
    });
  });

  it("handles unknown provider gracefully", () => {
    const result = webhooks.normalizeProviderOrder("unknown_provider", {
      order: { id: "x", cliente: "Test", items: [] },
    });
    expect(result).not.toBeNull();
    expect(result.provider).toBe("unknown_provider");
  });

  it("returns null for completely unrecognized payload", () => {
    const result = webhooks.normalizeProviderOrder("random", {
      order: { foo: "bar" },
    });
    expect(result).toBeNull();
  });
});

describe("handleWebhook", () => {
  it("returns error for unknown branch", async () => {
    const result = await webhooks.handleWebhook("rappi", "nonexistent", {
      order: { id: "1", items: [] },
    });
    expect(result).toEqual({
      success: false,
      error: 'Sucursal "nonexistent" no válida para webhook',
    });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("returns error for unrecognized provider with no items/cliente", async () => {
    // Unknown provider + payload without items or cliente = unparseable
    const result = await webhooks.handleWebhook("unknown_provider", "castilla", {
      order: { foo: "bar" },
    });
    expect(result).toEqual({
      success: false,
      error: "Payload no reconocido",
    });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("processes valid webhook successfully", async () => {
    const result = await webhooks.handleWebhook("rappi", "castilla", {
      order: {
        id: "wh-001",
        customer: { name: "Test" },
        items: [{ name: "Arroz con Pollo", quantity: 1, price: 28 }],
        delivery_address: "Calle 123",
      },
    });
    expect(result.success).toBe(true);
    expect(result.dedup).toBeUndefined();

    // processWebhookOrder is fire-and-forget (not awaited inside handleWebhook),
    // so we wait a tick for it to execute
    await new Promise((r) => setTimeout(r, 50));
    expect(mockChild).toHaveBeenCalled();
    expect(mockRef).toHaveBeenCalled();
  });

  it("deduplicates same webhook", async () => {
    const payload = {
      order: {
        id: "wh-dedup-001",
        customer: { name: "Dup" },
        items: [{ name: "Producto", quantity: 1, price: 10 }],
      },
    };
    const first = await webhooks.handleWebhook("rappi", "castilla", payload);
    expect(first.success).toBe(true);

    // Reset call counts to verify second call doesn't write
    vi.clearAllMocks();

    const second = await webhooks.handleWebhook("rappi", "castilla", payload);
    expect(second.dedup).toBe(true);
    expect(second.success).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("re-imports firebase module (dynamic import) on each call", async () => {
    // Just verify the flow completes without error
    const result = await webhooks.handleWebhook("pedidos_ya", "default", {
      order: {
        id: "wh-002",
        delivery: { customer: { name: "Ana" } },
        items: [{ name: "Producto", quantity: 1, price: 15 }],
      },
    });
    expect(result.success).toBe(true);
  });
});
