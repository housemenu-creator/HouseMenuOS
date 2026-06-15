/// <reference types="vite/client" />

declare module '@house/store' {
  import type { StoreApi } from 'zustand/vanilla';
  interface AppState {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    toggleTheme: () => void;
    toggleSidebar: () => void;
  }
  export const useAppStore: import('zustand/react').UseBoundStore<import('zustand/vanilla').StoreApi<AppState>>;
}

declare module '@house/ui' {
  import type { FC } from 'react';
  interface NexusSidebarProps {
    activeApp?: string;
  }
  export const NexusSidebar: FC<NexusSidebarProps>;
}
