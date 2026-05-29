import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { ordersService } from '../lib/ordersService';
import { deliveryService } from '../lib/deliveryService';
import {
  Bike, LogOut, Package, MapPin, Clock, CheckCircle2,
  Loader2, Phone, Navigation, Search, X, User,
} from 'lucide-react';

const STATUS_BADGE = {
  listo: 'bg-cm-info/10 text-cm-info border-cm-info/20',
  en_camino: 'bg-cm-warning/10 text-cm-warning border-cm-warning/20',
  entregado: 'bg-cm-success/10 text-cm-success border-cm-success/20',
};

export default function RepartidorView() {
  const { user, logout } = useAuth();
  const { activeBranchId } = useBranch();
  const [orders, setOrders] = useState([]);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('activas');

  const driverId = user?.id;

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = ordersService.subscribeToOrders(activeBranchId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId || !driverId) return;
    const driversRef = ref(db, `branches/${activeBranchId}/delivery/drivers`);
    const unsub = onValue(driversRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const entries = Object.entries(data);
      for (const [id, d] of entries) {
        if (d.userId === driverId || d.email === user?.email) {
          setDriver({ id, ...d });
          return;
        }
      }
    });
    return unsub;
  }, [activeBranchId, driverId, user]);

  const myDeliveries = useMemo(() => {
    if (!driver?.id) return [];
    return orders.filter(o => o.driverId === driver.id && o.order_type === 'Delivery');
  }, [orders, driver]);

  const filteredDeliveries = useMemo(() => {
    let result = myDeliveries;
    if (filter === 'activas') {
      result = result.filter(o => o.status === 'en_camino' || o.status === 'listo');
    } else if (filter === 'entregadas') {
      result = result.filter(o => o.status === 'entregado');
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [myDeliveries, filter]);

  const activeDeliveries = useMemo(() =>
    myDeliveries.filter(o => o.status === 'en_camino'),
    [myDeliveries]
  );

  const handlePickup = async (orderId) => {
    await ordersService.updateOrderStatus(activeBranchId, orderId, 'en_camino', user?.email);
  };

  const handleDeliver = async (orderId) => {
    const result = await deliveryService.confirmDelivery(activeBranchId, orderId, driver?.id);
    if (!result.success) {
      await ordersService.updateOrderStatus(activeBranchId, orderId, 'entregado', user?.email);
    }
  };

  const driverStats = useMemo(() => {
    const total = myDeliveries.length;
    const delivered = myDeliveries.filter(o => o.status === 'entregado').length;
    return { total, delivered, pending: total - delivered };
  }, [myDeliveries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cm-bg">
      <header className="bg-cm-surface border-b border-cm-border px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cm-accent rounded-xl flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-cm-text">Mis Entregas</h1>
              <p className="text-xs text-cm-text-secondary">{user?.name || 'Repartidor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driver && (
              <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded-full border ${driver.available !== false ? 'bg-cm-success/10 text-cm-success border-cm-success/20' : 'bg-cm-warning/10 text-cm-warning border-cm-warning/20'}`}>
                {driver.available !== false ? 'Disponible' : 'En ruta'}
              </span>
            )}
            <button onClick={logout} className="p-2 rounded-lg text-cm-text-secondary hover:text-cm-error hover:bg-cm-error/10 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activas', value: activeDeliveries.length, color: 'text-cm-warning' },
            { label: 'Entregadas', value: driverStats.delivered, color: 'text-cm-success' },
            { label: 'Total Hoy', value: driverStats.total, color: 'text-cm-accent' },
          ].map(stat => (
            <div key={stat.label} className="bg-cm-surface rounded-xl border border-cm-border p-3 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[0.55rem] font-bold text-cm-text-secondary uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {['activas', 'entregadas'].map(f => (
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
            filteredDeliveries.map(order => (
              <div key={order.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-cm-text-secondary">#{(order.id || '').slice(-4).toUpperCase()}</span>
                      <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[order.status] || 'bg-cm-muted/10 text-cm-muted'}`}>
                        {order.status === 'en_camino' ? 'En ruta' : order.status === 'listo' ? 'Para recoger' : order.status}
                      </span>
                    </div>
                    <p className="font-bold text-cm-text mt-1">{order.customerName || '—'}</p>
                    {order.location && (
                      <p className="text-xs text-cm-text-secondary flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" /> {order.location}
                      </p>
                    )}
                    {order.observaciones && (
                      <p className="text-[0.6rem] text-cm-warning font-semibold mt-1 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight inline-block">
                        📝 {order.observaciones}
                      </p>
                    )}
                  </div>
                  <p className="text-base font-black text-cm-text">S/ {(order.financials?.total || order.total || 0).toFixed(2)}</p>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="bg-cm-bg-alt rounded-lg p-3 mb-3 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-cm-text">x{item.quantity || 1} {item.name}</span>
                        <span className="text-cm-text-secondary font-medium text-xs">
                          S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  {order.status === 'listo' && (
                    <button onClick={() => handlePickup(order.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors">
                      <Package className="w-3.5 h-3.5" /> Recoger Pedido
                    </button>
                  )}
                  {order.status === 'en_camino' && (
                    <button onClick={() => handleDeliver(order.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cm-success text-white text-xs font-bold rounded-lg hover:bg-cm-success/80 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Entregado
                    </button>
                  )}
                  {order.location && order.status === 'en_camino' && (
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(order.location)}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
                      <Navigation className="w-3.5 h-3.5" /> Navegar
                    </a>
                  )}
                </div>

                <p className="text-[0.55rem] text-cm-text-tertiary mt-2">
                  {new Date(order.createdAt).toLocaleString('es-PE')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
