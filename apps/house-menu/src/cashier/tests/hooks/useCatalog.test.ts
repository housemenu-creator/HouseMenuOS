import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockSubscribeToCatalog } = vi.hoisted(() => ({
  mockSubscribeToCatalog: vi.fn(),
}));

vi.mock('../../../lib/menuService', () => ({
  menuService: {
    subscribeToCatalog: mockSubscribeToCatalog,
  },
}));

import { useCatalog } from '../../hooks/useCatalog';

const sampleProducts: Record<string, Record<string, unknown>> = {
  'prod-1': { name: 'Café Americano', category: 'Bebidas Calientes', base_price: 12, available: true },
  'prod-2': { name: 'Té', category: 'Bebidas Calientes', base_price: 8, available: true },
  'prod-3': { name: 'Empanada de Carne', category: 'Entradas', base_price: 15, available: true },
  'prod-4': { name: 'Empanada de Pollo', category: 'Entradas', base_price: 14, available: false },
  'prod-5': { name: 'Limonada Frozen', category: 'Bebidas Frias', base_price: 10, available: true },
};

describe('useCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: subscription that immediately returns sample data
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        cb: (data: { products: Record<string, unknown> }) => void
      ) => {
        cb({ products: sampleProducts });
        return vi.fn();
      }
    );
  });

  it('starts in loading state before callback fires', () => {
    // Simulate an async subscription — callback is not called immediately
    mockSubscribeToCatalog.mockImplementation(() => vi.fn());

    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads available products from subscription', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.products).toHaveLength(4); // prod-4 is not available
  });

  it('filters out unavailable products', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    const names = result.current.products.map(p => p.name);
    expect(names).not.toContain('Empanada de Pollo');
    expect(names).toContain('Café Americano');
    expect(names).toContain('Té');
    expect(names).toContain('Empanada de Carne');
  });

  it('groups products by category', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.categories).toEqual([
      'Bebidas Calientes',
      'Bebidas Frias',
      'Entradas',
    ]);
    expect(result.current.grouped['Bebidas Calientes']).toHaveLength(2);
    expect(result.current.grouped['Entradas']).toHaveLength(1);
    expect(result.current.grouped['Bebidas Frias']).toHaveLength(1);
  });

  it('sets isEmpty when no products returned', () => {
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        cb: (data: { products: Record<string, unknown> }) => void
      ) => {
        cb({ products: {} });
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.products).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets isEmpty when all products are unavailable', () => {
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        cb: (data: { products: Record<string, unknown> }) => void
      ) => {
        cb({
          products: {
            'prod-1': { name: 'X', category: 'Y', base_price: 5, available: false },
          },
        });
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it('transitions to error state when onError is called', () => {
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        _cb: () => void,
        onError?: (err: Error) => void
      ) => {
        // Call onError synchronously to simulate subscription failure
        onError?.(new Error('Network error'));
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useCatalog('branch-1'));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.products).toEqual([]);
  });

  it('filteredProducts filters by search query', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    act(() => {
      result.current.setSearchQuery('café');
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Café Americano');
  });

  it('filteredProducts is case-insensitive', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    act(() => {
      result.current.setSearchQuery('EMPANADA');
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Empanada de Carne');
  });

  it('filteredProducts returns all when search is empty', () => {
    const { result } = renderHook(() => useCatalog('branch-1'));

    act(() => {
      result.current.setSearchQuery('');
    });

    expect(result.current.filteredProducts).toHaveLength(4);
  });

  it('retry re-subscribes and clears error', () => {
    let onErrorCb: ((err: Error) => void) | null = null;

    // First mount with error
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        _cb: () => void,
        onError?: (err: Error) => void
      ) => {
        onErrorCb = onError ?? null;
        // Don't call callback — simulate ongoing subscription
        return vi.fn();
      }
    );

    const { result, rerender } = renderHook(
      (branchId: string | null) => useCatalog(branchId),
      { initialProps: 'branch-1' }
    );

    // Trigger error
    act(() => {
      onErrorCb?.(new Error('Firebase error'));
    });

    expect(result.current.error).toBe('Firebase error');
    expect(result.current.loading).toBe(false);

    // Now switch the mock to return data on retry
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        cb: (data: { products: Record<string, unknown> }) => void
      ) => {
        cb({ products: { 'prod-1': { name: 'Nuevo', category: 'Test', base_price: 10, available: true } } });
        return vi.fn();
      }
    );

    // Call retry
    act(() => {
      result.current.retry();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.products).toHaveLength(1);
  });

  it('returns empty state for null branch', () => {
    mockSubscribeToCatalog.mockImplementation(() => vi.fn());

    const { result } = renderHook(() => useCatalog(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.products).toEqual([]);
    expect(result.current.isEmpty).toBe(true);
  });

  it('cleans up subscription on unmount', () => {
    const unsub = vi.fn();
    mockSubscribeToCatalog.mockImplementation(() => {
      unsub.mockReset();
      return unsub;
    });

    const { unmount } = renderHook(() => useCatalog('branch-1'));
    expect(mockSubscribeToCatalog).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('includes extra fields from raw products', () => {
    mockSubscribeToCatalog.mockImplementation(
      (
        _branchId: string,
        cb: (data: { products: Record<string, unknown> }) => void
      ) => {
        cb({
          products: {
            'prod-x': {
              name: 'Especial',
              category: 'Platos',
              base_price: 25,
              available: true,
              description: 'Plato especial de la casa',
              image: 'https://example.com/img.jpg',
              isWizard: true,
              trackStock: true,
              stock: 10,
              tags: ['tag1', 'tag2'],
            },
          },
        });
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useCatalog('branch-1'));

    const p = result.current.products[0];
    expect(p.description).toBe('Plato especial de la casa');
    expect(p.image).toBe('https://example.com/img.jpg');
    expect(p.isWizard).toBe(true);
    expect(p.trackStock).toBe(true);
    expect(p.stock).toBe(10);
    expect(p.tags).toEqual(['tag1', 'tag2']);
  });
});
