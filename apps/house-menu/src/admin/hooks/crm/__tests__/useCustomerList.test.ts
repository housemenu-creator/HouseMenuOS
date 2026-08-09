import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCustomerList from '../useCustomerList';

// Mock customerService
vi.mock('../../../../lib/customerService', () => ({
  subscribeCustomers: vi.fn((callback) => {
    // Immediately deliver mock data
    callback(MOCK_CUSTOMERS);
    return () => {};
  }),
  addCustomerPoints: vi.fn(),
}));

const MOCK_CUSTOMERS = [
  { id: '1', name: 'Juan Pérez', email: 'juan@mail.com', phone: '999111000', totalSpent: 3000, orderCount: 15, tier: 'gold', points: 200, lastOrderAt: '2026-06-01T12:00:00Z' },
  { id: '2', name: 'María García', email: 'maria@mail.com', phone: '999222000', totalSpent: 6000, orderCount: 30, tier: 'platinum', points: 500, lastOrderAt: '2026-06-20T12:00:00Z' },
  { id: '3', name: 'Carlos López', email: 'carlos@mail.com', phone: '999333000', totalSpent: 400, orderCount: 2, tier: 'bronze', points: 20, lastOrderAt: '2026-03-15T12:00:00Z' },
  { id: '4', name: 'Ana Torres', email: 'ana@mail.com', totalSpent: 800, orderCount: 5, tier: 'silver', points: 60, lastOrderAt: '2026-05-10T12:00:00Z' },
  { id: '5', name: 'Pedro Ruiz', email: 'pedro@mail.com', totalSpent: 100, orderCount: 1, tier: 'bronze', points: 5, lastOrderAt: '2026-01-05T12:00:00Z' },
];

describe('useCustomerList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads customers and computes total count', () => {
    const { result } = renderHook(() => useCustomerList(10));
    expect(result.current.allCustomers).toEqual(MOCK_CUSTOMERS);
    expect(result.current.totalCount).toBe(5);
    expect(result.current.loading).toBe(false);
  });

  it('filters by search (name)', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('search', 'juan'));
    expect(result.current.displayCustomers).toHaveLength(1);
    expect(result.current.displayCustomers[0].name).toBe('Juan Pérez');
  });

  it('filters by search (email)', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('search', 'ana@'));
    expect(result.current.displayCustomers).toHaveLength(1);
  });

  it('filters by tier', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('tier', 'bronze'));
    expect(result.current.displayCustomers).toHaveLength(2);
  });

  it('filters by minSpent', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('minSpent', '500'));
    expect(result.current.displayCustomers).toHaveLength(3); // 3000, 6000, 800
  });

  it('filters by maxSpent', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('maxSpent', '500'));
    expect(result.current.displayCustomers).toHaveLength(2); // 400, 100
  });

  it('paginates correctly', () => {
    const { result } = renderHook(() => useCustomerList(2));
    // pageSize=2 → 3 pages for 5 customers
    expect(result.current.totalPages).toBe(3);
    expect(result.current.displayCustomers).toHaveLength(2);
    expect(result.current.pageStart).toBe(1);
    expect(result.current.pageEnd).toBe(2);

    act(() => result.current.setPage(2));
    expect(result.current.displayCustomers).toHaveLength(2);
    expect(result.current.pageStart).toBe(3);
    expect(result.current.pageEnd).toBe(4);

    act(() => result.current.setPage(3));
    expect(result.current.displayCustomers).toHaveLength(1);
  });

  it('sorts by totalSpent descending (default lastOrderAt, but we can sort)', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setSort('totalSpent'));
    // sortDir starts as 'desc', so highest first
    expect(result.current.displayCustomers[0].totalSpent).toBe(6000);
    expect(result.current.displayCustomers[4].totalSpent).toBe(100);

    // Toggle to asc
    act(() => result.current.setSort('totalSpent'));
    expect(result.current.displayCustomers[0].totalSpent).toBe(100);
    expect(result.current.displayCustomers[4].totalSpent).toBe(6000);
  });

  it('resets filters with resetFilters', () => {
    const { result } = renderHook(() => useCustomerList(10));
    act(() => result.current.setFilter('search', 'juan'));
    act(() => result.current.setFilter('tier', 'gold'));
    expect(result.current.filters.search).toBe('juan');
    expect(result.current.filters.tier).toBe('gold');

    act(() => result.current.resetFilters());
    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.tier).toBe('');
    expect(result.current.totalCount).toBe(5);
  });

  it('retry reloads customers', () => {
    const { result } = renderHook(() => useCustomerList(10));
    expect(result.current.error).toBeNull();
    act(() => result.current.retry());
    // After retry should still have data
    expect(result.current.allCustomers).toHaveLength(5);
  });
});
