import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Activity, MapPin, Package } from 'lucide-react';
import AdminMegaMenu from '../admin/components/AdminMegaMenu';
import AdminTopBar from '../admin/components/AdminTopBar';
import exportToCSV from '../admin/utils/exportToCSV';
import { TAB_DEFS } from '../admin/config/tabDefs';
import AdminTabRenderer from '../admin/components/AdminTabRenderer';
import { AdminLoadingView, AdminAccessDenied, PendingPaymentBanner } from '../admin/components/AdminStatusViews';
import { ROLE_REGISTRY } from '../lib/roleRegistry';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibleBranches } from '../hooks/useAccessibleBranches';
import { useFCM } from '../hooks/useFCM';
import { useAdminOrders } from '../admin/hooks/useAdminOrders';
import { useAdminData } from '../admin/hooks/useAdminData';

export default function AdminView() {
  const { activeBranchId, branches } = useBranch();
  const { user, can } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);

  // ── Hooks extraídos ──
  const { allOrders, loading, pendingVerificationCount, cancelOrder } = useAdminOrders(activeBranchId, user, can);
  const { catalog, dailyMenus, cashSessions, kioskEnabled, toggleKiosk, updateField } = useAdminData(activeBranchId);

  // ── Keyboard shortcut: Ctrl+K → mega menu ──
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMegaMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ── Clock tick ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const onVisChange = () => {
      if (document.hidden) setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  // ── Search & filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const filteredOrders = useMemo(() => {
    let result = allOrders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q) ||
        (o.location || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter);
    }
    if (paymentFilter) {
      result = result.filter(o => o.payment_status === paymentFilter);
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allOrders, searchQuery, statusFilter, paymentFilter]);

  // ── Tabs ──
  const availableTabs = user ? (ROLE_REGISTRY[user.role]?.adminTabs || ['dashboard']) : ['dashboard'];
  const PRIMARY_TABS = ['dashboard', 'orders', 'menu', 'caja'];
  const inlineTabs = useMemo(
    () => PRIMARY_TABS.filter(t => availableTabs.includes(t)),
    [availableTabs]
  );

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, availableTabs]);

  // ── Branch access ──
  const accessibleBranches = useAccessibleBranches();
  const branchAccessDenied = accessibleBranches.length > 0 && !accessibleBranches.some(b => b.id === activeBranchId);
  useFCM({ branchId: activeBranchId, userId: user?.email });

  // ── Derivados ──
  const currentBranch = branches.find(b => b.id === activeBranchId);
  const activeBranchName = currentBranch?.name?.trim() || currentBranch?.id || 'Sede Principal';

  const kpiData = useMemo(() => {
    if (!allOrders?.length) return { revenue: 0, avgTicket: 0, projected: 0, activeOrders: 0 };
    const todayOrders = allOrders.filter(o => {
      const d = new Date(o.createdAt);
      const nowDate = new Date();
      return d.toDateString() === nowDate.toDateString() && o.status !== 'cancelado';
    });
    const revenue = todayOrders.reduce((sum, o) => {
      const orderTotal = o.financials?.total || 0;
      const refundAmt = o.refund?.amount || 0;
      return sum + (orderTotal - refundAmt);
    }, 0);
    const avgTicket = todayOrders.length > 0 ? revenue / todayOrders.length : 0;
    const activeOrders = allOrders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length;
    const hour = now.getHours();
    const hoursElapsed = Math.max(hour - 8, 1);
    const projected = hoursElapsed > 0 ? (revenue / hoursElapsed) * 12 : 0;
    return { revenue, avgTicket, projected, activeOrders };
  }, [allOrders, now]);

  const funnelData = useMemo(() => {
    if (!allOrders?.length) return [];
    const total = allOrders.length;
    const stages = [
      { key: 'recibido', label: 'Recibidos', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-cm-error' },
      { key: 'preparando', label: 'En cocina', icon: <Activity className="w-3.5 h-3.5" />, color: 'bg-cm-warning' },
      { key: 'listo', label: 'Listos', icon: <Package className="w-3.5 h-3.5" />, color: 'bg-cm-info' },
      { key: 'en_camino', label: 'En camino', icon: <MapPin className="w-3.5 h-3.5" />, color: 'bg-cm-accent' },
      { key: 'entregado', label: 'Entregados', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-cm-success' },
    ];
    return stages.map(s => ({ ...s, count: allOrders.filter(o => o.status === s.key).length, total }));
  }, [allOrders]);

  // ── Props compuestos para tabs ──
  const tabData = useMemo(() => ({
    kpiData, funnelData, kioskEnabled, toggleKiosk, allOrders, now,
    activeBranchName, userRole: user?.role, cashSessions, activeBranchId, user,
    searchQuery, onSearchQueryChange: setSearchQuery,
    statusFilter, onStatusFilterChange: setStatusFilter,
    paymentFilter, onPaymentFilterChange: setPaymentFilter,
    filteredOrders, onCancelOrder: cancelOrder, exportToCSV,
    catalog, dailyMenus, onUpdateField: updateField,
    branches,
  }), [kpiData, funnelData, kioskEnabled, toggleKiosk, allOrders, now, activeBranchName, user?.role, cashSessions, activeBranchId, user, searchQuery, statusFilter, paymentFilter, filteredOrders, cancelOrder, exportToCSV, catalog, dailyMenus, updateField, branches]);

  if (loading) return <AdminLoadingView />;

  if (branchAccessDenied) return <AdminAccessDenied branchName={activeBranchName} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cm-bg">
      <AdminMegaMenu
        isOpen={megaMenuOpen}
        onClose={() => setMegaMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={availableTabs}
        activeOrdersCount={kpiData.activeOrders}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AdminTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          availableTabs={availableTabs}
          inlineTabs={inlineTabs}
          tabDefs={TAB_DEFS}
          now={now}
          megaMenuOpen={megaMenuOpen}
          onMegaMenuToggle={() => setMegaMenuOpen((prev) => !prev)}
          activeBranchName={activeBranchName}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <PendingPaymentBanner
            count={pendingVerificationCount}
            onClick={() => { setActiveTab('orders'); setPaymentFilter('por_verificar'); }}
          />
          <AdminTabRenderer activeTab={activeTab} can={can} data={tabData} />
        </main>
      </div>
    </div>
  );
}
