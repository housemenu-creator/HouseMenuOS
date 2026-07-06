import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useOrderBuilder } from '../../hooks/useOrderBuilder';
import type { CatalogProduct } from '../../types';

const coffee: CatalogProduct = {
  id: 'prod-1',
  name: 'Café Americano',
  category: 'Bebidas Calientes',
  base_price: 12,
  available: true,
};

const empanada: CatalogProduct = {
  id: 'prod-2',
  name: 'Empanada de Carne',
  category: 'Entradas',
  base_price: 15,
  available: true,
};

const tea: CatalogProduct = {
  id: 'prod-3',
  name: 'Té',
  category: 'Bebidas Calientes',
  base_price: 8,
  price: 10, // has a custom price overriding base_price
  available: true,
};

describe('useOrderBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty cart', () => {
    const { result } = renderHook(() => useOrderBuilder());

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.valid).toBe(false);
    expect(result.current.customerName).toBe('');
    expect(result.current.mesa).toBe('');
    expect(result.current.notes).toBe('');
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => {
      result.current.addItem(coffee);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      productId: 'prod-1',
      name: 'Café Americano',
      quantity: 1,
      unitPrice: 12,
      total: 12,
    });
    expect(result.current.total).toBe(12);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.valid).toBe(true);
  });

  it('increments quantity when adding same product again', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.addItem(coffee));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.items[0].total).toBe(24);
    expect(result.current.total).toBe(24);
    expect(result.current.itemCount).toBe(2);
  });

  it('adds multiple distinct products', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.addItem(empanada));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(27); // 12 + 15
    expect(result.current.itemCount).toBe(2);
  });

  it('uses price field over base_price when present', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(tea));

    expect(result.current.items[0].unitPrice).toBe(10);
    expect(result.current.items[0].total).toBe(10);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.addItem(empanada));
    act(() => result.current.removeItem('prod-1'));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe('prod-2');
    expect(result.current.total).toBe(15);
  });

  it('removes last item and sets cart empty', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.removeItem('prod-1'));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.valid).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('updates quantity of an item', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.updateQuantity('prod-1', 5));

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.items[0].total).toBe(60);
    expect(result.current.total).toBe(60);
    expect(result.current.itemCount).toBe(5);
  });

  it('updateQuantity clamps to minimum 1', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.updateQuantity('prod-1', 0));

    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].total).toBe(12);
  });

  it('updateQuantity ignores non-existent product', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.updateQuantity('nonexistent', 10));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
  });

  it('sets customer name, mesa, and notes', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.setCustomerName('Juan Pérez'));
    act(() => result.current.setMesa('Mesa 5'));
    act(() => result.current.setNotes('Sin sal'));

    expect(result.current.customerName).toBe('Juan Pérez');
    expect(result.current.mesa).toBe('Mesa 5');
    expect(result.current.notes).toBe('Sin sal');
  });

  it('clearCart resets everything', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.addItem(empanada));
    act(() => result.current.setCustomerName('Juan'));
    act(() => result.current.setMesa('Mesa 5'));
    act(() => result.current.setNotes('Nota'));

    act(() => result.current.clearCart());

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.customerName).toBe('');
    expect(result.current.mesa).toBe('');
    expect(result.current.notes).toBe('');
  });

  it('reset calls clearCart and resets state', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.setCustomerName('Juan'));
    act(() => result.current.reset());

    expect(result.current.items).toEqual([]);
    expect(result.current.customerName).toBe('');
  });

  it('buildPayload returns correct shape with default source', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.setCustomerName('Juan'));
    act(() => result.current.setMesa('Mesa 5'));

    const payload = result.current.buildPayload('sess-1');

    expect(payload).toMatchObject({
      items: [
        {
          productId: 'prod-1',
          name: 'Café Americano',
          quantity: 1,
          price: 12,
          subtotal: 12,
        },
      ],
      customerName: 'Juan',
      mesa: 'Mesa 5',
      total: 12,
      notes: [],
      sessionId: 'sess-1',
      source: 'cashier',
      payment_status: 'pendiente',
    });
  });

  it('buildPayload accepts custom source', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));

    const payload = result.current.buildPayload('sess-1', 'kiosko');
    expect(payload.source).toBe('kiosko');
  });

  it('warns when customer name is missing', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));

    expect(result.current.warnings).toContain('customer name missing');
  });

  it('has no warnings when customer name is provided', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));
    act(() => result.current.setCustomerName('Juan'));

    expect(result.current.warnings).toHaveLength(0);
  });

  it('computes total correctly with multiple items and quantities', () => {
    const { result } = renderHook(() => useOrderBuilder());

    act(() => result.current.addItem(coffee));   // 12
    act(() => result.current.addItem(coffee));   // +12 → 24
    act(() => result.current.addItem(empanada)); // +15 → 39
    act(() => result.current.updateQuantity('prod-2', 3)); // 15*3=45 → 24+45=69

    expect(result.current.total).toBe(69);
    expect(result.current.itemCount).toBe(5); // 2 coffees + 3 empanadas
    expect(result.current.items).toHaveLength(2);
  });
});
