import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { deliveryService } from '../lib/deliveryService';
import { Bike, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import useOrderSync from '../worker/hooks/useOrderSync';
import useDeliverySessionStore from '../delivery/store/deliverySessionStore';
import { useDriverIdentity } from '../delivery/hooks/useDriverIdentity';
import { useDriverDelivery, useDriverStats } from '../delivery/hooks/useDriverDelivery';
import DeliveryCard from '../delivery/components/DeliveryCard';
import { confirmDialog } from '../components/ConfirmDialog';
import { playBeep } from '../lib/notificationSound';
import { useDriverGeolocation } from '../delivery/hooks/useDriverGeolocation';
import NotificationBell from '../components/NotificationBell';
import { useFCM } from '../hooks/useFCM';

// ── AnimCounter ──────────────────────────────────────
function AnimCounter({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    if (value === prev.current) { setDisplay(value); return; }
    const start = prev.current;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    prev.current = value;
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display}</>;
}

// ── Variants ──────────────────────────────────────────
const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };
const ivSolo = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ── Skeleton ──────────────────────────────────────────
function SkeletonBlock({ className = '' }) {
  return <div className={`bg-cm-border rounded-lg animate-pulse ${className}`} />;
}

// ── Stat card ─────────────────────────────────────────
const STATS_META = [
  { key: 'activas', label: 'Activas', color: 'text-cm-warning' },
  { key: 'entregadas', label: 'Entregadas', color: 'text-cm-success' },
  { key: 'total', label: 'Total Hoy', color: 'text-cm-accent' },
];

export default function RepartidorView() {
  const { user, logout } = useAuth();
  const { activeBranchId } = useBranch();
  const [filter, setFilter] = useState('activas');
  const [error, setError] = useState(null);

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
      deliveryService.updateDriver(activeBranchId, driverId, { available: true })
        .catch((e) => setError(`Error al marcar disponibilidad: ${e.message}`));
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

  const handleRetry = useCallback(() => setError(null), []);

  const handleToggleAvailability = async () => {
    if (!driverId) return;
    try {
      const newVal = !isAvailable;
      setAvailability(newVal);
      await deliveryService.updateDriver(activeBranchId, driverId, { available: newVal });
    } catch (e) {
      setError(`Error al cambiar disponibilidad: ${e.message}`);
      setAvailability(isAvailable); // revert
    }
  };

  const handlePickup = async (orderId) => {
    const ok = await confirmDialog('¿El repartidor recogió el pedido?', 'Recoger Pedido');
    if (!ok) return;
    try {
      await ordersService.updateOrderStatus(activeBranchId, orderId, 'en_camino', user?.email);
    } catch (e) {
      setError(`Error al recoger pedido: ${e.message}`);
    }
  };

  const handleDeliver = async (orderId) => {
    const ok = await confirmDialog('¿Confirmar que el pedido fue entregado?', 'Confirmar Entrega');
    if (!ok) return;
    try {
      const result = await deliveryService.confirmDelivery(activeBranchId, orderId, driverId);
      if (result.success) {
        incrementCompleted();
        setAvailability(true);
      } else {
        setError('Error al confirmar entrega');
      }
    } catch (e) {
      setError(`Error al confirmar entrega: ${e.message}`);
    }
  };

  const handleCobrar = async (orderId) => {
    const ok = await confirmDialog('¿Confirmar el cobro de este pedido?', 'Cobrar Contraentrega');
    if (!ok) return;
    try {
      const result = await ordersService.markAsPaidOnDelivery(activeBranchId, orderId, user?.email || 'driver', user?.displayName || user?.email || 'Repartidor');
      if (result.success) {
        setError(null);
      } else {
        setError(`Error al cobrar: ${result.error}`);
      }
    } catch (e) {
      setError(`Error al cobrar: ${e.message}`);
    }
  };

  if (identityLoading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="space-y-3 text-center">
          <Loader2 className="w-10 h-10 text-cm-accent animate-spin mx-auto" />
          <p className="text-xs font-semibold text-cm-text-secondary">Identificando repartidor...</p>
        </div>
      </div>
    );
  }

  if (error && !driverId) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <AlertCircle className="w-10 h-10 text-cm-error" />
          <p className="text-sm font-bold text-cm-error">{error}</p>
          <button onClick={handleRetry}
            className="px-5 py-2.5 text-xs font-black bg-cm-accent text-white rounded-xl hover:brightness-110 transition-all tracking-wider uppercase">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-cm-bg">
      <div className="w-full px-6 py-4 space-y-4">
        <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={iv} className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <Bike className="w-4 h-4 text-cm-accent" /> Repartidor
            </h1>
            <p className="text-xs text-cm-muted font-semibold mt-0.5">{driverName || '—'}</p>
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
        </motion.div>

        {error && (
          <motion.div variants={ivSolo}
            className="bg-cm-error/10 border border-cm-error/20 rounded-xl p-3 flex items-center justify-between">
            <p className="text-xs font-bold text-cm-error flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </p>
            <button onClick={handleRetry}
              className="text-[0.55rem] font-black text-cm-error underline underline-offset-2 uppercase tracking-wider shrink-0 ml-2">
              Cerrar
            </button>
          </motion.div>
        )}

        {!isAvailable && driverId && (
          <motion.div variants={iv} className="bg-cm-warning/10 border border-cm-warning/20 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-cm-warning">No estás disponible para recibir entregas</p>
            <p className="text-xs text-cm-warning/70 mt-1">Activa tu disponibilidad para recibir pedidos</p>
          </motion.div>
        )}

        <motion.div variants={iv} className="grid grid-cols-3 gap-3">
          {STATS_META.map((s) => (
            <div key={s.key} className="bg-cm-surface rounded-xl border border-cm-border p-3 text-center">
              <p className={`text-2xl font-black tabular-nums ${s.color}`}>
                <AnimCounter value={s.key === 'activas' ? activeDeliveries.length : s.key === 'entregadas' ? driverStats.delivered : driverStats.total} />
              </p>
              <p className="text-[0.55rem] font-bold text-cm-text-secondary uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div variants={iv} className="flex gap-1">
          {(['activas', 'entregadas']).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-cm-accent text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary'}`}>
              {f === 'activas' ? 'Activas' : 'Entregadas'}
            </button>
          ))}
        </motion.div>

        <motion.div variants={iv} className="space-y-3">
          <AnimatePresence mode="popLayout">
          {filteredDeliveries.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16">
              <Bike className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
              <p className="font-semibold text-cm-text-secondary">
                {filter === 'activas' ? 'No tienes entregas activas' : 'No hay entregas realizadas hoy'}
              </p>
            </motion.div>
          ) : (
            filteredDeliveries.map((order) => (
              <motion.div key={order.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
                <DeliveryCard
                  order={order}
                  onPickup={handlePickup}
                  onDeliver={handleDeliver}
                  onCobrar={handleCobrar}
                />
              </motion.div>
            ))
          )}
          </AnimatePresence>
        </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
