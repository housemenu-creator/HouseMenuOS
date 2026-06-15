import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';

const CART_KEY = 'house_cart';

function getInitialBranchId() {
  if (typeof window === 'undefined') return 'castilla';
  const stored = localStorage.getItem('house_active_branch');
  // Migration: 'hq' was the old default, remap to actual branch
  if (!stored || stored === 'hq') return 'castilla';
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('house_active_branch', id);
        }
        set({ activeBranchId: id });
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
