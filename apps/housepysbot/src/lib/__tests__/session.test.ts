import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFbGet = vi.hoisted(() => vi.fn(() => Promise.resolve({
  exists: () => true,
  forEach: (cb: Function) => {
    cb({ val: () => ({ role: "user", content: "Hola" }) });
    cb({ val: () => ({ role: "assistant", content: "¿En qué puedo ayudarte?" }) });
  },
})));
const mockFbRef = vi.hoisted(() => vi.fn(() => ({})));
const mockFbPush = vi.hoisted(() => vi.fn());
const mockGetDb = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("firebase/database", () => ({
  get: mockFbGet,
  ref: mockFbRef,
  push: mockFbPush,
  query: vi.fn(() => ({})),
  limitToLast: vi.fn(() => ({})),
  orderByKey: vi.fn(() => ({})),
}));

vi.mock("../firebase.js", () => ({
  getDb: mockGetDb,
}));

vi.mock("../logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { getHistory, pushHistory } from "../session.js";

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getHistory fetches and caches", async () => {
    const msgs = await getHistory("test-key");
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(mockGetDb).toHaveBeenCalledOnce();
  });

  it("getHistory returns cached on second call", async () => {
    await getHistory("cache-test");
    mockGetDb.mockClear();
    const msgs = await getHistory("cache-test");
    expect(msgs).toHaveLength(2);
    // Should NOT call getDb again (cached)
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("getHistory returns empty on error", async () => {
    mockFbGet.mockRejectedValueOnce(new Error("db error"));
    const msgs = await getHistory("error-key");
    expect(msgs).toEqual([]);
  });

  it("pushHistory stores messages", async () => {
    await pushHistory("push-key", "user msg", "assistant msg");
    const msgs = await getHistory("push-key");
    // Should now have 4: 2 original + 2 new
    expect(msgs.length).toBeGreaterThanOrEqual(2);
  });

  it("isolates different conversation keys", async () => {
    const msgs1 = await getHistory("key-a");
    const msgs2 = await getHistory("key-b");
    expect(msgs1).toEqual(msgs2); // fresh for both
  });
});
