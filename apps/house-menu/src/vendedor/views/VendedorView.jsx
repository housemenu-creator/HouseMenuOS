import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { menuService } from '../../lib/menuService';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useAccessibleBranches } from '../../hooks/useAccessibleBranches';
import BranchSwitcher from '../../components/BranchSwitcher';
import { TrendingUp, LogOut, Plus, Loader2, FilterX } from 'lucide-react';
import useOrderSync from '../../worker/hooks/useOrderSync';
import useOrderStore from '../../worker/store/orderStore';
import useVendedorSync, { useCuentaStats, useOrdersByCuentaId } from '../hooks/useVendedorSync';
import useVendedorStore from '../store/vendedorStore';
import VendedorDashboard from '../components/VendedorDashboard';
import CuentaDetail from '../components/CuentaDetail';
import NewOrderModal from '../components/NewOrderModal';

export default function VendedorView() {
  const { activeBranchId, setActiveBranchId } = useBranch();
  const { user, logout } = useAuth();
  const [catalog, setCatalog] = useState({ products: {} });

  useOrderSync({ branchId: activeBranchId });
  useVendedorSync({ branchId: activeBranchId });

  const accessibleBranches = useAccessibleBranches();

  const vendedorEmail = user?.email || '';

  const cuentas = useVendedorStore((s) => s.getFilteredCuentas(vendedorEmail));
  const selectedCuentaId = useVendedorStore((s) => s.selectedCuentaId);
  const searchQuery = useVendedorStore((s) => s.searchQuery);
  const filter = useVendedorStore((s) => s.filter);
  const showNewOrder = useVendedorStore((s) => s.showNewOrder);
  const loading = useVendedorStore((s) => s.loading);
  const setSelectedCuentaId = useVendedorStore((s) => s.setSelectedCuentaId);
  const setSearchQuery = useVendedorStore((s) => s.setSearchQuery);
  const setFilter = useVendedorStore((s) => s.setFilter);
  const setShowNewOrder = useVendedorStore((s) => s.setShowNewOrder);

  const selectedCuenta = useVendedorStore((s) => s.getSelectedCuenta());
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
          </div>
        )}
        {selectedCuenta && selectedCuentaId ? (
          <CuentaDetail
            cuenta={selectedCuenta}
            orders={ordersForCuenta}
            onBack={() => setSelectedCuentaId(null)}
            onNewOrder={handleNewOrder}
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
    </div>
  );
}
