import { create } from 'zustand';
import type { CatalogProduct } from '../../worker/workerTypes';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  details: string[];
  wizardSelections?: Record<string, any>;
}

interface MozoUIState {
  searchQuery: string;
  filter: 'activos' | 'entregados' | 'todos';
  showNewOrder: boolean;
  cobrarOrderId: string | null;
  cart: CartItem[];
  selectedProduct: CatalogProduct | null;
  wizardStep: number;
  wizardSelections: Record<string, any>;
  selectedVariation: string | null;
  selectedModifiers: string[];

  setSearchQuery: (q: string) => void;
  setFilter: (f: 'activos' | 'entregados' | 'todos') => void;
  setShowNewOrder: (v: boolean) => void;
  setCobrarOrderId: (id: string | null) => void;
  setSelectedProduct: (p: CatalogProduct | null) => void;
  setWizardStep: (s: number) => void;
  setWizardSelections: (s: Record<string, any>) => void;
  setSelectedVariation: (v: string | null) => void;

  addToCart: (item: CartItem) => void;
  updateCartQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

const useMozoStore = create<MozoUIState>()((set, get) => ({
  searchQuery: '',
  filter: 'activos',
  showNewOrder: false,
  cobrarOrderId: null,
  cart: [],
  selectedProduct: null,
  wizardStep: 0,
  wizardSelections: {},
  selectedVariation: null,
  selectedModifiers: [],

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilter: (f) => set({ filter: f }),
  setShowNewOrder: (v) => set({ showNewOrder: v }),
  setCobrarOrderId: (id) => set({ cobrarOrderId: id }),
  setSelectedProduct: (p) => set({ selectedProduct: p, wizardStep: 0, wizardSelections: {}, selectedVariation: null, selectedModifiers: [] }),
  setWizardStep: (s) => set({ wizardStep: s }),
  setWizardSelections: (s) => set({ wizardSelections: s }),
  setSelectedVariation: (v) => set({ selectedVariation: v }),

  addToCart: (item) => set((state) => {
    const existing = state.cart.find(
      (i) => i.productId === item.productId && JSON.stringify(i.details) === JSON.stringify(item.details)
    );
    if (existing) {
      return { cart: state.cart.map((i) => i === existing ? { ...i, quantity: i.quantity + 1 } : i) };
    }
    return { cart: [...state.cart, { ...item, id: crypto.randomUUID() }] };
  }),

  updateCartQty: (productId, delta) => set((state) => ({
    cart: state.cart.map((i) =>
      i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ),
  })),

  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter((i) => i.productId !== productId),
  })),

  clearCart: () => set({ cart: [], selectedProduct: null }),

  cartTotal: () => get().cart.reduce((s, i) => s + i.price * i.quantity, 0),
}));

export default useMozoStore;
