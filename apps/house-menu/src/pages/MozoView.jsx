import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ordersService } from '../lib/ordersService';
import { menuService } from '../lib/menuService';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibleBranches } from '../hooks/useAccessibleBranches';
import BranchSwitcher from '../components/BranchSwitcher';
import {
  ClipboardList, Search, LogOut, Plus, FilterX, Loader2, AlertCircle,
} from 'lucide-react';
import useOrderSync from '../worker/hooks/useOrderSync';
import { useMozoOrders } from '../mozo/hooks/useMozoOrders';
import { useOrderStore } from '../mozo/store/mozoOrderStore';
import NewOrderModal from '../mozo/components/NewOrderModal';
import CobrarModal from '../mozo/components/CobrarModal';
import MozoOrderList from '../mozo/components/MozoOrderList';
import EditOrderModal from '../components/EditOrderModal';

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };
const ivSolo = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

function AnimCounter({ value, duration = 500 }) {
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

function SkeletonBlock({ className = '' }) {
  return <div className={`bg-cm-border rounded-lg animate-pulse ${className}`} />;
}

export default function MozoView() {
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [catalog, setCatalog] = useState({ products: {} });
  const [filter, setFilter] = useState('activos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [tables, setTables] = useState(null);
  const [branchConfig, setBranchConfig] = useState(null);
  const [error, setError] = useState(null);

  useOrderSync({ branchId: activeBranchId });

  const accessibleBranches = useAccessibleBranches();

  useEffect(() => {
    if (accessibleBranches.length > 0 && activeBranchId) {
      const hasAccess = accessibleBranches.some((b) => b.id === activeBranchId);
      if (!hasAccess) {
        setActiveBranchId(accessibleBranches[0].id);
      }
    }
  }, [accessibleBranches, activeBranchId, setActiveBranchId]);

  const handleRetry = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!activeBranchId) return;
    try {
      const unsub = menuService.subscribeToCatalog(activeBranchId, (data) => {
        setCatalog(data);
        setError(null);
      });
      return () => { try { unsub(); } catch {} };
    } catch (e) {
      setError('Error al cargar el catálogo: ' + e.message);
    }
  }, [activeBranchId]);

  // Read table array for the Mozo module
  useEffect(() => {
    if (!activeBranchId) { setTables(null); return; }
    const tablesRef = ref(db, `branches/${activeBranchId}/tables`);
    const unsub = onValue(tablesRef, (snap) => {
      setError(null);
      const data = snap.val();
      const tablesArray = data ? Object.values(data) : [];
      setTables(tablesArray.length > 0 ? tablesArray : null);
    }, (err) => {
      console.warn('Mozo tables error:', err);
      setError('Error al cargar las mesas');
    });
    return unsub;
  }, [activeBranchId]);

  // Read branch config for tableCount fallback
  useEffect(() => {
    if (!activeBranchId) { setBranchConfig(null); return; }
    const configRef = ref(db, `branches_config/${activeBranchId}`);
    const unsub = onValue(configRef, (snap) => {
      setBranchConfig(snap.val());
    }, (err) => {
      console.warn('Mozo config error:', err);
    });
    return unsub;
  }, [activeBranchId]);

  // Resolve table list
  const tableList = tables ?? (
    branchConfig?.tableCount > 0
      ? Array.from({ length: branchConfig.tableCount }, (_, i) => i + 1)
      : null
  );

  const filteredOrders = useMozoOrders(filter, searchQuery);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await ordersService.updateOrderStatus(activeBranchId, orderId, newStatus, user?.email);
    } catch (e) {
      setError('Error al actualizar pedido: ' + e.message);
    }
  };

  const handleEditSave = async (items, total) => {
    if (!editOrder) return;
    setSavingEdit(true);
    try {
      const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
      await ordersService.updateOrderItems(activeBranchId, editOrder.id, {
        items,
        financials: { ...editOrder.financials, subtotal, total },
        total,
      }, user?.email);
      setEditOrder(null);
    } catch (e) {
      setError('Error al editar pedido: ' + e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const isLoading = useOrderStore((s) => s.isLoading);
  const activeCount = useOrderStore(
    (s) => s.orderIndex.filter((id) => {
      const o = s.orders[id];
      return o && o.status !== 'entregado' && o.status !== 'cancelado';
    }).length
  );

  return (
    <div className="flex-1 min-h-0 bg-cm-bg">
      <div className="w-full px-6 py-4 space-y-4">
        <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={iv} className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <ClipboardList className="w-4 h-4 text-cm-accent" /> Mozo
            </h1>
            <p className="text-xs text-cm-muted font-semibold mt-0.5 tabular-nums">
              <AnimCounter value={activeCount} /> pedidos activos
            </p>
          </div>
          <button onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent hover:bg-cm-accent-hover text-white rounded-xl text-xs font-black shadow-cm-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
            <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
          </button>
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

        <motion.div variants={iv} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o mesa..."
              className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
          </div>
          <div className="flex gap-1 self-end sm:self-auto">
            {(['activos', 'entregados', 'todos']).map((f) => (
               <button key={f} onClick={() => setFilter(f)}
                 className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                   filter === f ? 'bg-cm-accent text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
                 }`}>
                 {f === 'activos' ? 'Activos' : f === 'entregados' ? 'Entregados' : 'Todos'}
               </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={iv}>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <motion.div key={i} variants={iv} className="bg-cm-surface rounded-xl border border-cm-border p-4 space-y-2">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
                <SkeletonBlock className="h-3 w-48" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-3 w-16" />
                  <SkeletonBlock className="h-3 w-16" />
                </div>
                <div className="flex justify-between pt-1 border-t border-cm-border/50">
                  <SkeletonBlock className="h-8 w-20" />
                  <SkeletonBlock className="h-3 w-14" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <FilterX className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
            <p className="font-semibold text-cm-text-secondary">
              No hay pedidos {filter === 'activos' ? 'activos' : filter === 'entregados' ? 'entregados' : ''}
            </p>
          </div>
        ) : (
          <MozoOrderList
            orders={filteredOrders}
            onUpdateStatus={updateStatus}
            onCobrar={setCobrarOrder}
            onEdit={setEditOrder}
          />
        )}
        </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
      {showNewOrder && (
        <NewOrderModal
          activeBranchId={activeBranchId}
          userEmail={user?.email || ''}
          catalog={catalog}
          mesas={tableList}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => setFilter('activos')}
        />
      )}

      {cobrarOrder && (
        <CobrarModal
          order={cobrarOrder}
          onClose={() => setCobrarOrder(null)}
          onPaid={() => setFilter('activos')}
        />
      )}

      <EditOrderModal
        isOpen={!!editOrder}
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onSave={handleEditSave}
        saving={savingEdit}
      />
      </AnimatePresence>
    </div>
  );
}
