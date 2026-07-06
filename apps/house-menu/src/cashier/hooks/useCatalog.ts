import { useState, useEffect, useMemo, useCallback } from 'react';
import { menuService } from '../../lib/menuService';
import type { CatalogProduct, CatalogState } from '../types';

const INITIAL_STATE: CatalogState = {
  products: [],
  categories: [],
  grouped: {},
  loading: true,
  error: null,
  isEmpty: true,
  variations: {},
  modifiers: {},
  searchQuery: '',
  setSearchQuery: () => {},
  filteredProducts: [],
  retry: () => {},
};

const EMPTY_STATE: CatalogState = {
  products: [],
  categories: [],
  grouped: {},
  loading: false,
  error: null,
  isEmpty: true,
  variations: {},
  modifiers: {},
  searchQuery: '',
  setSearchQuery: () => {},
  filteredProducts: [],
  retry: () => {},
};

export function useCatalog(branchId: string | null) {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!branchId) {
      setState(EMPTY_STATE);
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    let cancelled = false;

    const unsub = menuService.subscribeToCatalog(
      branchId,
      (data: { products?: Record<string, Record<string, unknown>>; variations?: Record<string, unknown>; modifiers?: Record<string, unknown> }) => {
        if (cancelled) return;

        const rawProducts = data?.products || {};
        const variations = data?.variations || {};
        const modifiers = data?.modifiers || {};
        const ids = Object.keys(rawProducts);

        if (ids.length === 0) {
          setState({ ...EMPTY_STATE, variations, modifiers });
          return;
        }

        const available: CatalogProduct[] = [];

        for (const id of ids) {
          const rp = rawProducts[id] as Record<string, unknown>;
          const isAvailable = rp.available !== false;
          if (!isAvailable) continue;

          available.push({
            id,
            name: (rp.name as string) || '',
            category: (rp.category as string) || '',
            base_price: (rp.base_price as number) ?? 0,
            price: rp.price as number | undefined,
            available: true,
            description: rp.description as string | undefined,
            image: rp.image as string | undefined,
            isWizard: rp.isWizard as boolean | undefined,
            trackStock: rp.trackStock as boolean | undefined,
            stock: rp.stock as number | undefined,
            tags: rp.tags as string[] | undefined,
            variations: rp.variations as Record<string, { name: string; adjustPrice: number }> | undefined,
            modifiers: rp.modifiers as Record<string, { name: string; price: number }> | undefined,
            steps: rp.steps as Record<string, { id: string; title: string; type: 'single' | 'multiple' | 'auto'; options: Record<string, { id: string; name: string; price?: number }> }> | undefined,
          });
        }

        if (available.length === 0) {
          setState({ ...EMPTY_STATE, variations, modifiers });
          return;
        }

        const grouped: Record<string, CatalogProduct[]> = {};
        for (const p of available) {
          if (!grouped[p.category]) grouped[p.category] = [];
          grouped[p.category].push(p);
        }

        const categories = Object.keys(grouped).sort();

        setState({
          products: available,
          categories,
          grouped,
          loading: false,
          error: null,
          isEmpty: false,
          variations,
          modifiers,
          searchQuery,
          setSearchQuery,
          filteredProducts: [],
          retry: () => {},
        });
      },
      (error: Error) => {
        if (cancelled) return;
        setState({
          ...EMPTY_STATE,
          error: error.message || 'Error al cargar el catálogo',
          isEmpty: false,
        });
      }
    );

    return () => {
      cancelled = true;
      if (typeof unsub === 'function') unsub();
    };
  }, [branchId, retryCount]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return state.products;
    const q = searchQuery.toLowerCase();
    return state.products.filter(p => p.name.toLowerCase().includes(q));
  }, [state.products, searchQuery]);

  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  return {
    ...state,
    searchQuery,
    setSearchQuery,
    filteredProducts,
    retry,
  };
}
