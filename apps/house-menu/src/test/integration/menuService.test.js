import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  };
}

let store;
let pushCounter;

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
vi.mock('firebase/database', () => {
  return {
    getDatabase: vi.fn(() => ({})),
    ref: vi.fn((_db, path) => ({ path })),
    push: vi.fn((parentRef) => {
      const key = `k_${++pushCounter}`;
      return { path: `${parentRef.path}/${key}`, key };
    }),
    set: vi.fn(async (ref, val) => { store.set(ref.path, val); }),
    update: vi.fn(async (ref, data) => {
      for (const [flatKey, val] of Object.entries(data)) {
        const parts = flatKey.split('/');
        let curPath = ref.path;
        for (const part of parts) {
          curPath = `${curPath}/${part}`;
        }
        store.set(curPath, val);
      }
    }),
    get: vi.fn(async (ref) => {
      const v = store.get(ref.path);
      return { val: () => v, exists: () => v !== undefined && v !== null };
    }),
    onValue: vi.fn((ref, cb) => {
      const val = store.get(ref.path);
      cb({ val: () => val });
      return () => {};
    }),
    off: vi.fn(() => {}),
    remove: vi.fn(async (ref) => store.del(ref.path)),
    query: vi.fn((ref) => ref),
    limitToLast: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
  };
});

beforeEach(async () => {
  store = createStore();
  pushCounter = 0;
  vi.resetModules();
});

describe('menuService', () => {
  const B = 'branch-a';

  it('subscribes to catalog with products', async () => {
    store.set(`branches/${B}/catalog/products/p1`, { name: 'Lomo', base_price: 28, available: true });
    store.set(`branches/${B}/catalog/modifiers/m1`, { name: 'Extra queso', price: 3 });
    store.set(`branches/${B}/catalog/variations/v1`, { name: 'Grande', adjustPrice: 5 });

    const { menuService: ms } = await import('../../lib/menuService');
    const data = await new Promise((resolve) => {
      ms.subscribeToCatalog(B, (d) => resolve(d));
    });

    expect(data.products).toBeDefined();
    expect(data.products.p1.name).toBe('Lomo');
    expect(data.modifiers.m1.name).toBe('Extra queso');
    expect(data.variations.v1.name).toBe('Grande');
  });

  it('handles empty catalog', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    const data = await new Promise((resolve) => {
      ms.subscribeToCatalog(B, (d) => resolve(d));
    });

    expect(data.products).toEqual({});
    expect(data.modifiers).toEqual({});
    expect(data.variations).toEqual({});
  });

  it('handles subscription setup error gracefully', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    const onError = vi.fn();
    const unsub = ms.subscribeToCatalog(undefined, vi.fn(), onError);
    expect(typeof unsub).toBe('function');
  });

  it('updates product availability', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    await ms.updateProductAvailability(B, 'p1', false);

    const val = store.get(`branches/${B}/catalog/products/p1/available`);
    expect(val).toBe(false);
  });

  it('updates a product field', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    await ms.updateProductField(B, 'p1', 'base_price', 35);

    const val = store.get(`branches/${B}/catalog/products/p1/base_price`);
    expect(val).toBe(35);
  });

  it('creates a new product in a category', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    const key = await ms.createProduct(B, 'POSTRES');

    expect(key).toBeDefined();
    const product = store.get(`branches/${B}/catalog/products/${key}`);
    expect(product.name).toBe('Nuevo Plato');
    expect(product.category).toBe('POSTRES');
    expect(product.base_price).toBe(0);
    expect(product.available).toBe(false);
  });

  it('duplicates a product', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    const original = { id: 'p1', name: 'Lomo Saltado', category: 'PLATOS_FONDO', base_price: 28, available: true };

    const newKey = await ms.duplicateProduct(B, original);
    const copy = store.get(`branches/${B}/catalog/products/${newKey}`);

    expect(copy.name).toBe('Copia de Lomo Saltado');
    expect(copy.base_price).toBe(28);
    expect(copy.available).toBe(false);
    expect(copy.category).toBe('PLATOS_FONDO');
  });

  it('deletes a product', async () => {
    store.set(`branches/${B}/catalog/products/p1`, { name: 'To delete' });

    const { menuService: ms } = await import('../../lib/menuService');
    await ms.deleteProduct(B, 'p1');

    const val = store.get(`branches/${B}/catalog/products/p1`);
    expect(val).toBeUndefined();
  });

  it('renames a category across all products', async () => {
    store.set(`branches/${B}/catalog/products/p1`, { name: 'A', category: 'Viejos' });
    store.set(`branches/${B}/catalog/products/p2`, { name: 'B', category: 'Viejos' });
    store.set(`branches/${B}/catalog/products/p3`, { name: 'C', category: 'Otros' });

    const { menuService: ms } = await import('../../lib/menuService');
    await ms.renameCategory(B, 'Viejos', 'Nuevos');

    expect(store.get(`branches/${B}/catalog/products/p1/category`)).toBe('Nuevos');
    expect(store.get(`branches/${B}/catalog/products/p2/category`)).toBe('Nuevos');
    expect(store.get(`branches/${B}/catalog/products/p3/category`)).toBe('Otros');
  });

  it('skips rename if category names are the same', async () => {
    store.set(`branches/${B}/catalog/products/p1`, { name: 'A', category: 'Test' });

    const { menuService: ms } = await import('../../lib/menuService');
    await ms.renameCategory(B, 'Test', 'Test');

    expect(store.get(`branches/${B}/catalog/products/p1/category`)).toBe('Test');
  });

  it('creates a new category with a ghost product', async () => {
    const { menuService: ms } = await import('../../lib/menuService');
    const key = await ms.createCategory(B, 'NuevaCat');

    expect(key).toBeDefined();
    const product = store.get(`branches/${B}/catalog/products/${key}`);
    expect(product.name).toBe('Plato de Ejemplo');
    expect(product.category).toBe('NuevaCat');
    expect(product.available).toBe(false);
  });
});

