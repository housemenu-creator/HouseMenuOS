import { create } from 'zustand';
import type { CatalogProduct } from '../workerTypes';

interface CatalogState {
  products: Record<string, CatalogProduct>;
  categories: string[];
  isLoading: boolean;
  lastFetched: number | null;

  setProducts: (products: CatalogProduct[]) => void;
  getProduct: (id: string) => CatalogProduct | undefined;
  getCategoryProducts: (category: string) => CatalogProduct[];
  reset: () => void;
}

const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: {},
  categories: [],
  isLoading: true,
  lastFetched: null,

  setProducts: (products) => {
    const productMap: Record<string, CatalogProduct> = {};
    const catSet = new Set<string>();
    for (const p of products) {
      productMap[p.id] = p;
      if (p.category) catSet.add(p.category);
    }
    set({
      products: productMap,
      categories: Array.from(catSet).sort(),
      isLoading: false,
      lastFetched: Date.now(),
    });
  },

  getProduct: (id) => get().products[id],

  getCategoryProducts: (category) =>
    Object.values(get().products).filter((p) => p.category === category),

  reset: () => set({ products: {}, categories: [], isLoading: true, lastFetched: null }),
}));

export default useCatalogStore;
