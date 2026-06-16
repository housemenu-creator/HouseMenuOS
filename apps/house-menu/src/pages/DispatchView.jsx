import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../lib/ordersService';
import { deliveryService } from '../lib/deliveryService';
import { Truck, Package, Star, UtensilsCrossed, Loader2, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { playBeep } from '../lib/notificationSound';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/ToastContext';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibleBranches } from '../hooks/useAccessibleBranches';
import BranchSwitcher from '../components/BranchSwitcher';
import useOrderStore from '../worker/store/orderStore';
import useOrderSync from '../worker/hooks/useOrderSync';
import useDeliveryStore from '../dispatch/store/deliveryStore';
import { useDispatchOrders } from '../dispatch/hooks/useDispatchOrders';
import { useDrivers } from '../dispatch/hooks/useDrivers';
import DriverAssignModal from '../dispatch/components/DriverAssignModal';
import ConfirmDeliveryModal from '../dispatch/components/ConfirmDeliveryModal';
import DispatchStats from '../dispatch/components/DispatchStats';
import DriverStatusBoard from '../dispatch/components/DriverStatusBoard';
import DispatchOrderCard from '../dispatch/components/DispatchOrderCard';
import LiveDriverMap from '../dispatch/components/LiveDriverMap';
import NotificationBell from '../components/NotificationBell';
import { createNotification } from '../lib/notificationService';
import { useFCM } from '../hooks/useFCM';

export default function DispatchView() {
  const navigate = useNavigate();
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('listos');
  const [showDriverAssign, setShowDriverAssign] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  useOrderSync({ branchId: activeBranchId });
  useDrivers(activeBranchId);
  useFCM({ branchId: activeBranchId, userId: user?.email });

  const accessibleBranches = useAccessibleBranches();
  const drivers = useDeliveryStore((s) => s.drivers);
  const sessionDeliveries = useDeliveryStore((s) => s.sessionDeliveries);
  const addDelivery = useDeliveryStore((s) => s.addDelivery);
  const driverFilter = useDeliveryStore((s) => s.driverFilter);
  const setDriverFilter = useDeliveryStore((s) => s.setDriverFilter);
  const { listos, enCamino } = useDispatchOrders();
  const isLoadingSessions = !user;
  const [showLocalOrders, setShowLocalOrders] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [focusedDriverId, setFocusedDriverId] = useState(null);

  // Sound notification when new orders arrive
  const prevListosCount = useRef(0);
  useEffect(() => {
    if (prevListosCount.current > 0 && listos.length > prevListosCount.current) {
      playBeep(880, 250);
      setTimeout(() => playBeep(1100, 200), 300);
    }
    prevListosCount.current = listos.length;
  }, [listos.length]);

  const isDeliveryOrder = (o) => (o.type || o.order_type || '').toLowerCase().includes('delivery');
  const filteredListos = showLocalOrders ? listos : listos.filter(isDeliveryOrder);
  const filteredEnCamino = showLocalOrders ? enCamino : enCamino.filter(isDeliveryOrder);

  const handleTake = async (order) => {
    const available = drivers.filter((d) => d.available !== false);
    if (available.length === 0) {
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
      showToast(`#${(order.id || '').slice(-4).toUpperCase()} → ${driver.name}`);
      // Notify driver
      await createNotification({
        branchId: activeBranchId,
        userId: driver.email || `${driver.id}@driver`,
        type: 'order_assigned',
        title: 'Nuevo pedido asignado',
        body: `Pedido de ${order.customerName || 'cliente'} — ${order.location || ''}`,
        orderId: order.id,
      });
      // Notify dispatcher
      await createNotification({
        branchId: activeBranchId,
        userId: user?.email,
        type: 'order_assigned',
        title: `#${(order.id || '').slice(-4).toUpperCase()} asignado`,
        body: `${driver.name} recogió pedido de ${order.customerName || 'cliente'}`,
        orderId: order.id,
      });
    } else {
      showToast('Error al asignar repartidor.', 'error');
    }
  };

  const handleUnassignDriver = async (order) => {
    setLoadingId(order.id);
    const result = await deliveryService.unassignDriver(activeBranchId, order.id);
    setLoadingId(null);
    if (result.success) {
      showToast(`Repartidor desasignado de #${(order.id || '').slice(-4).toUpperCase()}`);
    } else {
      showToast('Error al desasignar.', 'error');
    }
  };

  const handleDeliverConfirm = async () => {
    if (!confirmingOrder) return;
    const orderId = confirmingOrder.id;
    const freshOrder = useOrderStore.getState().orders[orderId];
    setConfirmingOrder(null);
    setLoadingId(orderId);

    const result = freshOrder?.driverId
      ? await deliveryService.confirmDelivery(activeBranchId, orderId, freshOrder.driverId)
      : await ordersService.updateOrderStatus(activeBranchId, orderId, 'entregado', user?.email);

    setLoadingId(null);
    if (result.success) {
      addDelivery();
      const freshDriver = drivers.find((d) => d.id === freshOrder?.driverId);
      showToast(`✓ ${freshDriver?.name || freshOrder?.driverName || 'Repartidor'} entregó a ${freshOrder?.customerName}`);
      // Notify dispatcher
      await createNotification({
        branchId: activeBranchId,
        userId: user?.email,
        type: 'delivery_confirmed',
        title: 'Entrega confirmada',
        body: `${freshDriver?.name || 'Repartidor'} entregó a ${freshOrder?.customerName || 'cliente'}`,
        orderId: orderId,
      });
      setActiveTab('listos');
    } else {
      showToast('Error al registrar entrega.', 'error');
    }
  };

  const currentOrders = (activeTab === 'listos' ? filteredListos : filteredEnCamino)
    .filter((o) => !focusedDriverId || o.driverId === focusedDriverId);
  const availableDrivers = drivers.filter((d) => d.available !== false).length;
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  useEffect(() => {
    if (listos.length > 0 || enCamino.length > 0) setOrdersLoaded(true);
  }, [listos, enCamino]);
  const isLoading = isLoadingSessions || !ordersLoaded;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <header className="bg-cm-surface border-b border-cm-border p-4 shrink-0 z-10 shadow-cm-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <Truck className="text-cm-info w-4 h-4" /> Despacho
            </h1>
            <BranchSwitcher
              branches={accessibleBranches}
              activeBranchId={activeBranchId}
              onSwitch={setActiveBranchId}
            />
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell
              branchId={activeBranchId}
              userId={user?.email}
              onNavigate={(url) => navigate(url)}
            />
            {sessionDeliveries > 0 && (
              <div className="flex items-center gap-1.5 bg-cm-success/10 border border-cm-success/20 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 text-cm-success" />
                <span className="text-xs font-black text-cm-success">{sessionDeliveries} {sessionDeliveries === 1 ? 'entrega' : 'entregas'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <DispatchStats
            enCaminoCount={filteredEnCamino.length}
            listosCount={filteredListos.length}
            sessionDeliveries={sessionDeliveries}
            availableDrivers={availableDrivers}
            totalDrivers={drivers.filter((d) => d.active !== false).length}
          />
          <button onClick={() => setShowLocalOrders(!showLocalOrders)}
            className={`shrink-0 self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] font-bold uppercase tracking-wider transition-colors border ${
              showLocalOrders
                ? 'bg-cm-accent/10 text-cm-accent border-cm-accent/20'
                : 'bg-cm-bg-alt text-cm-text-tertiary border-cm-border'
            }`}
            title="Mostrar/ocultar pedidos de local">
            <UtensilsCrossed className="w-3 h-3" />
            Local
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => setActiveTab('listos')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'listos'
                ? 'bg-cm-info text-white shadow-cm-md'
                : 'bg-cm-bg-alt border border-cm-border text-cm-muted hover:border-cm-info/30'
            }`}>
            <Package className="w-4 h-4" />
            Listos para Recoger
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'listos' ? 'bg-white/20' : 'bg-cm-info/20 text-cm-info'}`}>
              {filteredListos.length}
            </span>
          </button>
          <button onClick={() => setActiveTab('en_camino')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'en_camino'
                ? 'bg-cm-success text-white shadow-cm-md'
                : 'bg-cm-bg-alt border border-cm-border text-cm-muted hover:border-cm-success/30'
            }`}>
            <Truck className="w-4 h-4" />
            En Ruta
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'en_camino' ? 'bg-white/20' : 'bg-cm-success/20 text-cm-success'}`}>
              {filteredEnCamino.length}
            </span>
          </button>
        </div>
      </header>

      {/* ── Driver focus indicator ── */}
      {focusedDriverId && (
        <div className="shrink-0 bg-cm-info/10 border-b border-cm-info/20 px-4 py-2 flex items-center justify-between">
          <p className="text-xs font-bold text-cm-info flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5" />
            Mostrando pedidos de: {drivers.find((d) => d.id === focusedDriverId)?.name || focusedDriverId}
          </p>
          <button
            onClick={() => setFocusedDriverId(null)}
            className="text-[10px] font-black text-cm-info/60 hover:text-cm-info uppercase tracking-wider"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* ── Live Map toggle ── */}
      <div className="shrink-0 bg-cm-surface border-b border-cm-border">
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-cm-muted hover:text-cm-text transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-cm-info" />
            Mapa de repartidores
            <span className="px-1.5 py-0.5 rounded-full bg-cm-info/10 text-cm-info text-[10px] font-black">
              {drivers.filter((d) => d.lastPosition?.lat).length}
            </span>
          </div>
          {showMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showMap && (
            <motion.div
              key="map"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 280, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <LiveDriverMap drivers={drivers} enCaminoOrders={enCamino} focusedDriverId={focusedDriverId} onFocusDriver={setFocusedDriverId} branchCenter={activeBranch?.coordinates} className="w-full h-[280px] rounded-none border-0 border-t border-cm-border" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 space-y-4 bg-cm-bg">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
          </div>
        ) : (
          <>
        <DriverStatusBoard
          drivers={drivers}
          driverFilter={driverFilter}
          loading={false}
          onFilterChange={setDriverFilter}
        />

        <AnimatePresence mode="popLayout">
          {currentOrders.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-64 flex items-center justify-center">
              <EmptyState icon={Truck} title={activeTab === 'listos' ? 'No hay pedidos listos para despachar' : 'No hay pedidos en ruta'} />
            </motion.div>
          ) : (
            currentOrders.map((order) => (
              <DispatchOrderCard
                key={order.id}
                order={order}
                loadingId={loadingId}
                onAssignDriver={handleTake}
                onConfirmDelivery={(o) => setConfirmingOrder(o)}
                onUnassignDriver={handleUnassignDriver}
              />
            ))
          )}
        </AnimatePresence>
        </>
        )}
      </div>

      <DriverAssignModal
        order={showDriverAssign}
        drivers={drivers}
        onAssign={handleAssignDriver}
        onClose={() => setShowDriverAssign(null)}
      />

      <ConfirmDeliveryModal
        order={confirmingOrder}
        loading={loadingId === confirmingOrder?.id}
        onConfirm={handleDeliverConfirm}
        onClose={() => setConfirmingOrder(null)}
      />
    </div>
  );
}
