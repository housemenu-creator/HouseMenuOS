import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hasPermission } from '../../lib/roleRegistry';
import type { WorkerSession } from '../workerTypes';

interface WorkerSessionState {
  session: WorkerSession | null;
  isLoggedIn: boolean;

  setSession: (session: WorkerSession) => void;
  setBranch: (branchId: string) => void;
  setRoles: (roles: string[]) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
  getActiveRoles: () => string[];
}

const useWorkerSessionStore = create<WorkerSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      isLoggedIn: false,

      setSession: (session) => set({ session, isLoggedIn: true }),

      setBranch: (branchId) => {
        const s = get().session;
        if (s) set({ session: { ...s, branchId } });
      },

      setRoles: (roles) => {
        const s = get().session;
        if (s) set({ session: { ...s, roles } });
      },

      logout: () => set({ session: null, isLoggedIn: false }),

      hasPermission: (perm) => {
        const s = get().session;
        if (!s) return false;
        return hasPermission(s.permissions, perm);
      },

      hasRole: (role) => {
        const s = get().session;
        if (!s) return false;
        return s.roles.includes(role);
      },

      getActiveRoles: () => {
        const s = get().session;
        if (!s) return [];
        return s.roles;
      },
    }),
    {
      name: 'worker-session',
      partialize: (state) => ({ session: state.session, isLoggedIn: state.isLoggedIn }),
    }
  )
);

export default useWorkerSessionStore;
