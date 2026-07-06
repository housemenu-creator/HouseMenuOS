import { useState, useMemo, useCallback } from 'react';
import type { CartItem, CatalogProduct } from '../types';

export function useOrderBuilder() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [mesa, setMesa] = useState('');
  const [notes, setNotes] = useState('');

  const addItem = useCallback((product: CatalogProduct, variation?: { name: string; adjustPrice: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing && !variation) {
        // Only increment quantity when adding the same product without a variation
        return prev.map(i =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      const basePrice = product.price ?? product.base_price ?? 0;
      const adjustPrice = variation?.adjustPrice ?? 0;
      const unitPrice = basePrice + adjustPrice;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice,
          total: unitPrice,
          notes: undefined,
          selectedVariation: variation,
          selectedModifiers: undefined,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? {
              ...i,
              quantity: Math.max(1, qty),
              total: Math.max(1, qty) * i.unitPrice,
            }
          : i
      )
    );
  }, []);

  const setItemVariation = useCallback((productId: string, variation: { name: string; adjustPrice: number }) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? {
              ...i,
              selectedVariation: variation,
              unitPrice: (i.unitPrice - (i.selectedVariation?.adjustPrice ?? 0)) + variation.adjustPrice,
              total: i.quantity * ((i.unitPrice - (i.selectedVariation?.adjustPrice ?? 0)) + variation.adjustPrice),
            }
          : i
      )
    );
  }, []);

  const setItemModifiers = useCallback((productId: string, modifiers: Array<{ name: string; price: number }>) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, selectedModifiers: modifiers }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerName('');
    setMesa('');
    setNotes('');
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.total, 0),
    [items]
  );

  const isEmpty = items.length === 0;

  const valid = items.length > 0;

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!customerName.trim()) w.push('customer name missing');
    return w;
  }, [customerName]);

  const buildPayload = useCallback(
    (sessionId: string, source: string = 'cashier') => ({
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.unitPrice,
        subtotal: i.total,
      })),
      customerName,
      mesa,
      total,
      notes: [],
      sessionId,
      source,
      payment_status: 'pendiente' as const,
    }),
    [items, customerName, mesa, total]
  );

  const reset = useCallback(() => {
    clearCart();
  }, [clearCart]);

  return {
    items,
    customerName,
    mesa,
    notes,
    itemCount,
    total,
    isEmpty,
    valid,
    warnings,
    addItem,
    removeItem,
    updateQuantity,
    setItemVariation,
    setItemModifiers,
    setCustomerName,
    setMesa,
    setNotes,
    buildPayload,
    clearCart,
    reset,
  };
}
