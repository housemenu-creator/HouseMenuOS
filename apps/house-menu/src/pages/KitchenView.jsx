import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { get, ref } from 'firebase/database';
import { ordersService } from '../lib/ordersService';
import { realtimeDB as db } from '@house/db';
import { History, BellRing, UtensilsCrossed, ListChecks, Search, FilterX, CheckCircle, Package } from 'lucide-react';
import { KanbanSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

import { useBranch } from '../context/BranchContext';

import KanbanColumn from '../components/KanbanColumn';
import KanbanTicket from '../components/KanbanTicket';
import StationFilter from '../kds/components/StationFilter';
import BulkActionBar from '../kds/components/BulkActionBar';
import ConnectionStatus from '../kds/components/ConnectionStatus';
import VoiceCommandBar from '../kds/components/VoiceCommandBar';
import WorkflowSettings from '../kds/components/WorkflowSettings';
import StationSoundToggle from '../kds/components/StationSoundToggle';
import useOrderStore from '../kds/store/orderStore';
import useTimerStore from '../kds/store/timerStore';
import { subscribeOrdersDelta } from '../kds/data/orderSubscription';
import { useVoiceCommands } from '../kds/hooks/useVoiceCommands';
import { KITCHEN_STATIONS } from '../kds/kdsTypes';
import { useAuth } from '../context/AuthContext';

import { playKitchenAlert } from '../kds/utils/kitchenSound';
import NewOrderFlash from '../kds/components/NewOrderFlash';
import BulkConfirmModal from '../kds/components/BulkConfirmModal';
import HistoryPanel from '../kds/components/HistoryPanel';
import UndoToast from '../kds/components/UndoToast';
import ExpoPanel from '../kds/components/ExpoPanel';
import DeliveryPanel from '../kds/components/DeliveryPanel';
import LiveStats from '../kds/components/LiveStats';
import useUndoStack from '../kds/hooks/useUndoStack';

const TICKET_STYLE = { listStyle: 'none', contentVisibility: 'auto', containIntrinsicSize: '220px' };

export default function KitchenView() {
  const { activeBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('kanban');
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('today');
  const STATIONS_WITH_SOUND = KITCHEN_STATIONS.filter((s) => s !== 'all');
  const defaultSoundMap = Object.fromEntries(STATIONS_WITH_SOUND.map((s) => [s, true]));

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('kds_sound_enabled');
      if (!saved) return { ...defaultSoundMap };
      const parsed = JSON.parse(saved);
      return { ...defaultSoundMap, ...parsed };
    } catch {
      return { ...defaultSoundMap };
    }
  });
  const prevOrdersCount = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const [stationFilter, setStationFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const orderIndex = useOrderStore(s => s.orderIndex);
  const orderMap = useOrderStore(s => s.orders);
  const isLoading = useOrderStore(s => s.isLoading);

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

  const enrichedOrders = useMemo(() => orderIndex.map((id) => orderMap[id] || null).filter(Boolean), [orderIndex, orderMap]);

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

  useEffect(() => {
    localStorage.setItem('kds_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('kds_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('kds_column_order', JSON.stringify(columnOrder));
  }, [columnOrder]);

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

  const toggleColumn = useCallback((status) => {
    setVisibleColumns((prev) => ({ ...prev, [status]: prev[status] === false }));
  }, []);

  useEffect(() => {
    if (!activeBranchId) return;

    const store = useOrderStore.getState();
    store.reset();

    const ordersPath = `branches/${activeBranchId}/orders`;
    const ordersRefDb = ref(db, ordersPath);

    let initialReceivedCount = 0;
    let isInitialBatch = true;

    get(ordersRefDb).then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        store.setInitialOrders(orderList);
      } else {
        store.setInitialOrders([]);
      }

      const recibidos = Object.values(data || {}).filter((o) => o.status === 'recibido');
      initialReceivedCount = recibidos.length;
      prevOrdersCount.current = initialReceivedCount;
      isInitialBatch = false;
    });

    const unsub = subscribeOrdersDelta(activeBranchId, {
      onAdd: (order) => {
        store.applyAdd(order);
        if (!isInitialBatch && order.status === 'recibido') {
          prevOrdersCount.current += 1;
          const station = order.station || 'grill';
          if (soundEnabledRef.current[station]) {
            playKitchenAlert(station);
          }
          setNewOrderFlash(true);
          setTimeout(() => setNewOrderFlash(false), 2000);
        }
      },
      onChange: (order) => {
        store.applyChange(order);
        if (order.status === 'recibido' && !isInitialBatch) {
          prevOrdersCount.current += 1;
          const station = order.station || 'grill';
          if (soundEnabledRef.current[station]) {
            playKitchenAlert(station);
          }
          setNewOrderFlash(true);
          setTimeout(() => setNewOrderFlash(false), 2000);
        }
      },
      onRemove: (orderId) => {
        store.applyRemove(orderId);
      },
    });

    return () => {
      unsub();
      store.reset();
    };
  }, [activeBranchId]);

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
      for (const id of ids) {
        await ordersService.updateOrderPriority(activeBranchId, id, 'rush', user?.email);
      }
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
    let result = filteredOrders.filter(o => o.status !== 'entregado');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, filteredActive.length, stationFilter, searchQuery]);

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

  if (isLoading) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-cm-bg">

      <NewOrderFlash show={newOrderFlash} />

      <header className="mb-4 flex flex-col shrink-0">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-cm-text flex items-center gap-3">
              KDS <span className="text-cm-accent">Kanban</span>
              {columnOrders.recibido.length > 0 && (
                <span className="flex items-center gap-1.5 bg-cm-accent text-white text-sm font-black px-3 py-1 rounded-full animate-pulse">
                  <BellRing className="w-4 h-4" /> {columnOrders.recibido.length}
                </span>
              )}
            </h1>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  activeTab === 'kanban' ? 'bg-cm-accent text-white shadow-cm-md' : 'bg-cm-accent/10 text-cm-muted hover:bg-cm-accent/20'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" /> Tablero ({activeOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  activeTab === 'historial' ? 'bg-cm-accent text-white shadow-cm-md' : 'bg-cm-accent/10 text-cm-muted hover:bg-cm-accent/20'
                }`}
              >
                <History className="w-4 h-4" /> Historial Hoy
              </button>
              <button
                onClick={() => setActiveTab('expo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  activeTab === 'expo' ? 'bg-cm-accent text-white shadow-cm-md' : 'bg-cm-accent/10 text-cm-muted hover:bg-cm-accent/20'
                }`}
              >
                <CheckCircle className="w-4 h-4" /> Expo ({columnOrders.listo.length})
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  activeTab === 'delivery' ? 'bg-cm-accent text-white shadow-cm-md' : 'bg-cm-accent/10 text-cm-muted hover:bg-cm-accent/20'
                }`}
              >
                <Package className="w-4 h-4" /> Delivery
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
              <span className="hidden sm:inline text-xs font-bold text-cm-text-secondary px-2">{user?.name || user?.email}</span>
              <span className="bg-cm-success/10 text-cm-success border border-cm-success/20 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest block text-center">EN SERVICIO</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-error/10 hover:bg-cm-error/20 border border-cm-error/20 rounded-full text-xs font-bold text-cm-error transition-colors"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <LiveStats orders={orderMap} orderIndex={orderIndex} />
        </div>

        {activeTab === 'kanban' && (
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

      <div className="flex-1 overflow-hidden">
        {activeTab === 'kanban' ? (
          filteredActive.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={FilterX}
                title="Ningún pedido coincide con los filtros"
                description="Intenta ajustando los filtros de estación o búsqueda."
              />
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-6 h-full pb-6" style={{
            gridTemplateColumns: `repeat(${Object.values(visibleColumns).filter(Boolean).length || 1}, minmax(0, 1fr))`
          }}>
            {visibleColumns.recibido !== false && (
              <KanbanColumn
                title="Nuevos" status="recibido" count={columnOrders.recibido.length}
                onDrop={handleDrop} className="border-cm-accent/20"
                onReorder={(ids) => handleReorder('recibido', ids)}
                orderedIds={columnOrders.recibido.map(o => o.id)}
              >
                {columnOrders.recibido.map(order => (
                  <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                    <KanbanTicket
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      selected={selectedIds.has(order.id)}
                      onToggleSelect={toggleSelect}
                      isBulkMode={isBulkMode}
                    />
                  </Reorder.Item>
                ))}
              </KanbanColumn>
            )}

            {visibleColumns.preparando !== false && (
              <KanbanColumn
                title="Preparando" status="preparando" count={columnOrders.preparando.length}
                onDrop={handleDrop} className="border-cm-warning/20"
                onReorder={(ids) => handleReorder('preparando', ids)}
                orderedIds={columnOrders.preparando.map(o => o.id)}
              >
                {columnOrders.preparando.map(order => (
                  <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                    <KanbanTicket
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      selected={selectedIds.has(order.id)}
                      onToggleSelect={toggleSelect}
                      isBulkMode={isBulkMode}
                    />
                  </Reorder.Item>
                ))}
              </KanbanColumn>
            )}

            {visibleColumns.listo !== false && (
              <KanbanColumn
                title="Listos" status="listo" count={columnOrders.listo.length}
                onDrop={handleDrop} className="border-cm-success/20"
                onReorder={(ids) => handleReorder('listo', ids)}
                orderedIds={columnOrders.listo.map(o => o.id)}
              >
                {columnOrders.listo.map(order => (
                  <Reorder.Item key={order.id} value={order.id} style={TICKET_STYLE} whileDrag={{ scale: 1.03, zIndex: 50, opacity: 0.9 }}>
                    <KanbanTicket
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      selected={selectedIds.has(order.id)}
                      onToggleSelect={toggleSelect}
                      isBulkMode={isBulkMode}
                    />
                  </Reorder.Item>
                ))}
              </KanbanColumn>
            )}
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
    </div>
  );
}
