import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { ordersService } from '../lib/ordersService';
import { menuService } from '../lib/menuService';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibleBranches } from '../hooks/useAccessibleBranches';
import BranchSwitcher from '../components/BranchSwitcher';
import {
  ClipboardList, Search, LogOut, Plus, FilterX, Loader2,
} from 'lucide-react';
import useOrderSync from '../worker/hooks/useOrderSync';
import { useMozoOrders } from '../mozo/hooks/useMozoOrders';
import { useOrderStore } from '../mozo/store/mozoOrderStore';
import NewOrderModal from '../mozo/components/NewOrderModal';
import CobrarModal from '../mozo/components/CobrarModal';
import MozoOrderList from '../mozo/components/MozoOrderList';

export default function MozoView() {
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [catalog, setCatalog] = useState({ products: {} });
  const [filter, setFilter] = useState('activos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
  const [tables, setTables] = useState(null);
  const [branchConfig, setBranchConfig] = useState(null);

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

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = menuService.subscribeToCatalog(activeBranchId, (data) => {
      setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  // Read table array for the Mozo module
  useEffect(() => {
    if (!activeBranchId) { setTables(null); return; }
    const tablesRef = ref(db, `branches/${activeBranchId}/tables`);
    const unsub = onValue(tablesRef, (snap) => {
      const data = snap.val();
      const tablesArray = data ? Object.values(data) : [];
      setTables(tablesArray.length > 0 ? tablesArray : null);
    });
    return unsub;
  }, [activeBranchId]);

  // Read branch config for tableCount fallback
  useEffect(() => {
    if (!activeBranchId) { setBranchConfig(null); return; }
    const configRef = ref(db, `branches_config/${activeBranchId}`);
    const unsub = onValue(configRef, (snap) => {
      setBranchConfig(snap.val());
    });
    return unsub;
  }, [activeBranchId]);

  // Resolve table list: from direct node or fallback from tableCount
  const tableList = tables ?? (
    branchConfig?.tableCount > 0
      ? Array.from({ length: branchConfig.tableCount }, (_, i) => i + 1)
      : null
  );

  const filteredOrders = useMozoOrders(filter, searchQuery);

  const updateStatus = async (orderId, newStatus) => {
    await ordersService.updateOrderStatus(activeBranchId, orderId, newStatus, user?.email);
  };

  const isLoading = useOrderStore((s) => s.isLoading);
  const activeCount = useOrderStore(
    (s) => s.orderIndex.filter((id) => {
      const o = s.orders[id];
      return o && o.status !== 'entregado' && o.status !== 'cancelado';
    }).length
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-cm-bg">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
              <ClipboardList className="w-4 h-4 text-teal-500" /> Mozo
            </h1>
            <p className="text-xs text-cm-muted font-semibold mt-0.5">{activeCount} pedidos activos</p>
          </div>
          <button onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-black shadow-cm-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
            <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o mesa..."
              className="w-full pl-9 pr-4 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex gap-1 self-end sm:self-auto">
            {(['activos', 'entregados', 'todos']).map((f) => (
               <button key={f} onClick={() => setFilter(f)}
                 className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                   filter === f ? 'bg-teal-500 text-white' : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-accent/5'
                 }`}>
                 {f === 'activos' ? 'Activos' : f === 'entregados' ? 'Entregados' : 'Todos'}
               </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cm-muted" />
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
          />
        )}
      </div>

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
    </div>
  );
}
