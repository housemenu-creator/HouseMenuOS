import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { menuService } from '../../lib/menuService';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useAccessibleBranches } from '../../hooks/useAccessibleBranches';
import BranchSwitcher from '../../components/BranchSwitcher';
import { TrendingUp, LogOut, Plus, Loader2, FilterX } from 'lucide-react';
import useOrderSync from '../../worker/hooks/useOrderSync';
import { useOrderStore } from '../store/vendedorOrderStore';
import useVendedorSync, { useCuentaStats, useOrdersByCuentaId } from '../hooks/useVendedorSync';
import useVendedorStore from '../store/vendedorStore';
import VendedorDashboard from '../components/VendedorDashboard';
import CuentaDetail from '../components/CuentaDetail';
import NewOrderModal from '../components/NewOrderModal';
import CuentaFormModal from '../components/CuentaFormModal';

export default function VendedorView() {
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [catalog, setCatalog] = useState({ products: {} });
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [cuentaRefreshKey, setCuentaRefreshKey] = useState(0);

  useOrderSync({ branchId: activeBranchId });
  useVendedorSync({ branchId: activeBranchId });

  const accessibleBranches = useAccessibleBranches();

  const vendedorEmail = user?.email || '';

  // ── Zustand selectors: SOLO primitivas o referencias estables ──
  // NO usar getFilteredCuentas/getSelectedCuenta como selectors porque
  // retornan nuevas referencias en cada llamada → bucle infinito con
  // useSyncExternalStore de React 18. (Mismo bug que WorkerDashboard.tsx:137-139)
  const rawCuentas = useVendedorStore((s) => s.cuentas);
  const selectedCuentaId = useVendedorStore((s) => s.selectedCuentaId);
  const searchQuery = useVendedorStore((s) => s.searchQuery);
  const filter = useVendedorStore((s) => s.filter);
  const showNewOrder = useVendedorStore((s) => s.showNewOrder);
  const loading = useVendedorStore((s) => s.loading);
  const setSelectedCuentaId = useVendedorStore((s) => s.setSelectedCuentaId);
  const setSearchQuery = useVendedorStore((s) => s.setSearchQuery);
  const setFilter = useVendedorStore((s) => s.setFilter);
  const setShowNewOrder = useVendedorStore((s) => s.setShowNewOrder);

  // ── Derivados estables con useMemo ──
  const cuentas = useMemo(() => {
    let result = rawCuentas.filter((c) => c.assignedVendedor === vendedorEmail);
    if (filter === 'activas') {
      result = result.filter((c) => c.status === 'activa' && c.isActive !== false);
    } else if (filter === 'pendientes') {
      result = result.filter(
        (c) => c.status === 'activa' && c.creditUsed != null && c.creditLimit != null && c.creditUsed >= c.creditLimit * 0.8
      );
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.legalName || '').toLowerCase().includes(q) ||
          (c.taxId || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (b.lastOrderAt || b.createdAt) - (a.lastOrderAt || a.createdAt));
  }, [rawCuentas, vendedorEmail, filter, searchQuery]);

  const selectedCuenta = useMemo(
    () => rawCuentas.find((c) => c.id === selectedCuentaId) || null,
    [rawCuentas, selectedCuentaId]
  );

  const ordersForCuenta = useOrdersByCuentaId(selectedCuentaId);
  const stats = useCuentaStats(vendedorEmail);

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

  const isOrderLoading = useOrderStore((s) => s.isLoading);
  const isLoading = loading && isOrderLoading;

  const handleNewOrder = () => setShowNewOrder(true);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-cm-bg">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {!selectedCuentaId && (
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-sm font-black tracking-widest text-cm-text flex items-center gap-2 uppercase">
                <TrendingUp className="w-4 h-4 text-cm-accent" /> Ventas
              </h1>
              <p className="text-xs text-cm-muted font-semibold mt-0.5">{stats.activeCuentas} cuentas activas</p>
            </div>
            <button onClick={() => { setEditingCuenta(null); setShowCuentaForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white rounded-lg text-xs font-bold hover:bg-cm-accent-hover transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nuevo Cliente
            </button>
          </div>
        )}
        {selectedCuenta && selectedCuentaId ? (
          <CuentaDetail
            cuenta={selectedCuenta}
            orders={ordersForCuenta}
            onBack={() => setSelectedCuentaId(null)}
            onNewOrder={handleNewOrder}
            onEditCuenta={() => { setEditingCuenta(selectedCuenta); setShowCuentaForm(true); }}
          />
        ) : (
          <VendedorDashboard
            cuentas={cuentas}
            stats={stats}
            filter={filter}
            searchQuery={searchQuery}
            loading={isLoading}
            onSearchChange={setSearchQuery}
            onFilterChange={setFilter}
            onSelectCuenta={setSelectedCuentaId}
          />
        )}
      </div>

      {showNewOrder && selectedCuenta && (
        <NewOrderModal
          cuenta={selectedCuenta}
          activeBranchId={activeBranchId}
          userEmail={user?.email || ''}
          catalog={catalog}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => setSelectedCuentaId(selectedCuenta.id)}
        />
      )}

      {showCuentaForm && (
        <CuentaFormModal
          cuenta={editingCuenta}
          onClose={() => { setShowCuentaForm(false); setEditingCuenta(null); }}
          onSaved={() => setCuentaRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
