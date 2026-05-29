import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ordersService } from '../lib/ordersService';
import { subscribeOrdersDelta } from '../kds/data/orderSubscription';
import { deliveryService } from '../lib/deliveryService';
import {   Truck, CheckCircle2, Navigation, Package, Clock, Star, AlertTriangle, UtensilsCrossed, ShoppingBag, User, Phone, Bike, Building2, ChevronDown } from 'lucide-react';
import EmptyState from '../components/EmptyState';

import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';

const VEHICLE_ICONS = { Moto: Bike, Auto: Bike, Bicicleta: Bike, 'A Pie': Bike, Car: Bike };

export default function DispatchView() {
  const { branches, activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout, hasBranchAccess } = useAuth();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('listos');
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [showDriverAssign, setShowDriverAssign] = useState(null);
  const [toast, setToast] = useState(null);
  const [sessionDeliveries, setSessionDeliveries] = useState(0);
  const [loadingId, setLoadingId] = useState(null);
  const [showBranchSelect, setShowBranchSelect] = useState(false);

  const accessibleBranches = useMemo(() => {
    return branches.filter(b => !hasBranchAccess || hasBranchAccess(b.id));
  }, [branches, hasBranchAccess]);

  useEffect(() => {
    if (accessibleBranches.length > 0 && activeBranchId) {
      const hasAccess = accessibleBranches.some(b => b.id === activeBranchId);
      if (!hasAccess) {
        setActiveBranchId(accessibleBranches[0].id);
      }
    }
  }, [accessibleBranches, activeBranchId, setActiveBranchId]);

  useEffect(() => {
    const monthsFromNow = new Date();
    monthsFromNow.setMonth(monthsFromNow.getMonth() + 1);
    const cutDate = monthsFromNow.getTime();
    const sortedOrders = [];
    const unsub = subscribeOrdersDelta(activeBranchId, {
      onAdd(order) {
        sortedOrders.push(order);
        setOrders([...sortedOrders]);
      },
      onChange(order) {
        const idx = sortedOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          sortedOrders[idx] = order;
        } else {
          sortedOrders.push(order);
        }
        setOrders([...sortedOrders]);
      },
      onRemove(orderId) {
        const idx = sortedOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          sortedOrders.splice(idx, 1);
          setOrders([...sortedOrders]);
        }
      }
    });
    return () => unsub();
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = deliveryService.subscribeToDrivers(activeBranchId, setDrivers);
    return () => unsub();
  }, [activeBranchId]);

  const toastTimerRef = useRef(null);
  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  const handleTake = async (order) => {
    const availableDrivers = drivers.filter(d => d.available !== false);
    if (availableDrivers.length === 0) {
      showToast('No hay repartidores disponibles. Regístralos en Admin > Delivery.', 'error');
      return;
    }
    setShowDriverAssign(order);
  };

  const handleAssignDriver = async (order, driver) => {
    setShowDriverAssign(null);
    setLoadingId(order.id);
    const result = await deliveryService.assignDriver(activeBranchId, order.id, driver.id, driver.name);
    setLoadingId(null);
    if (result.success) {
      setActiveTab('en_camino');
      showToast(`#${(order.id || '').slice(-4).toUpperCase()} → ${driver.name}`, 'success');
    } else {
      showToast('Error al asignar repartidor.', 'error');
    }
  };

  const handleUnassignDriver = async (order) => {
    setLoadingId(order.id);
    const result = await deliveryService.unassignDriver(activeBranchId, order.id);
    setLoadingId(null);
    if (result.success) {
      showToast(`Repartidor desasignado de #${(order.id || '').slice(-4).toUpperCase()}`, 'success');
    } else {
      showToast('Error al desasignar.', 'error');
    }
  };

  const handleDeliverConfirm = async () => {
    if (!confirmingOrder) return;
    const confirmId = confirmingOrder.id;
    const freshOrder = orders.find(o => o.id === confirmId);
    setConfirmingOrder(null);
    setLoadingId(confirmId);

    const result = freshOrder?.driverId
      ? await deliveryService.confirmDelivery(activeBranchId, confirmId, freshOrder.driverId)
      : await ordersService.updateOrderStatus(activeBranchId, confirmId, 'entregado', user?.email);

    setLoadingId(null);

    if (result.success) {
      setSessionDeliveries(prev => prev + 1);
      const freshDriver = drivers.find(d => d.id === freshOrder?.driverId);
      showToast(`✓ ${freshDriver?.name || freshOrder?.driverName || 'Repartidor'} entregó a ${freshOrder?.customerName}`, 'success');
      setActiveTab('listos');
    } else {
      showToast('Error al registrar entrega.', 'error');
    }
  };

  const listosOrders = useMemo(() => orders.filter(o => o.status === 'listo' && o.order_type === 'Delivery'), [orders]);
  const enCaminoOrders = useMemo(() => orders.filter(o => o.status === 'en_camino' && o.order_type === 'Delivery'), [orders]);
  const branchName = branches.find(b => b.id === activeBranchId)?.name || activeBranchId;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64">

        {/* Header */}
        <header className="bg-cm-surface border-b border-cm-border p-4 shrink-0 z-10 shadow-cm-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-cm-text flex items-center gap-2">
                <Truck className="text-cm-info w-6 h-6" /> DESPACHO
              </h1>
              {accessibleBranches.length > 1 && (
                <div className="relative">
                  <button onClick={() => setShowBranchSelect(!showBranchSelect)}
                    className="flex items-center gap-1 px-2 py-1 bg-cm-bg-alt border border-cm-border rounded-md text-[0.6rem] font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
                    <Building2 className="w-3 h-3" />
                    {branchName}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showBranchSelect && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowBranchSelect(false)} />
                      <div className="absolute top-full left-0 mt-1 z-20 bg-cm-surface border border-cm-border rounded-lg shadow-cm-lg py-1 min-w-[140px]">
                        {accessibleBranches.map(b => (
                          <button key={b.id} onClick={() => { setActiveBranchId(b.id); setShowBranchSelect(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors ${b.id === activeBranchId ? 'bg-cm-accent/10 text-cm-accent' : 'text-cm-text-secondary hover:bg-cm-bg-alt'}`}>
                            {b.name || b.id}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {sessionDeliveries > 0 && (
              <div className="flex items-center gap-2 bg-cm-success/10 border-2 border-cm-success/20 px-3 py-2 rounded-xl">
                <Star className="w-4 h-4 text-cm-success" />
                <span className="text-sm font-black text-cm-success">{sessionDeliveries} {sessionDeliveries === 1 ? 'entrega' : 'entregas'}</span>
              </div>
            )}
            <span className="hidden sm:inline text-xs font-bold text-cm-text-secondary">{user?.name || user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 bg-cm-error/10 hover:bg-cm-error/20 border border-cm-error/20 rounded-xl text-xs font-black text-cm-error transition-colors"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('listos')}
              className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'listos'
                  ? 'bg-cm-info text-white shadow-cm-md'
                  : 'bg-cm-bg-alt border border-cm-border text-cm-muted hover:border-cm-info/30'
              }`}
            >
              <Package className="w-4 h-4" />
              Listos para Recoger
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'listos' ? 'bg-white/20' : 'bg-cm-info/20 text-cm-info'}`}>
                {listosOrders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('en_camino')}
              className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'en_camino'
                  ? 'bg-cm-success text-white shadow-cm-md'
                  : 'bg-cm-bg-alt border border-cm-border text-cm-muted hover:border-cm-success/30'
              }`}
            >
              <Truck className="w-4 h-4" />
              En Ruta
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'en_camino' ? 'bg-white/20' : 'bg-cm-success/20 text-cm-success'}`}>
                {enCaminoOrders.length}
              </span>
            </button>
          </div>
        </header>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 space-y-4 bg-cm-bg">
          <AnimatePresence mode="popLayout">
            {(activeTab === 'listos' ? listosOrders : enCaminoOrders).length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-64 flex items-center justify-center"
              >
                <EmptyState
                  icon={Truck}
                  title="Todos los pedidos han sido despachados"
                />
              </motion.div>
            ) : (
              (activeTab === 'listos' ? listosOrders : enCaminoOrders).map(order => {
                const isMesa = order.order_type === 'Mesa';
                const isLlevar = order.order_type === 'Para Llevar';
                const isLocal = isMesa || isLlevar;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className={`p-4 border-b-2 flex justify-between items-start ${
                      order.status === 'listo' ? 'bg-cm-info/10 border-cm-info/20' : 'bg-cm-success/10 border-cm-success/20'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h3 className="font-black text-lg text-cm-text uppercase tracking-tight">{order.customerName}</h3>
                          {isMesa && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-white bg-cm-accent px-2 py-0.5 rounded uppercase tracking-wider">
                              <UtensilsCrossed className="w-3 h-3" /> MESA
                            </span>
                          )}
                          {isLlevar && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-white bg-cm-accent px-2 py-0.5 rounded uppercase tracking-wider">
                              <ShoppingBag className="w-3 h-3" /> RECOJO
                            </span>
                          )}
                          {!isMesa && !isLlevar && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-white bg-cm-info px-2 py-0.5 rounded uppercase tracking-wider">
                              <Truck className="w-3 h-3" /> DELIVERY
                            </span>
                          )}
                        </div>
                        <p className="text-cm-muted font-bold mt-1 flex items-center gap-1.5 text-sm">
                          <Navigation className="w-3.5 h-3.5" /> {order.location}
                        </p>
                        {!isLocal && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-cm-info hover:text-cm-info/80 font-bold flex items-center gap-1 mt-1 underline underline-offset-2"
                          >
                            <Navigation className="w-3 h-3" /> Ver en Google Maps
                          </a>
                        )}
                        <p className="text-xs text-cm-muted font-bold mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs bg-cm-accent/10 text-cm-text-secondary px-2 py-1 rounded font-bold">
                          #{(order.id || '').slice(-4).toUpperCase()}
                        </span>
                        <p className="text-base font-black text-cm-accent mt-2">
                          S/ {(order.financials?.total ?? order.total ?? 0).toFixed(2)}
                        </p>
                        {(order.deliveryFee || order.financials?.deliveryFee) > 0 && (
                          <p className="text-[0.6rem] font-bold text-cm-muted mt-1">
                            Delivery: S/ {(order.deliveryFee || order.financials?.deliveryFee || 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-2">Pedido</p>
                      <ul className="space-y-1.5 mb-4">
                        {order.items?.map((item, i) => (
                          <li key={item.productId || i} className="flex justify-between items-start text-sm">
                            <div>
                              <span className="font-bold text-cm-text">{item.name}</span>
                              {item.details?.length > 0 && (
                                <span className="block text-xs text-cm-muted mt-0.5">{item.details.join(', ')}</span>
                              )}
                            </div>
                            <span className="font-bold text-cm-muted ml-4 shrink-0 text-xs">×{item.quantity || 1}</span>
                          </li>
                        ))}
                      </ul>
                      {order.observaciones && (
                        <div className="bg-cm-warning/10 border border-cm-warning/20 rounded-xl p-3 mb-4">
                          <p className="text-[0.6rem] font-bold text-cm-warning uppercase tracking-widest mb-1">Observaciones</p>
                          <p className="text-sm font-bold text-cm-warning">{order.observaciones}</p>
                        </div>
                      )}

                      {/* Driver info (for en_camino) */}
                      {order.status === 'en_camino' && order.driverName && (
                        <div className="bg-cm-info/10 border border-cm-info/20 rounded-xl p-3 mb-4">
                          <p className="text-[0.6rem] font-bold text-cm-info uppercase tracking-widest mb-1">Repartidor asignado</p>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-cm-info">
                              <User className="w-4 h-4" /> {order.driverName}
                            </span>
                            {order.driverId && (
                              <button onClick={() => handleUnassignDriver(order)}
                                disabled={loadingId === order.id}
                                className="text-xs font-bold text-cm-info hover:text-cm-info/70 underline underline-offset-2">
                                Desasignar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4">
                      {order.status === 'listo' ? (
                        isLocal ? (
                          <button
                            onClick={() => setConfirmingOrder(order)}
                            disabled={loadingId === order.id}
                            className="w-full py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110 disabled:opacity-60"
                          >
                            {loadingId === order.id ? (
                              <span className="animate-pulse">PROCESANDO...</span>
                            ) : (
                              <><CheckCircle2 className="w-5 h-5" /> ENTREGAR EN LOCAL / MESA</>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTake(order)}
                            disabled={loadingId === order.id || !drivers.some(d => d.available !== false)}
                            className="w-full py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-info text-white shadow-cm-md hover:brightness-110 disabled:opacity-60"
                            title={!drivers.some(d => d.available !== false) ? 'No hay repartidores disponibles' : ''}
                          >
                            {loadingId === order.id ? (
                              <span className="animate-pulse">PROCESANDO...</span>
                            ) : (
                              <><Truck className="w-5 h-5" /> ASIGNAR REPARTIDOR</>
                            )}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setConfirmingOrder(order)}
                          disabled={loadingId === order.id}
                          className="w-full py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110 disabled:opacity-60"
                        >
                          {loadingId === order.id ? (
                            <span className="animate-pulse">PROCESANDO...</span>
                          ) : (
                            <><CheckCircle2 className="w-5 h-5" /> CONFIRMAR ENTREGA</>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
      </AnimatePresence>
    </div>

      {/* ── Driver Assign Modal ────────────────────── */}
      <AnimatePresence>
        {showDriverAssign && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowDriverAssign(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-cm-surface rounded-2xl w-full max-w-sm overflow-hidden border border-cm-border shadow-cm-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-cm-info/10 p-6 border-b-2 border-cm-info/20">
                <div className="w-14 h-14 bg-cm-info/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cm-info/30">
                  <Truck className="w-7 h-7 text-cm-info" />
                </div>
                <h2 className="text-xl font-black text-cm-text text-center">Asignar Repartidor</h2>
                <p className="text-cm-muted text-sm text-center mt-1">
                  #{showDriverAssign.id?.slice(-4).toUpperCase()} — {showDriverAssign.customerName}
                </p>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {drivers.filter(d => d.available !== false).length === 0 ? (
                  <p className="text-center text-sm text-cm-muted py-6">No hay repartidores disponibles</p>
                ) : (
                  drivers.filter(d => d.available !== false).map(d => {
                    const VIcon = VEHICLE_ICONS[d.vehicle] || Bike;
                    return (
                      <button key={d.id} onClick={() => handleAssignDriver(showDriverAssign, d)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-cm-border hover:border-cm-info/30 hover:bg-cm-info/10 transition-all text-left active:scale-[0.98]">
                        <div className="w-10 h-10 bg-cm-info/20 rounded-full flex items-center justify-center border-2 border-cm-info/30 shrink-0">
                          <VIcon className="w-5 h-5 text-cm-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-cm-text">{d.name}</p>
                          <div className="flex items-center gap-3 text-xs text-cm-muted">
                            {d.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</span>}
                            <span>{d.vehicle}</span>
                            <span>{d.totalDeliveries || 0} entregas</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-cm-border">
                <button onClick={() => setShowDriverAssign(null)}
                  className="w-full py-3 rounded-xl font-black text-sm border border-cm-border text-cm-muted hover:bg-cm-bg transition-colors">
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Modal ─────────────────────── */}
      <AnimatePresence>
        {confirmingOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setConfirmingOrder(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-cm-surface rounded-2xl w-full max-w-sm overflow-hidden border border-cm-border shadow-cm-lg"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-cm-success/10 p-6 border-b-2 border-cm-success/20 text-center">
                  <div className="w-16 h-16 bg-cm-success/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cm-success/30">
                    <CheckCircle2 className="w-8 h-8 text-cm-success" />
                  </div>
                  <h2 className="text-xl font-black text-cm-text">¿Confirmar entrega?</h2>
                  <p className="text-cm-muted text-sm mt-1">Esta acción no se puede deshacer</p>
                </div>

                <div className="p-6 space-y-3">
                  <div className="bg-cm-bg rounded-xl p-4 border border-cm-border">
                    <p className="text-xs font-bold text-cm-muted uppercase tracking-widest mb-1">Entregando a</p>
                    <p className="font-black text-cm-text text-lg">{confirmingOrder.customerName}</p>
                  </div>

                  <div className="bg-cm-bg rounded-xl p-4 border border-cm-border">
                    <p className="text-xs font-bold text-cm-muted uppercase tracking-widest mb-1">Ubicación</p>
                    <p className="font-bold text-cm-text">{confirmingOrder.location}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setConfirmingOrder(null)}
                      className="flex-1 py-4 rounded-xl font-black text-sm border border-cm-border text-cm-muted hover:bg-cm-bg transition-colors"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={handleDeliverConfirm}
                      disabled={loadingId === confirmingOrder.id}
                      className="flex-1 py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110 disabled:opacity-60"
                    >
                      {loadingId === confirmingOrder.id ? 'PROCESANDO...' : 'CONFIRMAR'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl border-2 flex items-center gap-2 max-w-sm text-center ${
              toast.type === 'error'
                ? 'bg-cm-error text-white border-cm-error/80'
                : 'bg-cm-success text-white border-cm-success/80'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
