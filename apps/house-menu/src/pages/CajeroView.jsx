import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { cashService } from '../lib/cashService';
import { useFCM } from '../hooks/useFCM';
import NotificationBell from '../components/NotificationBell';
import CajaTab from '../admin/tabs/CajaTab';
import { Loader2, DollarSign } from 'lucide-react';

export default function CajeroView() {
  const { user, logout } = useAuth();
  const { activeBranchId } = useBranch();
  const [allOrders, setAllOrders] = useState([]);
  const [cashSessions, setCashSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // FCM + notificaciones en tiempo real
  useFCM({ branchId: activeBranchId, userId: user?.email });

  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    const unsubOrders = ordersService.subscribeToOrders(activeBranchId, (data) => {
      setAllOrders(data);
      setLoading(false);
    });
    const unsubCash = cashService.subscribeToSessions(activeBranchId, setCashSessions);
    return () => { unsubOrders(); unsubCash(); };
  }, [activeBranchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-cm-bg">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <DollarSign className="w-4 h-4 text-cm-accent" /> Módulo de Caja
            </h1>
            <p className="text-xs text-cm-muted font-semibold mt-0.5">{user?.name || 'Cajero'}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell branchId={activeBranchId} userId={user?.email} />
            <button onClick={logout}
              className="px-3 py-1.5 text-xs font-bold text-cm-error border border-cm-error/30 rounded-lg hover:bg-cm-error/10 transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>

        <CajaTab
          cashSessions={cashSessions}
          allOrders={allOrders}
          activeBranchId={activeBranchId}
          user={user}
        />
      </div>
    </div>
  );
}
