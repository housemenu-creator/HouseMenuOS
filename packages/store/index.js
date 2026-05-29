import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';

const CART_KEY = 'house_cart';

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
    }),
    {
      name: CART_KEY,
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

// React hook - for React apps like house-menu
export const useAppStore = (selector) => useStore(appStore, selector);
