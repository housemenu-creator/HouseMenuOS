import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import supertest from "supertest";

// ── Hoisted mocks for Firebase + Branch + Webhook ────────────
const { mockGet, mockSet, mockUpdate, mockPush, mockChild, mockRef, mockInitFirebase } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockUpdate: vi.fn(),
  mockPush: vi.fn(() => ({ key: "test-order-001" })),
  mockChild: vi.fn(() => ({})),
  mockRef: vi.fn(),
  mockInitFirebase: vi.fn(() => ({})),
}));

const { mockHandleWebhook } = vi.hoisted(() => ({
  mockHandleWebhook: vi.fn(),
}));

const mockFetch = vi.hoisted(() => vi.fn());
globalThis.fetch = mockFetch;

vi.mock("../lib/branch.js", () => ({
  getAllBranchIds: () => ["castilla", "default"],
  getBranchInfo: vi.fn(),
}));

vi.mock("../lib/firebase.js", () => ({
  ref: mockRef,
  child: mockChild,
  push: mockPush,
  set: mockSet,
  get: mockGet,
  update: mockUpdate,
  initFirebase: mockInitFirebase,
}));

vi.mock("./webhooks.js", () => ({
  handleWebhook: mockHandleWebhook,
}));

async function getApp() {
  const { createApp } = await import("./http-server.js");
  return createApp();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FIREBASE_API_KEY", "test-api-key");

  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      users: [{ localId: "test-uid", providerUserInfo: [{ providerId: "anonymous" }] }],
    }),
  });

  mockGet.mockResolvedValue({
    exists: () => true,
    val: () => ({ status: "recibido", customerName: "Test" }),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function authHeader() {
  return { Authorization: "Bearer test-firebase-token" };
}

// ── GET /health ─────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with status info", async () => {
    const app = await getApp();
    const res = await supertest(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.branches).toEqual(["castilla", "default"]);
  });
});

// ── POST /api/orders ────────────────────────────────────────
describe("POST /api/orders", () => {
  it("returns 401 without auth token", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .send({ branchId: "castilla", customerName: "Test", items: [{ name: "Producto", price: 10 }] });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when items missing", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "castilla", customerName: "Test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("item");
  });

  it("returns 400 when items is not an array", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "castilla", customerName: "Test", items: "not-an-array" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("item");
  });

  it("returns 400 when customerName missing", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "castilla", items: [{ name: "Producto", price: 10 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("nombre");
  });

  it("returns 400 for too many items (over 50)", async () => {
    const app = await getApp();
    const items = Array.from({ length: 51 }, (_, i) => ({ name: `Item ${i}`, price: 10 }));
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "castilla", customerName: "Test", items });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Demasiados");
  });

  it("returns 400 for invalid branchId", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "nonexistent", customerName: "Test", items: [{ name: "Producto", price: 10 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("válida");
  });

  it("creates order successfully", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({
        branchId: "castilla",
        customerName: "Carlos",
        customerPhone: "+51999000099",
        items: [{ name: "Lomo Saltado", quantity: 2, price: 25 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe("test-order-001");

    // Route uses fb.push() to get orderId + fb.update() for multi-path write
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

// ── POST /api/orders/:orderId/status ──────────────────────
describe("POST /api/orders/:orderId/status", () => {
  it("returns 401 without auth token", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders/test-order-001/status")
      .send({ branchId: "castilla", status: "preparando" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status value", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders/test-order-001/status")
      .set(authHeader())
      .send({ branchId: "castilla", status: "invalid_status" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("no válido");
  });

  it("updates order status for valid transition (recibido → preparando)", async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders/test-order-001/status")
      .set(authHeader())
      .send({ branchId: "castilla", status: "preparando" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 400 for invalid transition (entregado → preparando)", async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      exists: () => true,
      val: () => ({ status: "entregado", customerName: "Test" }),
    });

    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders/test-order-001/status")
      .set(authHeader())
      .send({ branchId: "castilla", status: "preparando" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Transición");
  });

  it("returns 404 for non-existent order", async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      exists: () => false,
    });

    const app = await getApp();
    const res = await supertest(app)
      .post("/api/orders/test-order-001/status")
      .set(authHeader())
      .send({ branchId: "castilla", status: "cancelado" });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("no encontrado");
  });
});

// ── POST /api/webhooks/:provider ──────────────────────────
describe("POST /api/webhooks/:provider", () => {
  it("delegates to handleWebhook with provider and branch", async () => {
    mockHandleWebhook.mockResolvedValue({ success: true });
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/webhooks/rappi?branch=castilla")
      .send({ order: { id: "ext-1", items: [{ name: "Pizza", price: 30 }] } });
    expect(res.status).toBe(202);
    expect(mockHandleWebhook).toHaveBeenCalledWith("rappi", "castilla", expect.any(Object));
  });

  it("returns 400 when handleWebhook returns error", async () => {
    mockHandleWebhook.mockResolvedValue({ success: false, error: "Payload no reconocido" });
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/webhooks/unknown?branch=castilla")
      .send({ something: "weird" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Payload no reconocido");
  });

  it("returns 200 with dedup flag when webhook is a duplicate", async () => {
    mockHandleWebhook.mockResolvedValue({ success: true, dedup: true });
    const app = await getApp();
    const res = await supertest(app)
      .post("/api/webhooks/rappi?branch=castilla")
      .send({ order: { id: "dup-1" } });
    expect(res.status).toBe(200);
    expect(res.body.dedup).toBe(true);
  });
});

// ── Rate limiting (last — rateLimitMap is module-level) ──
describe("POST /api/orders rate limiting", () => {
  it("returns 429 after total 31 requests in a minute", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const app = await getApp();

    // Previous tests consumed some shared rateLimitMap slots.
    // Send enough to guarantee exhaustion, then check the last.
    for (let i = 0; i < 31; i++) {
      const r = await supertest(app)
        .post("/api/orders")
        .set(authHeader())
        .send({ branchId: "castilla", customerName: "Spam", items: [{ name: "X", price: 1 }] });
      // Don't assert status — earlier requests may hit 429 if pool was smaller
    }

    // Next request should be rate limited
    const r = await supertest(app)
      .post("/api/orders")
      .set(authHeader())
      .send({ branchId: "castilla", customerName: "Spam", items: [{ name: "X", price: 1 }] });
    expect(r.status).toBe(429);
    expect(r.body.error).toContain("Demasiados");
  });
});
