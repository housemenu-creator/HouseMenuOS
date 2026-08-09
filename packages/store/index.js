import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';

const CART_KEY = 'house_cart';

function getInitialBranchId() {
  if (typeof window === 'undefined') return 'monteverde';
  const stored = localStorage.getItem('house_active_branch');
  if (!stored || stored === 'hq' || stored === 'castilla' || stored === 'default') return 'monteverde';
  return stored;
}

// Vanilla store - for Vanilla JS apps like portal-hub
export const appStore = createStore(
  persist(
    (set) => ({
      // User State
      user: null,
      setUser: (user) => set({ user }),

      // Cart State (Shared across apps)
      cart: [],
      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter(item => item.id !== id)
      })),
      updateCartItem: (id, updates) => set((state) => ({
        cart: state.cart.map(item => (item.id === id ? { ...item, ...updates } : item))
      })),
      updateCartItemQty: (id, quantity) => set((state) => {
        if (quantity <= 0) {
          return { cart: state.cart.filter(item => item.id !== id) };
        }
        return {
          cart: state.cart.map(item => (item.id === id ? { ...item, quantity } : item))
        };
      }),
      clearCart: () => set({ cart: [] }),

      // UI State
      isSidebarOpen: true,

      // Branch State (Shared across apps)
      branches: [],
      activeBranchId: getInitialBranchId(),
      branchLoading: true,
      branchError: null,

      setBranches: (branches) => set({ branches, branchLoading: false, branchError: null }),
      setBranchError: (error) => set({ branchError: error, branchLoading: false }),
      setBranchLoading: (branchLoading) => set({ branchLoading }),
      setActiveBranchId: (id) => {
        // ponytail: reject legacy/unknown branch IDs, fallback to monteverde
        const safeId = !id || id === 'hq' || id === 'castilla' || id === 'default' ? 'monteverde' : id;
        if (typeof window !== 'undefined') {
          if (safeId !== id) {
            console.warn(`[store] setActiveBranchId: "${id}" no es válido, re-asignado a "${safeId}"`);
          }
          localStorage.setItem('house_active_branch', safeId);
        }
        set({ activeBranchId: safeId });
      },
    }),
    {
      name: CART_KEY,
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

// React hook - for React apps like house-menu
export const useAppStore = (selector) => useStore(appStore, selector);
