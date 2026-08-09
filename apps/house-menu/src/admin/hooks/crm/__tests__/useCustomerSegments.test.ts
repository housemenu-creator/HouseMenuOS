import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCustomerSegments from '../useCustomerSegments';

const MOCK_CUSTOMERS = [
  { id: '1', name: 'Juan Pérez', totalSpent: 3000, orderCount: 15, tier: 'gold', lastOrderAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '2', name: 'María García', totalSpent: 6000, orderCount: 30, tier: 'platinum', lastOrderAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '3', name: 'Carlos López', totalSpent: 400, orderCount: 2, tier: 'bronze', lastOrderAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: '4', name: 'Ana Torres', totalSpent: 800, orderCount: 5, tier: 'silver', lastOrderAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: '5', name: 'Pedro Ruiz', totalSpent: 100, orderCount: 1, tier: 'bronze', lastOrderAt: null }, // never ordered again
  { id: '6', name: 'Lucía Méndez', totalSpent: 2500, orderCount: 12, tier: 'gold', lastOrderAt: new Date(Date.now() - 40 * 86400000).toISOString() },
];

vi.mock('../../../../lib/customerService', () => ({
  subscribeCustomers: vi.fn((callback) => {
    callback(MOCK_CUSTOMERS);
    return () => {};
  }),
  addCustomerPoints: vi.fn(() => Promise.resolve()),
}));

describe('useCustomerSegments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads all customers', () => {
    const { result } = renderHook(() => useCustomerSegments());
    expect(result.current.allCustomers).toHaveLength(6);
  });

  it('filters by tier (single)', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('tiers', ['gold']));
    expect(result.current.segmentCount).toBe(2); // Juan, Lucía
  });

  it('filters by tier (multiple)', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('tiers', ['gold', 'platinum']));
    expect(result.current.segmentCount).toBe(3);
  });

  it('filters by minSpent', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('minSpent', 1000));
    expect(result.current.segmentCount).toBe(3); // 3000, 6000, 2500
  });

  it('filters by maxSpent', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('maxSpent', 500));
    expect(result.current.segmentCount).toBe(2); // 400, 100
  });

  it('filters by minOrders', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('minOrders', 10));
    expect(result.current.segmentCount).toBe(3); // 15, 30, 12
  });

  it('filters by recency (inactive > 30 days)', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('recencyDays', 30));
    // Carlos (60d), Lucía (40d), Pedro (null = no lastOrder = inactive)
    expect(result.current.segmentCount).toBe(3);
  });

  it('combines multiple filters', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('tiers', ['gold']));
    act(() => result.current.setSegmentFilter('minSpent', 2000));
    expect(result.current.segmentCount).toBe(2); // Juan (3000) and Lucía (2500)
  });

  it('resets filters', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.setSegmentFilter('tiers', ['gold']));
    act(() => result.current.setSegmentFilter('minSpent', 2000));
    expect(result.current.segmentCount).toBe(2);

    act(() => result.current.resetSegmentFilters());
    expect(result.current.segmentCount).toBe(6);
  });

  it('saves and loads segments from localStorage', () => {
    const { result } = renderHook(() => useCustomerSegments());

    act(() => result.current.setSegmentFilter('tiers', ['platinum']));
    act(() => result.current.saveSegment('VIPs'));

    expect(result.current.savedSegments).toHaveLength(1);
    expect(result.current.savedSegments[0].name).toBe('VIPs');
    expect(result.current.savedSegments[0].filters.tiers).toEqual(['platinum']);

    // Reset and load
    act(() => result.current.resetSegmentFilters());
    expect(result.current.segmentCount).toBe(6);

    act(() => result.current.loadSegment(result.current.savedSegments[0]));
    expect(result.current.segmentCount).toBe(1);
  });

  it('deletes a saved segment', () => {
    const { result } = renderHook(() => useCustomerSegments());
    act(() => result.current.saveSegment('Test'));
    expect(result.current.savedSegments).toHaveLength(1);

    act(() => result.current.deleteSegment(result.current.savedSegments[0].id));
    expect(result.current.savedSegments).toHaveLength(0);
  });
});
