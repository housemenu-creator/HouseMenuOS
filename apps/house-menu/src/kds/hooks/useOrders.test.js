import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOrders } from './useOrders';

const mockOrders = [
  { id: '1', status: 'recibido', createdAt: '2025-01-01T10:00:00Z', items: [{ name: 'Parrilla', quantity: 2 }] },
  { id: '2', status: 'preparando', createdAt: '2025-01-01T10:05:00Z', items: [{ name: 'Ensalada', quantity: 1 }] },
  { id: '3', status: 'recibido', createdAt: '2025-01-01T10:10:00Z', items: [{ name: 'Pan', quantity: 3 }] },
  { id: '4', status: 'listo', createdAt: '2025-01-01T10:15:00Z', items: [{ name: 'Pollo Frito', quantity: 1 }] },
  { id: '5', status: 'recibido', createdAt: '2025-01-01T10:20:00Z', items: [{ name: 'Ceviche', quantity: 1 }] },
];

describe('useOrders', () => {
  it('should return all orders when station filter is "all"', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    expect(result.current.filteredOrders).toHaveLength(5);
  });

  it('should filter orders by station', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    act(() => { result.current.setStationFilter('grill'); });
    const filtered = result.current.filteredOrders;
    expect(filtered.every(o => o.station === 'grill')).toBe(true);
  });

  it('should assign stations based on item keywords', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    const orders = result.current.filteredOrders;
    const grillOrder = orders.find(o => o.id === '1');
    expect(grillOrder.station).toBe('grill');
    const coldOrder = orders.find(o => o.id === '5');
    expect(coldOrder.station).toBe('cold');
  });

  it('should sort by priority then creation date', () => {
    const ordersWithPriority = [
      { id: 'a', status: 'recibido', createdAt: '2025-01-01T10:00:00Z', items: [{ name: 'Parrilla' }], priority: 'rush' },
      { id: 'b', status: 'recibido', createdAt: '2025-01-01T10:01:00Z', items: [{ name: 'Parrilla' }], priority: 'normal' },
      { id: 'c', status: 'recibido', createdAt: '2025-01-01T10:02:00Z', items: [{ name: 'Parrilla' }], priority: 'rush' },
    ];
    const { result } = renderHook(() => useOrders(ordersWithPriority));
    const ids = result.current.filteredOrders.map(o => o.id);
    expect(ids[0]).toBe('a');
    expect(ids[1]).toBe('c');
    expect(ids[2]).toBe('b');
  });

  it('should toggle order selection', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    act(() => { result.current.toggleSelect('1'); });
    expect(result.current.selectedIds.has('1')).toBe(true);
    act(() => { result.current.toggleSelect('1'); });
    expect(result.current.selectedIds.has('1')).toBe(false);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    act(() => { result.current.toggleSelect('1'); result.current.toggleSelect('2'); });
    expect(result.current.selectedIds.size).toBe(2);
    act(() => { result.current.clearSelection(); });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should compute station counts', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    expect(result.current.stationCounts.all).toBe(5);
  });

  it('should toggle sortByPriority', () => {
    const { result } = renderHook(() => useOrders(mockOrders));
    expect(result.current.sortByPriority).toBe(true);
    act(() => { result.current.setSortByPriority(false); });
    expect(result.current.sortByPriority).toBe(false);
  });
});
