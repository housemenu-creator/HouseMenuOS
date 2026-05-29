import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory store factory — each getStore() returns fresh state
function createStore() {
  const data = {};
  return {
    get: (path) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (const p of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[p];
      }
      return cur;
    },
    set: (path, val) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    del: (path) => {
      const parts = path.split('/').filter(Boolean);
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) return;
        cur = cur[parts[i]];
      }
      delete cur[parts[parts.length - 1]];
    },
    seedProducts: (branchId) => {
      data.branches = {
        [branchId]: {
          catalog: {
            products: {
              p1: { name: 'Lomo Saltado', price: 28, trackStock: true, stock: 10, available: true },
              p2: { name: 'Ceviche', price: 32, trackStock: true, stock: 5, available: true },
              p3: { name: 'Chicha', price: 8, trackStock: false, stock: 999, available: true },
            },
          },
        },
      };
    },
  };
}

let store;
let pushCounter;

vi.mock('firebase/database', () => {
  // These will be reset by reassignment in beforeEach
  const mocks = {};
  return {
    getDatabase: vi.fn(() => ({})),
    ref: vi.fn((_db, path) => {
      const curRef = { path };
      mocks._lastRef = curRef;
      return curRef;
    }),
    push: vi.fn((parentRef) => {
      const key = `k_${++pushCounter}`;
      const pushed = { path: `${parentRef.path}/${key}`, key };
      mocks._lastRef = pushed;
      return pushed;
    }),
    set: vi.fn(async (ref, val) => {
      store.set(ref.path, val);
    }),
    update: vi.fn(async (_ref, data) => {
      for (const [flatPath, val] of Object.entries(data)) {
        store.set(flatPath, val);
      }
    }),
    get: vi.fn(async (ref) => {
      const v = store.get(ref.path);
      return { val: () => v, exists: () => v !== undefined && v !== null };
    }),
    onValue: vi.fn((ref, cb) => {
      // Fire once immediately
      const val = store.get(ref.path);
      cb({ val: () => val });
      return () => {};
    }),
    off: vi.fn(() => {}),
    remove: vi.fn(async (ref) => store.del(ref.path)),
    query: vi.fn((ref) => ref),
    limitToLast: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
    runTransaction: vi.fn(async (ref, updateFn) => {
      const oldVal = store.get(ref.path);
      const newVal = updateFn(oldVal);
      if (newVal !== undefined) {
        store.set(ref.path, newVal);
        return { committed: true };
      }
      return { committed: false };
    }),
  };
});

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn(() => { throw new Error('CF n/a'); })),
}));

vi.mock('@house/db', () => {
  const app = {};
  app.options = { projectId: 'test', apiKey: 'test' };
  app.automaticDataCollectionEnabled = false;
  return { realtimeDB: {}, app };
});

describe('ordersService', () => {
  const B = 'test-branch';

  beforeEach(async () => {
    store = createStore();
    pushCounter = 0;
    store.seedProducts(B);
    // Re-import with fresh store state
    vi.resetModules();
  });

  it('creates order and deducts stock', async () => {
    const { ordersService: os } = await import('../../lib/ordersService.js');
    const r = await os.createOrder(B, {
      customerName: 'Test', items: [{ productId: 'p1', quantity: 2, price: 28 }], total: 56,
    });
    expect(r.success).toBe(true);
    expect(r.orderId).toBeDefined();
    expect(store.get('branches/test-branch/catalog/products/p1/stock')).toBe(8);
  });

  it('rejects insufficient stock', async () => {
    const { ordersService: os } = await import('../../lib/ordersService.js');
    const r = await os.createOrder(B, {
      customerName: 'Fail', items: [{ productId: 'p2', quantity: 99, price: 32 }], total: 3168,
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe('stock_insufficient');
    expect(store.get('branches/test-branch/catalog/products/p2/stock')).toBe(5);
  });

  it('ignores non-tracked products', async () => {
    const { ordersService: os } = await import('../../lib/ordersService.js');
    const r = await os.createOrder(B, {
      customerName: 'NoTrack', items: [{ productId: 'p3', quantity: 10, price: 8 }], total: 80,
    });
    expect(r.success).toBe(true);
    expect(store.get('branches/test-branch/catalog/products/p3/stock')).toBe(999);
  });

  it('stores order metadata', async () => {
    const { ordersService: os } = await import('../../lib/ordersService.js');
    await os.createOrder(B, {
      customerName: 'Meta', items: [{ productId: 'p1', quantity: 1, price: 28 }], total: 28,
    });
    const orders = store.get('branches/test-branch/orders');
    expect(orders).toBeDefined();
    const vals = Object.values(orders);
    expect(vals).toHaveLength(1);
    expect(vals[0].status).toBe('recibido');
    expect(vals[0].createdAt).toBeDefined();
  });
});

describe('chatService', () => {
  const B = 'test-branch';

  beforeEach(async () => {
    store = createStore();
    pushCounter = 0;
    vi.resetModules();
  });

  it('sends and retrieves a message', async () => {
    const { sendMessage, subscribeMessages } = await import('../../lib/chatService.js');
    await sendMessage(B, { text: 'Hola', sender: 'kitchen', senderName: 'Cocina' });

    const msgs = await new Promise((resolve) => {
      subscribeMessages(B, (m) => resolve(m));
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('Hola');
    expect(msgs[0].sender).toBe('kitchen');
  });

  it('orders messages by timestamp', async () => {
    const { sendMessage, subscribeMessages } = await import('../../lib/chatService.js');
    await sendMessage(B, { text: 'A', sender: 'kitchen', senderName: 'Cocina' });
    await sendMessage(B, { text: 'B', sender: 'dispatch', senderName: 'Despacho' });

    const msgs = await new Promise((resolve) => {
      subscribeMessages(B, (m) => resolve(m));
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].text).toBe('A');
    expect(msgs[1].text).toBe('B');
  });

  it('tracks readBy for sender', async () => {
    const { sendMessage, subscribeMessages } = await import('../../lib/chatService.js');
    await sendMessage(B, { text: 'Leer', sender: 'kitchen', senderName: 'Cocina' });

    const msgs = await new Promise((resolve) => {
      subscribeMessages(B, (m) => resolve(m));
    });
    expect(msgs[0].readBy.kitchen).toBe(true);
  });

  it('marks message as read by another user', async () => {
    const { sendMessage, subscribeMessages, markMessageRead } = await import('../../lib/chatService.js');
    await sendMessage(B, { text: 'Nuevo', sender: 'dispatch', senderName: 'Despacho' });

    const msgs = await new Promise((resolve) => {
      subscribeMessages(B, (m) => resolve(m));
    });
    const msgId = msgs[0].id;
    await markMessageRead(B, msgId, 'kitchen');

    const stored = store.get(`branches/${B}/chat/${msgId}`);
    expect(stored.readBy.dispatch).toBe(true);
    expect(stored.readBy.kitchen).toBe(true);
  });
});
