import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCustomersBySegment, addPointsBatch } from '../customerService';

// Mock Firebase
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  get: vi.fn(),
  runTransaction: vi.fn(),
  push: vi.fn(() => ({ key: 'new-id' })),
  set: vi.fn(),
  update: vi.fn(),
  onValue: vi.fn(() => () => {}),
}));

vi.mock('@house/db', () => ({
  realtimeDB: {},
}));

describe('getCustomersBySegment', () => {
  const MOCK_SNAPSHOT = {
    val: () => ({
      c1: { name: 'Juan', tier: 'gold', totalSpent: 3000, orderCount: 15, lastOrderAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      c2: { name: 'María', tier: 'platinum', totalSpent: 6000, orderCount: 30, lastOrderAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      c3: { name: 'Carlos', tier: 'bronze', totalSpent: 400, orderCount: 2, lastOrderAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      c4: { name: 'Ana', tier: 'silver', totalSpent: 800, orderCount: 5, lastOrderAt: null },
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { get } = await import('firebase/database');
    get.mockResolvedValue(MOCK_SNAPSHOT);
  });

  it('returns all customers when no filters', async () => {
    const result = await getCustomersBySegment();
    expect(result).toHaveLength(4);
  });

  it('filters by tier', async () => {
    const result = await getCustomersBySegment({ tier: 'gold' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Juan');
  });

  it('filters by minSpent', async () => {
    const result = await getCustomersBySegment({ minSpent: 1000 });
    expect(result).toHaveLength(2); // 3000, 6000
  });

  it('filters by maxSpent', async () => {
    const result = await getCustomersBySegment({ maxSpent: 500 });
    expect(result).toHaveLength(1); // 400 only, 800 > 500
    expect(result[0].name).toBe('Carlos');
  });

  it('filters by minOrders', async () => {
    const result = await getCustomersBySegment({ minOrders: 10 });
    expect(result).toHaveLength(2); // 15, 30
  });

  it('filters by recencyDays', async () => {
    const result = await getCustomersBySegment({ recencyDays: 30 });
    // Carlos (60d) + Ana (null = no lastOrder)
    expect(result).toHaveLength(2);
  });
});

describe('addPointsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds points to multiple customers and returns success count', async () => {
    const { runTransaction } = await import('firebase/database');
    runTransaction.mockResolvedValue({});

    const result = await addPointsBatch([
      { customerId: 'c1', points: 50 },
      { customerId: 'c2', points: 100 },
    ]);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(runTransaction).toHaveBeenCalledTimes(2);
  });

  it('reports failures without throwing', async () => {
    const { runTransaction } = await import('firebase/database');
    runTransaction
      .mockResolvedValueOnce({})  // succeed
      .mockRejectedValueOnce(new Error('perm_denied'));  // fail

    const result = await addPointsBatch([
      { customerId: 'c1', points: 50 },
      { customerId: 'c2', points: 100 },
    ]);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
