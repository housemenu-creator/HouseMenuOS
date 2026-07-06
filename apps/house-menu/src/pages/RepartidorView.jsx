import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { deliveryService } from '../lib/deliveryService';
import { Bike, Loader2, Phone } from 'lucide-react';
import useOrderSync from '../worker/hooks/useOrderSync';
import useDeliverySessionStore from '../delivery/store/deliverySessionStore';
import { useDriverIdentity } from '../delivery/hooks/useDriverIdentity';
import { useDriverDelivery, useDriverStats } from '../delivery/hooks/useDriverDelivery';
import DeliveryCard from '../delivery/components/DeliveryCard';
import { playBeep } from '../lib/notificationSound';
import { useDriverGeolocation } from '../delivery/hooks/useDriverGeolocation';
import NotificationBell from '../components/NotificationBell';
import { useFCM } from '../hooks/useFCM';

export default function RepartidorView() {
  const { user, logout } = useAuth();
  const { activeBranchId } = useBranch();
  const [filter, setFilter] = useState('activas');

  useOrderSync({ branchId: activeBranchId });
  useFCM({ branchId: activeBranchId, userId: user?.email });

  const { driverId, driverName, loading: identityLoading } = useDriverIdentity(activeBranchId, user?.id || '');
  useDriverGeolocation(activeBranchId, driverId);

  const isAvailable = useDeliverySessionStore((s) => s.isAvailable);
  const setAvailability = useDeliverySessionStore((s) => s.setAvailability);
  const incrementCompleted = useDeliverySessionStore((s) => s.incrementCompleted);

  const filteredDeliveries = useDriverDelivery(driverId, filter);
  const driverStats = useDriverStats(driverId);

  const activeDeliveries = useMemo(
    () => filteredDeliveries.filter((o) => o.status === 'en_camino'),
    [filteredDeliveries]
  );

  // ─── Auto-availability: set available on mount ──────────
  const autoSetRef = useRef(false);
  useEffect(() => {
    if (driverId && !identityLoading && !autoSetRef.current) {
      autoSetRef.current = true;
      setAvailability(true);
      deliveryService.updateDriver(activeBranchId, driverId, { available: true });
      console.log(`🚴 ${driverName || driverId} marcado disponible automáticamente`);
    }
  }, [driverId, identityLoading, activeBranchId, driverName]);

  // Sound notification when a new delivery is assigned
  const prevActiveCount = useRef(0);
  useEffect(() => {
    if (prevActiveCount.current > 0 && activeDeliveries.length > prevActiveCount.current) {
      playBeep(660, 200);
      setTimeout(() => playBeep(880, 200), 250);
    }
    prevActiveCount.current = activeDeliveries.length;
  }, [activeDeliveries.length]);

  const handleToggleAvailability = async () => {
    if (!driverId) return;
    const newVal = !isAvailable;
    setAvailability(newVal);
    await deliveryService.updateDriver(activeBranchId, driverId, { available: newVal });
  };

  const handlePickup = async (orderId) => {
    await ordersService.updateOrderStatus(activeBranchId, orderId, 'en_camino', user?.email);
  };

  const handleDeliver = async (orderId) => {
    const result = await deliveryService.confirmDelivery(activeBranchId, orderId, driverId);
    if (result.success) {
      incrementCompleted();
      setAvailability(true);
    }
  };

  if (identityLoading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-cm-bg">
      <div className="w-full px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <Bike className="w-4 h-4 text-cm-accent" /> Repartidor
            </h1>
            <p className="text-xs text-cm-muted font-semibold mt-0.5">{driverName || 'Cargando...'}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <NotificationBell
              branchId={activeBranchId}
              userId={user?.email}
              onNavigate={() => {}}
            />
            <button
              onClick={handleToggleAvailability}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-cm-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
                isAvailable
                  ? 'bg-cm-success/10 border border-cm-success/20 text-cm-success'
                  : 'bg-cm-error/10 border border-cm-error/20 text-cm-error'
              }`}
              title={isAvailable ? 'Haga clic para ponerse Ocupado' : 'Haga clic para ponerse Disponible'}
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-cm-success animate-pulse' : 'bg-cm-error'}`} />
              {isAvailable ? 'DISPONIBLE' : 'OCUPADO'}
            </button>
          </div>
        </div>
        {!isAvailable && driverId && (
          <div className="bg-cm-warning/10 border border-cm-warning/20 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-cm-warning">No estás disponible para recibir entregas</p>
            <p className="text-xs text-cm-warning/70 mt-1">Activa tu disponibilidad para recibir pedidos</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activas', value: activeDeliveries.length, color: 'text-cm-warning' },
            { label: 'Entregadas', value: driverStats.delivered, color: 'text-cm-success' },
            { label: 'Total Hoy', value: driverStats.total, color: 'text-cm-accent' },
          ].map((stat) => (
            <div key={stat.label} className="bg-cm-surface rounded-xl border border-cm-border p-3 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[0.55rem] font-bold text-cm-text-secondary uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {(['activas', 'entregadas']).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-cm-accent text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary'}`}>
              {f === 'activas' ? 'Activas' : 'Entregadas'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-16">
              <Bike className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
              <p className="font-semibold text-cm-text-secondary">
                {filter === 'activas' ? 'No tienes entregas activas' : 'No hay entregas realizadas hoy'}
              </p>
            </div>
          ) : (
            filteredDeliveries.map((order) => (
              <DeliveryCard
                key={order.id}
                order={order}
                onPickup={handlePickup}
                onDeliver={handleDeliver}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
