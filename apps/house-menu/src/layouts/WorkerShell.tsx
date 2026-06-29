import { useState, type ReactNode } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import StaffTopBar from '../components/StaffTopBar';
import ChatWindow from '../components/ChatWindow';
import { useAuth } from '../context/AuthContext';

export interface ShellContext {
  /** Permite a la página activa inyectar contenido en la StaffTopBar */
  setTopBarSlot: (slot: ReactNode) => void;
}

/**
 * Hook para que las páginas hijas accedan al contexto del shell.
 * Útil para inyectar slots en la topbar o acceder a funciones del layout.
 */
export function useShell(): ShellContext {
  return useOutletContext<ShellContext>();
}

export default function WorkerShell() {
  const [topBarSlot, setTopBarSlot] = useState<ReactNode>(null);
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      <StaffTopBar slot={topBarSlot} />
      <main className="flex-1 flex flex-col overflow-hidden pt-14">
        <Outlet context={{ setTopBarSlot } satisfies ShellContext} />
      </main>

      {/* Chat disponible en todas las rutas staff */}
      {isAuthenticated && <ChatWindow />}
    </div>
  );
}
