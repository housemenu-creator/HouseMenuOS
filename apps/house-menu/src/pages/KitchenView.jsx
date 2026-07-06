import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Reorder } from 'framer-motion';
import { ordersService } from '../lib/ordersService';
import { History, BellRing, UtensilsCrossed, ListChecks, Search, FilterX, CheckCircle, Package, Boxes } from 'lucide-react';
import { KDSSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

import { useBranch } from '../context/BranchContext';

import KDSColumn from '../kds/components/KDSColumn';
import KDSTicket from '../kds/components/KDSTicket';
import StationFilter from '../kds/components/StationFilter';
import BulkActionBar from '../kds/components/BulkActionBar';
import ConnectionStatus from '../kds/components/ConnectionStatus';
import VoiceCommandBar from '../kds/components/VoiceCommandBar';
import WorkflowSettings from '../kds/components/WorkflowSettings';
import StationSoundToggle from '../kds/components/StationSoundToggle';
import useTimerStore from '../kds/store/timerStore';
import useOrderSync from '../worker/hooks/useOrderSync';
import { useVoiceCommands } from '../kds/hooks/useVoiceCommands';
import { KITCHEN_STATIONS, STATION_PREP_TIMES } from '../kds/kdsTypes';
import { inferStationFromItem, inferOrderStation } from '../kds/utils/stationInference';
import { useOrderStore, useEnrichedOrders, useIsKDSLoading } from '../kds/store/orderStore';
import { useAuth } from '../context/AuthContext';

import CancelOrderModal from '../kds/components/CancelOrderModal';
import NewOrderFlash from '../kds/components/NewOrderFlash';
import BulkConfirmModal from '../kds/components/BulkConfirmModal';
import HistoryPanel from '../kds/components/HistoryPanel';
import UndoToast from '../kds/components/UndoToast';
import ExpoPanel from '../kds/components/ExpoPanel';
import DeliveryPanel from '../kds/components/DeliveryPanel';
import LiveStats from '../kds/components/LiveStats';
import useUndoStack from '../kds/hooks/useUndoStack';
import { useNotifications } from '../kds/hooks/useNotifications';
import { playKitchenAlert, getAudioContext } from '../kds/utils/kitchenSound';

// Nuevos imports agregados
import ConsolidatedPanel from '../kds/components/ConsolidatedPanel';
import InventoryPanel from '../kds/components/InventoryPanel';
import useCatalogSync from '../worker/hooks/useCatalogSync';
import useCatalogStore from '../worker/store/catalogStore';
import useKDSKeyboard from '../kds/hooks/useKDSKeyboard';

const TICKET_STYLE = { listStyle: 'none', contentVisibility: 'auto', containIntrinsicSize: '220px' };

function announceOrderTTS(order) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Cancelar cualquier lectura anterior para que no se superpongan
    
    const itemsText = order.items
      ?.map((item) => `${item.quantity || 1} ${item.name}`)
      .join(', ');
      
    const text = `Nuevo pedido de ${order.customerName}. Detalle: ${itemsText}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95; // Velocidad de lectura cómoda
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Text-to-speech announcement failed:', e);
  }
}

export default function KitchenView() {
  const { activeBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // Persistencia de configuraciones de KDS
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_visible_columns');
      if (!saved) return { recibido: true, preparando: true, listo: true };
      const parsed = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) return { recibido: true, preparando: true, listo: true };
      return { recibido: true, preparando: true, listo: true, ...parsed };
    } catch {
      return { recibido: true, preparando: true, listo: true };
    }
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_column_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('kds_font_size') || 'normal';
  });

  const [density, setDensity] = useState(() => {
    return localStorage.getItem('kds_density') || 'cozy';
  });

  const [showConsolidated, setShowConsolidated] = useState(() => {
    return localStorage.getItem('kds_show_consolidated') !== 'false';
  });

  const [stationFilter, setStationFilter] = useState(() => {
    return localStorage.getItem('kds_station_filter') || 'all';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [cancelOrder, setCancelOrder] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('today');
  const STATIONS_WITH_SOUND = KITCHEN_STATIONS.filter((s) => s !== 'all');
  const defaultSoundMap = Object.fromEntries(STATIONS_WITH_SOUND.map((s) => [s, true]));

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('kds_sound_enabled');
    return stored !== null ? JSON.parse(stored) : defaultSoundMap;
  });

  const [selectedIds, setSelectedIds] = useState(new Set());

  const orderIndex = useOrderStore(s => s.orderIndex);
  const orderMap = useOrderStore(s => s.orders);
  const isLoading = useOrderStore(s => s.isLoading);

  // Sincronización del catálogo para la pestaña de inventario
  useCatalogSync();
  const products = useCatalogStore((s) => s.products);
  const catalog = useMemo(() => ({ products }), [products]);

  const toggleSelect = useCallback((orderId) => {
    setSelectedIds((prev) => {
      if (prev.has(orderId)) {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      }
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const enrichedOrders = useMemo(() => {
    function calcDueTime(order) {
      const station = order.station || inferOrderStation(order);
      const prepMin = STATION_PREP_TIMES[station] || 5;
      const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
      return createdAt + prepMin * 60 * 1000;
    }
    return orderIndex.map((id) => {
      const order = orderMap[id];
      if (!order) return null;
      const station = order.station || inferOrderStation(order);
      return { ...order, station, dueTime: calcDueTime({ ...order, station }) };
    }).filter(Boolean);
  }, [orderIndex, orderMap]);

  const stationCounts = useMemo(() => {
    const counts = Object.fromEntries(KITCHEN_STATIONS.map((s) => [s, 0]));
    counts.all = enrichedOrders.length;
    for (const o of enrichedOrders) {
      if (counts[o.station] !== undefined) counts[o.station]++;
    }
    return counts;
  }, [enrichedOrders]);

  const filteredOrders = useMemo(() => {
    if (stationFilter === 'all') return enrichedOrders;
    return enrichedOrders.filter((o) => {
      if (o.station === stationFilter) return true;
      return o.items?.some((i) => i.station === stationFilter);
    });
  }, [enrichedOrders, stationFilter]);

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem('kds_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('kds_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('kds_column_order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem('kds_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('kds_density', density);
  }, [density]);

  useEffect(() => {
    localStorage.setItem('kds_show_consolidated', JSON.stringify(showConsolidated));
  }, [showConsolidated]);

  useEffect(() => {
    localStorage.setItem('kds_station_filter', stationFilter);
  }, [stationFilter]);

  const handleVoiceCommand = useCallback((idFragment, targetStatus) => {
    if (!idFragment) return;
    const { orders, orderIndex } = useOrderStore.getState();
    const fragment = idFragment.toLowerCase();
    const match = orderIndex
      .map((id) => orders[id])
      .find(
        (o) => o.id.toLowerCase().includes(fragment)
          || o.id.slice(-4).toLowerCase() === fragment
          || o.customerName?.toLowerCase().includes(fragment)
      );
    if (match && match.status !== targetStatus) {
      ordersService.updateOrderStatus(activeBranchId, match.id, targetStatus);
    }
  }, [activeBranchId]);

  const { isListening, toggleListening, transcript } = useVoiceCommands(handleVoiceCommand);
  const { history, push: pushUndo, undo: handleUndo, canUndo } = useUndoStack();

  // FCM push notifications
  const [flashMessage, setFlashMessage] = useState(null);
  const { foregroundMsg, dismissForeground } = useNotifications(stationFilter === 'all' ? 'all' : stationFilter);
  useEffect(() => {
    if (!foregroundMsg) return;
    const data = foregroundMsg.data || {};
    const notif = foregroundMsg.notification || {};
    const msg = notif.body || data.body || null;
    setFlashMessage(msg);
    setNewOrderFlash(true);
    const t = setTimeout(() => { setNewOrderFlash(false); setFlashMessage(null); dismissForeground(); }, 3000);
    return () => clearTimeout(t);
  }, [foregroundMsg, dismissForeground]);

  const toggleColumn = useCallback((status) => {
    setVisibleColumns((prev) => ({ ...prev, [status]: prev[status] === false }));
  }, []);

  useOrderSync({ branchId: activeBranchId });

  const prevOrderCountRef = useRef(0);
  useEffect(() => {
    const count = useOrderStore.getState().orderIndex.length;
    if (prevOrderCountRef.current > 0 && count > prevOrderCountRef.current) {
      const orders = useOrderStore.getState().orders;
      const newIds = useOrderStore.getState().orderIndex.slice(prevOrderCountRef.current);
      for (const id of newIds) {
        const o = orders[id];
        if (o?.status === 'recibido') {
          setNewOrderFlash(true);
          setTimeout(() => setNewOrderFlash(false), 2000);

          const station = inferOrderStation(o);
          const stationMuted = soundEnabled[station] === false;
          if (!stationMuted) {
            playKitchenAlert(station);
            
            // Text to speech locución por voz
            if (stationFilter === 'all' || station === stationFilter) {
              announceOrderTTS(o);
            }
          }

          break;
        }
      }
    }
    prevOrderCountRef.current = count;
  }, [orderIndex, soundEnabled, stationFilter]);

  useEffect(() => {
    const initAudio = () => {
      try { getAudioContext(); } catch {}
    };
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'programado') nextStatus = 'recibido';
    else if (currentStatus === 'recibido') nextStatus = 'preparando';
    else if (currentStatus === 'preparando') nextStatus = 'listo';
    else if (currentStatus === 'listo') nextStatus = 'entregado';

    if (nextStatus) {
      const result = await ordersService.updateOrderStatus(activeBranchId, orderId, nextStatus, user?.email);
      if (result.success) pushUndo(orderId, currentStatus, nextStatus);
    }
  };

  const handleDrop = async (orderId, targetStatus) => {
    const order = useOrderStore.getState().orders[orderId];
    if (!order) return;
    if (order.status !== targetStatus) {
      const result = await ordersService.updateOrderStatus(activeBranchId, orderId, targetStatus, user?.email);
      if (result.success) pushUndo(orderId, order.status, targetStatus);
    }
  };

  const handleDeliver = useCallback(async (orderId) => {
    const order = useOrderStore.getState().orders[orderId];
    if (!order) return;
    const result = await ordersService.updateOrderStatus(activeBranchId, orderId, 'entregado', user?.email);
    if (result.success) pushUndo(orderId, order.status, 'entregado');
  }, [activeBranchId, pushUndo]);

  const handleCancel = useCallback(async (orderId, reason) => {
    const result = await ordersService.updateOrderStatus(activeBranchId, orderId, 'cancelado', user?.email, reason);
    if (result.success) pushUndo(orderId, 'cancelado', 'cancelado');
    setCancelOrder(null);
  }, [activeBranchId, pushUndo, user?.email]);

  const [bulkConfirm, setBulkConfirm] = useState(null);

  const handleBulkAction = useCallback((targetStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkConfirm({ targetStatus, count: ids.length });
  }, [selectedIds]);

  const executeBulkAction = useCallback(async () => {
    if (!bulkConfirm) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (bulkConfirm.targetStatus === 'rush') {
      await Promise.all(ids.map((id) =>
        ordersService.updateOrderPriority(activeBranchId, id, 'rush', user?.email)
      ));
    } else {
      await ordersService.batchUpdateOrderStatus(activeBranchId, ids, bulkConfirm.targetStatus);
    }
    setBulkConfirm(null);
    clearSelection();
    setIsBulkMode(false);
  }, [bulkConfirm, selectedIds, activeBranchId, clearSelection, user]);

  const handleCancelBulkAction = useCallback(() => {
    setBulkConfirm(null);
  }, []);

  const handleReorder = useCallback((status, reorderedIds) => {
    setColumnOrder((prev) => ({ ...prev, [status]: reorderedIds }));
  }, []);

  const { activeOrders, historyOrders, totalSales } = useMemo(() => {
    const active = [];
    const history = [];
    let totalSales = 0;
    for (const id of orderIndex) {
      const o = orderMap[id];
      if (!o) continue;
      if (o.status === 'entregado') {
        history.push(o);
        totalSales += o.financials?.total || 0;
      } else {
        active.push(o);
      }
    }
    return { activeOrders: active, historyOrders: history, totalSales };
  }, [orderIndex, orderMap]);

  const readyOrders = useMemo(
    () => orderIndex.map((id) => orderMap[id]).filter((o) => o?.status === 'listo'),
    [orderIndex, orderMap]
  );

  const filteredActive = useMemo(() => {
    let result = filteredOrders.filter(o => o.status !== 'entregado' && o.status !== 'pendiente_pago');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(o =>
        o.customerName?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.id?.slice(-6).toLowerCase() === q ||
        o.location?.toLowerCase().includes(q) ||
        o.tableNumber?.toString().includes(q)
      );
    }
    return result;
  }, [filteredOrders, searchQuery]);

  const filteredHistoryOrders = useMemo(() => {
    if (historyDateFilter === 'all') return historyOrders;
    const now = new Date();
    return historyOrders.filter((o) => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      if (historyDateFilter === 'today') return d.toDateString() === now.toDateString();
      if (historyDateFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (historyDateFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [historyOrders, historyDateFilter]);

  useEffect(() => {
    if (isLoading) return;
    const activeOrdersList = filteredActive.filter(o => o.status !== 'entregado' && o.status !== 'cancelado');
    const timer = useTimerStore.getState();
    timer.stopTicker();
    timer.recalcVisible(activeOrdersList);
    timer.tickVisible(activeOrdersList);
    return () => timer.stopTicker();
  }, [isLoading, filteredActive, stationFilter, searchQuery]);

  const columnOrders = useMemo(() => {
    const sortByDueTime = (list) =>
      [...list].sort((a, b) => (a.dueTime || 0) - (b.dueTime || 0));

    const buildColumn = (orders, status) => {
      const customOrder = columnOrder[status];
      if (customOrder && customOrder.length > 0) {
        const customMap = new Map(orders.map((o) => [o.id, o]));
        const ordered = [];
        const remaining = [];
        const seen = new Set();
        for (const id of customOrder) {
          if (customMap.has(id)) {
            ordered.push(customMap.get(id));
            seen.add(id);
          }
        }
        for (const o of orders) {
          if (!seen.has(o.id)) remaining.push(o);
        }
        return [...ordered, ...sortByDueTime(remaining)];
      }
      return sortByDueTime(orders);
    };

    const rawRecibido = [];
    const rawPreparando = [];
    const rawListo = [];
    for (const o of filteredActive) {
      if (o.status === 'recibido') rawRecibido.push(o);
      else if (o.status === 'preparando') rawPreparando.push(o);
      else if (o.status === 'listo') rawListo.push(o);
    }
    return {
      recibido: buildColumn(rawRecibido, 'recibido'),
      preparando: buildColumn(rawPreparando, 'preparando'),
      listo: buildColumn(rawListo, 'listo'),
    };
  }, [filteredActive, columnOrder]);

  // Hook de atajos de teclado para Bump Bar
  useKDSKeyboard({
    columnOrders,
    onUpdateStatus: handleUpdateStatus,
    onUndo: () => handleUndo(activeBranchId),
    activeStation: stationFilter,
    onStationChange: setStationFilter,
    activeTab,
    setActiveTab,
  });

  if (isLoading) {
    return <KDSSkeleton />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-cm-bg select-none">

      <NewOrderFlash show={newOrderFlash} message={flashMessage} />

      <header className="mb-4 flex flex-col shrink-0 px-4 pt-4">
        <div className="flex justify-between items-end mb-3 flex-wrap gap-4">
          <div>
          <h1 className="text-2xl font-black tracking-tight text-cm-text flex items-center gap-2.5">
              🍳 House <span className="text-cm-accent">KDS</span>
              {columnOrders.recibido.length > 0 && (
                <span className="flex items-center gap-1.5 bg-cm-accent text-white text-xs font-black px-2.5 py-1 rounded-full shadow-cm-md">
                  <BellRing className="w-3.5 h-3.5 animate-pulse" /> {columnOrders.recibido.length} nuevo{columnOrders.recibido.length > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <div className="flex gap-1.5 mt-4 flex-wrap p-1 bg-cm-bg rounded-xl border border-cm-border/60 w-fit">
              <button
                onClick={() => setActiveTab('board')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'board' ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border/80' : 'text-cm-muted/60 hover:text-cm-muted'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" /> Tablero
                <span className={`ml-1 text-[0.6rem] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === 'board' ? 'bg-cm-accent/15 text-cm-accent' : 'bg-cm-muted/10 text-cm-muted/40'
                }`}>{activeOrders.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'historial' ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border/80' : 'text-cm-muted/60 hover:text-cm-muted'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Historial
              </button>
              <button
                onClick={() => setActiveTab('expo')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'expo' ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border/80' : 'text-cm-muted/60 hover:text-cm-muted'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Expo
                {columnOrders.listo.length > 0 && (
                  <span className={`ml-1 text-[0.6rem] font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === 'expo' ? 'bg-cm-success/15 text-cm-success' : 'bg-cm-success/10 text-cm-success/60'
                  }`}>{columnOrders.listo.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'delivery' ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border/80' : 'text-cm-muted/60 hover:text-cm-muted'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Delivery
              </button>
              <button
                onClick={() => setActiveTab('inventario')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'inventario' ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border/80' : 'text-cm-muted/60 hover:text-cm-muted'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" /> Inventario
              </button>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            {activeTab === 'historial' && (
              <div className="mb-2">
                <span className="text-xs text-cm-muted block tracking-widest uppercase">Ventas Completadas</span>
                <span className="text-2xl font-bold text-cm-accent">S/ {totalSales.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <ConnectionStatus />
              <VoiceCommandBar
                isListening={isListening}
                onToggle={toggleListening}
                transcript={transcript}
              />
              <WorkflowSettings
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                density={density}
                onDensityChange={setDensity}
                showConsolidated={showConsolidated}
                onToggleConsolidated={setShowConsolidated}
              />
              <StationSoundToggle
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                stations={STATIONS_WITH_SOUND}
              />
              <button
                onClick={() => { setIsBulkMode(!isBulkMode); clearSelection(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  isBulkMode ? 'bg-cm-accent text-white shadow-cm-md' : 'bg-cm-muted/10 text-cm-muted/50 hover:bg-cm-muted/20 hover:text-cm-muted/70'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Masivo
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <LiveStats orders={orderMap} orderIndex={orderIndex} />
        </div>

        {activeTab === 'board' && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <StationFilter
              activeStation={stationFilter}
              onStationChange={setStationFilter}
              counts={stationCounts}
              className="flex-1"
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-muted/30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar orden…"
                className="w-48 bg-cm-muted/5 border border-cm-border/10 rounded-full pl-9 pr-4 py-2 text-xs text-cm-text/70 placeholder:text-cm-muted/30 focus:outline-none focus:border-cm-accent/20 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cm-muted/30 hover:text-cm-muted/60"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-hidden px-4">
        {activeTab === 'board' ? (
          filteredActive.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={FilterX}
                title="Ningún pedido coincide con los filtros"
                description="Intenta ajustando los filtros de estación o búsqueda."
              />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 h-full pb-6 overflow-hidden">
              {/* Panel Consolidado de Insumos */}
              {showConsolidated && (
                <div className="w-full md:w-80 shrink-0 flex flex-col max-h-[35vh] md:max-h-none md:h-full">
                  <ConsolidatedPanel activeOrders={filteredActive} activeStation={stationFilter} />
                </div>
              )}

              {/* Columnas KDS Kanban */}
              <div className="flex-1 min-h-0 h-full overflow-hidden">
                <div className="grid grid-cols-1 gap-6 h-full" style={{
                  gridTemplateColumns: `repeat(${Object.values(visibleColumns).filter(Boolean).length || 1}, minmax(0, 1fr))`
                }}>
                  {visibleColumns.recibido !== false && (
                    <KDSColumn
                      title="Nuevos" status="recibido" count={columnOrders.recibido.length}
                      onDrop={handleDrop} className="border-cm-accent/20"
                      onReorder={(ids) => handleReorder('recibido', ids)}
                      orderedIds={columnOrders.recibido.map(o => o.id)}
                    >
                      {columnOrders.recibido.map(order => (
                        <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                          <KDSTicket
                            order={order}
                            onUpdateStatus={handleUpdateStatus}
                            onCancel={() => setCancelOrder(order)}
                            selected={selectedIds.has(order.id)}
                            onToggleSelect={toggleSelect}
                            isBulkMode={isBulkMode}
                            fontSize={fontSize}
                            density={density}
                            activeStation={stationFilter}
                          />
                        </Reorder.Item>
                      ))}
                    </KDSColumn>
                  )}

                  {visibleColumns.preparando !== false && (
                    <KDSColumn
                      title="Preparando" status="preparando" count={columnOrders.preparando.length}
                      onDrop={handleDrop} className="border-cm-warning/20"
                      onReorder={(ids) => handleReorder('preparando', ids)}
                      orderedIds={columnOrders.preparando.map(o => o.id)}
                    >
                      {columnOrders.preparando.map(order => (
                        <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                          <KDSTicket
                            order={order}
                            onUpdateStatus={handleUpdateStatus}
                            onCancel={() => setCancelOrder(order)}
                            selected={selectedIds.has(order.id)}
                            onToggleSelect={toggleSelect}
                            isBulkMode={isBulkMode}
                            fontSize={fontSize}
                            density={density}
                            activeStation={stationFilter}
                          />
                        </Reorder.Item>
                      ))}
                    </KDSColumn>
                  )}

                  {visibleColumns.listo !== false && (
                    <KDSColumn
                      title="Listos" status="listo" count={columnOrders.listo.length}
                      onDrop={handleDrop} className="border-cm-success/20"
                      onReorder={(ids) => handleReorder('listo', ids)}
                      orderedIds={columnOrders.listo.map(o => o.id)}
                    >
                      {columnOrders.listo.map(order => (
                        <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                          <KDSTicket
                            order={order}
                            onUpdateStatus={handleUpdateStatus}
                            onCancel={() => setCancelOrder(order)}
                            selected={selectedIds.has(order.id)}
                            onToggleSelect={toggleSelect}
                            isBulkMode={isBulkMode}
                            fontSize={fontSize}
                            density={density}
                            activeStation={stationFilter}
                          />
                        </Reorder.Item>
                      ))}
                    </KDSColumn>
                  )}
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'expo' ? (
          <ExpoPanel
            readyOrders={readyOrders}
            onDeliver={handleDeliver}
          />
        ) : activeTab === 'delivery' ? (
          <DeliveryPanel
            readyOrders={readyOrders}
            onHandoff={handleDeliver}
          />
        ) : activeTab === 'inventario' ? (
          <div className="h-full overflow-y-auto pr-2 pb-10 scrollbar-hide">
            <InventoryPanel catalog={catalog} />
          </div>
        ) : (
          <HistoryPanel
            orders={enrichedOrders}
            filteredOrders={filteredHistoryOrders}
            dateFilter={historyDateFilter}
            onDateFilterChange={setHistoryDateFilter}
          />
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onBulkAction={handleBulkAction}
        onClearSelection={() => { clearSelection(); setIsBulkMode(false); }}
      />

      <BulkConfirmModal
        bulkConfirm={bulkConfirm}
        onConfirm={executeBulkAction}
        onCancel={handleCancelBulkAction}
      />

      <UndoToast
        history={history}
        onUndo={() => handleUndo(activeBranchId)}
        canUndo={canUndo}
      />

      <CancelOrderModal
        order={cancelOrder}
        isOpen={cancelOrder !== null}
        onClose={() => setCancelOrder(null)}
        onConfirm={handleCancel}
      />
    </div>
  );
}