describe('dailyMenuService', () => {
  const B = 'branch-b';
  const DATE = '2026-06-01';

  it('subscribes to daily menus', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { name: 'Menu del Dia', active: true, productIds: ['p1', 'p2'] });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    const menus = await new Promise((resolve) => {
      dms.subscribeToDailyMenus(B, (d) => resolve(d));
    });

    expect(menus[DATE]).toBeDefined();
    expect(menus[DATE].name).toBe('Menu del Dia');
    expect(menus[DATE].productIds).toHaveLength(2);
  });

  it('handles empty daily menus', async () => {
    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    const menus = await new Promise((resolve) => {
      dms.subscribeToDailyMenus(B, (d) => resolve(d));
    });

    expect(menus).toEqual({});
  });

  it('gets a specific daily menu', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { name: 'Hoy', productIds: ['p1'], active: true });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    const menu = await dms.getDailyMenu(B, DATE);

    expect(menu).not.toBeNull();
    expect(menu.name).toBe('Hoy');
    expect(menu.date).toBe(DATE);
  });

  it('returns null for non-existent daily menu', async () => {
    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    const menu = await dms.getDailyMenu(B, '2099-01-01');

    expect(menu).toBeNull();
  });

  it('sets a daily menu', async () => {
    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    const result = await dms.setDailyMenu(B, DATE, { name: 'Almuerzo Ejecutivo', description: 'Sopa + Segundo', productIds: ['p1'], basePrice: 15 });

    expect(result.success).toBe(true);
    const stored = store.get(`branches/${B}/daily_menus/${DATE}`);
    expect(stored.name).toBe('Almuerzo Ejecutivo');
    expect(stored.basePrice).toBe(15);
    expect(stored.productIds).toEqual(['p1']);
    expect(stored.active).toBe(true);
  });

  it('removes a daily menu', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { name: 'Viejo' });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    await dms.removeDailyMenu(B, DATE);

    const stored = store.get(`branches/${B}/daily_menus/${DATE}`);
    expect(stored).toBeUndefined();
  });

  it('adds a product to a daily menu', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { productIds: ['p1'] });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    await dms.addProductToDailyMenu(B, DATE, 'p2');

    const stored = store.get(`branches/${B}/daily_menus/${DATE}/productIds`);
    expect(stored).toEqual(['p1', 'p2']);
  });

  it('does not duplicate products in daily menu', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { productIds: ['p1'] });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    await dms.addProductToDailyMenu(B, DATE, 'p1');

    const stored = store.get(`branches/${B}/daily_menus/${DATE}/productIds`);
    expect(stored).toEqual(['p1']);
  });

  it('removes a product from a daily menu', async () => {
    store.set(`branches/${B}/daily_menus/${DATE}`, { productIds: ['p1', 'p2', 'p3'] });

    const { dailyMenuService: dms } = await import('../../lib/dailyMenuService');
    await dms.removeProductFromDailyMenu(B, DATE, 'p2');

    const stored = store.get(`branches/${B}/daily_menus/${DATE}/productIds`);
    expect(stored).toEqual(['p1', 'p3']);
  });
});
