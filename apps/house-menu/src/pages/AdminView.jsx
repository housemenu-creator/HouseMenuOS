import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Store, Users,
  DollarSign, CheckCircle2,
  Activity, MapPin, Warehouse, Truck, Receipt, LogOut, Sun, Moon, Loader2,
  TrendingUp, ShieldBan, Megaphone, Menu, Grid, ChevronDown, Settings, ShieldCheck, History
} from 'lucide-react';
import { ref, onValue, set } from 'firebase/database';
import AdminMegaMenu from '../admin/components/AdminMegaMenu';
import { realtimeDB as db } from '@house/db';
import { ordersService } from '../lib/ordersService';
import { menuService } from '../lib/menuService';
import { cashService } from '../lib/cashService';
import { dailyMenuService } from '../lib/dailyMenuService';
import { ROLE_REGISTRY } from '../lib/roleRegistry';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast } from '../components/ToastContext';
import { confirmDialog } from '../components/ConfirmDialog';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAccessibleBranches } from '../hooks/useAccessibleBranches';
import { playChime } from '../lib/notificationSound';
const DashboardTab = lazy(() => import('../admin/tabs/DashboardTab'));
const OrdersTab = lazy(() => import('../admin/tabs/OrdersTab'));
const MenuTab = lazy(() => import('../admin/tabs/MenuTab'));
const InventoryTab = lazy(() => import('../admin/tabs/InventoryTab'));
const CajaTab = lazy(() => import('../admin/tabs/CajaTab'));
const FinanzasTab = lazy(() => import('../admin/tabs/FinanzasTab'));
const SucursalesTab = lazy(() => import('../admin/tabs/SucursalesTab'));
const DeliveryManager = lazy(() => import('../admin/components/DeliveryManager'));
const FiscalManager = lazy(() => import('../admin/components/FiscalManager'));
const UserManager = lazy(() => import('../admin/components/UserManager'));
const MarketingTab = lazy(() => import('../admin/tabs/MarketingTab'));
const AnalyticsTab = lazy(() => import('../admin/tabs/AnalyticsTab'));
const CustomersTab = lazy(() => import('../admin/tabs/CustomersTab'));
const LogisticsTab = lazy(() => import('../admin/tabs/LogisticsTab'));
const EmployeesTab = lazy(() => import('../admin/tabs/EmployeesTab'));
const SystemConfigTab = lazy(() => import('../admin/tabs/config'));
const RolesTab = lazy(() => import('../admin/tabs/RolesTab'));
const AuditTab = lazy(() => import('../admin/tabs/AuditTab'));

function exportToCSV(orders, branchName) {
  if (!orders?.length) return;
  const headers = ['ID', 'Cliente', 'Ubicacion', 'Estado', 'Total', 'Items', 'Fecha'];
  const rows = orders.map(o => [
    o.id, o.customerName, o.location, o.status, o.financials?.total || 0,
    (o.items || []).map(i => i.name).join('; '),
    new Date(o.createdAt).toLocaleString('es-PE')
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `house-menu-${branchName}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const TAB_DEFS = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  orders: { label: 'Pedidos', icon: ClipboardList, perm: 'orders:read' },
  menu: { label: 'Menu', icon: UtensilsCrossed, perm: 'menu:read' },
  inventory: { label: 'Inventario', icon: Warehouse, perm: 'inventory:read' },
  caja: { label: 'Caja', icon: DollarSign, perm: 'orders:read' },
  finanzas: { label: 'Finanzas', icon: TrendingUp },
  sucursales: { label: 'Sucursales', icon: Store, perm: 'config:manage' },
  delivery: { label: 'Delivery', icon: Truck },
  fiscal: { label: 'Facturación', icon: Receipt, perm: 'config:manage' },
  users: { label: 'Usuarios', icon: Users, perm: 'users:manage' },
  marketing: { label: 'Marketing', icon: Megaphone, perm: 'marketing:read' },
  analytics: { label: 'Analytics', icon: TrendingUp, perm: 'analytics:read' },
  customers: { label: 'Clientes', icon: Users, perm: 'analytics:read' },
  logistics: { label: 'Logística', icon: Package, perm: 'inventory:read' },
  employees: { label: 'Personal', icon: Users, perm: 'users:manage' },
  settings: { label: 'Config', icon: Settings, perm: 'config:manage' },
  roles: { label: 'Roles', icon: ShieldCheck, perm: 'system:manage' },
  audit: { label: 'Auditoría', icon: History, perm: 'system:audit' },
};

export default function AdminView() {
  const { activeBranchId, branches } = useBranch();
  const { user, can, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [orders, setOrders] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  
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

  const [now, setNow] = useState(new Date());
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [catalog, setCatalog] = useState({ products: {}, modifiers: {}, variations: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dailyMenus, setDailyMenus] = useState({});
  const [cashSessions, setCashSessions] = useState([]);
  const prevPendingRef = useRef(0);
  const pendingVerificationCount = useMemo(
    () => allOrders.filter(o => o.payment_status === 'por_verificar').length,
    [allOrders]
  );

  // Notificación sonora cuando llega un nuevo pedido pendiente de verificación
  useEffect(() => {
    if (prevPendingRef.current > 0 && pendingVerificationCount > prevPendingRef.current) {
      playChime();
    }
    prevPendingRef.current = pendingVerificationCount;
  }, [pendingVerificationCount]);

  const availableTabs = user ? (ROLE_REGISTRY[user.role]?.adminTabs || ['dashboard']) : ['dashboard'];

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, availableTabs]);

  const accessibleBranches = useAccessibleBranches();
  const branchAccessDenied = accessibleBranches.length > 0 && !accessibleBranches.some(b => b.id === activeBranchId);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const onVisChange = () => {
      if (document.hidden) setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  useEffect(() => {
    if (!activeBranchId) return;
    const kioskRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(kioskRef, (snap) => setKioskEnabled(!!snap.val()));
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = ordersService.subscribeToOrders(activeBranchId, (data) => {
      setAllOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    setCatalog({ products: {}, modifiers: {}, variations: {} });
    const unsub = menuService.subscribeToCatalog(activeBranchId, (data) => {
      setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = cashService.subscribeToSessions(activeBranchId, (data) => {
      setCashSessions(data);
    });
    return unsub;
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = dailyMenuService.subscribeToDailyMenus(activeBranchId, (data) => {
      setDailyMenus(data);
    });
    return unsub;
  }, [activeBranchId]);

  const toggleKiosk = async () => {
    if (!activeBranchId) return;
    await set(ref(db, `branches/${activeBranchId}/config/kioskEnabled`), !kioskEnabled);
  };

  const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'Sede Principal';

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

  const cancelOrder = async (orderId) => {
    if (!can('orders:cancel')) return;
    if (!(await confirmDialog('¿Estás seguro de cancelar este pedido?'))) return;
    const result = await ordersService.updateOrderStatus(activeBranchId, orderId, 'cancelado', user?.email);
    if (result.success) {
      showToast('Pedido cancelado');
    } else {
      showToast('Error al cancelar el pedido', 'error');
    }
  };

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

  const updateField = async (productId, field, value) => {
    await menuService.updateProductField(activeBranchId, productId, field, value);
  };

  const renderTab = () => {
    const tabDef = TAB_DEFS[activeTab];
    if (!tabDef) return null;
    if (tabDef.perm && !can(tabDef.perm)) {
      return <div className="text-center py-12 text-sm text-cm-text-secondary">No tienes permiso para ver esta sección</div>;
    }
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardTab kpiData={kpiData} funnelData={funnelData} kioskEnabled={kioskEnabled} toggleKiosk={toggleKiosk} allOrders={allOrders} now={now} activeBranchName={activeBranchName} userRole={user?.role} cashSessions={cashSessions} activeBranchId={activeBranchId} user={user} />;
        case 'orders':
          return <OrdersTab allOrders={allOrders} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} paymentFilter={paymentFilter} onPaymentFilterChange={setPaymentFilter} filteredOrders={filteredOrders} onCancelOrder={cancelOrder} exportToCSV={exportToCSV} activeBranchId={activeBranchId} activeBranchName={activeBranchName} />;
        case 'menu':
          return <MenuTab activeBranchId={activeBranchId} catalog={catalog} dailyMenus={dailyMenus} onUpdateField={updateField} />;
        case 'inventory':
          return <InventoryTab catalog={catalog} />;
        case 'caja':
          return <CajaTab cashSessions={cashSessions} allOrders={allOrders} activeBranchId={activeBranchId} user={user} />;
        case 'finanzas':
          return <FinanzasTab allOrders={allOrders} activeBranchId={activeBranchId} activeBranchName={activeBranchName} />;
        case 'sucursales':
          return <SucursalesTab branches={branches} activeBranchId={activeBranchId} />;
        case 'delivery':
          return activeBranchId ? <DeliveryManager branchId={activeBranchId} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar el delivery</p>;
        case 'fiscal':
          return activeBranchId ? <FiscalManager branchId={activeBranchId} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar la facturación</p>;
        case 'users':
          return <UserManager />;
        case 'marketing':
          return activeBranchId ? <MarketingTab activeBranchId={activeBranchId} branches={branches} /> : <p className="text-sm text-cm-muted text-center py-8">Selecciona una sucursal para gestionar marketing</p>;
        case 'analytics':
          return <AnalyticsTab allOrders={allOrders} />;
        case 'customers':
          return <CustomersTab allOrders={allOrders} />;
        case 'logistics':
          return <LogisticsTab />;
        case 'employees':
          return <EmployeesTab allOrders={allOrders} />;
        case 'roles':
          return <RolesTab />;
        case 'audit':
          return <AuditTab />;
        case 'settings':
          return <SystemConfigTab />;
        default:
          return null;
      }
    })();
    return <ErrorBoundary message={`Error en ${tabDef.label}`}>{content}</ErrorBoundary>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cm-bg p-6 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cm-accent animate-spin" />
      </div>
    );
  }

  if (branchAccessDenied) {
    return (
      <div className="min-h-screen bg-cm-bg p-6 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <ShieldBan className="w-16 h-16 text-cm-error mx-auto mb-4" />
          <h2 className="text-lg font-bold text-cm-text mb-2">Acceso restringido</h2>
          <p className="text-sm text-cm-text-secondary">No tienes acceso a la sucursal "{activeBranchName}". Contacta al administrador para obtener permisos.</p>
        </div>
      </div>
    );
  }

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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TopBar */}
        <header className="h-16 shrink-0 border-b border-cm-border bg-cm-surface px-6 flex items-center justify-between z-30 shadow-cm-sm">
          <div className="flex items-center gap-3">
            {/* Branding */}
            <div className="flex items-center gap-2 mr-2">
              <div className="w-8 h-8 bg-cm-accent rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0">
                H
              </div>
              <span className="text-sm font-black text-cm-text hidden sm:inline">Admin Hub</span>
            </div>

            {/* MegaMenu Trigger Button */}
            <button
              onClick={() => setMegaMenuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-cm-border hover:border-cm-accent/40 bg-cm-bg-alt hover:bg-cm-accent/5 text-cm-text font-bold text-xs transition-all active:scale-95 group"
            >
              <Grid className="w-3.5 h-3.5 text-cm-muted group-hover:text-cm-accent transition-colors" />
              <span>Navegar</span>
              <ChevronDown className="w-3 h-3 text-cm-muted" />
            </button>

            {/* Breadcrumb Indicator */}
            <div className="w-[1px] h-4 bg-cm-border mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-cm-accent uppercase tracking-wider">
                {TAB_DEFS[activeTab]?.label || 'Admin'}
              </span>
              <span className="hidden md:inline text-xs text-cm-muted font-semibold px-2 py-0.5 rounded-full bg-cm-bg-alt border border-cm-border flex items-center gap-1">
                <Store className="w-3 h-3 text-cm-accent" />
                {activeBranchName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs font-semibold text-cm-muted">
              {now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div className="w-[1px] h-4 bg-cm-border hidden md:block" />
            
            {/* User display */}
            <span className="text-xs text-cm-muted font-medium hidden sm:inline">
              {user?.name || user?.email}
            </span>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-cm-accent/8 text-cm-muted hover:text-cm-text transition-colors"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs font-semibold text-cm-muted hover:text-cm-error hover:bg-cm-error/10 p-2 rounded-lg transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Pending payment banner */}
          {pendingVerificationCount > 0 && (
            <div className="px-6 pt-3 shrink-0">
              <button onClick={() => { setActiveTab('orders'); setPaymentFilter('por_verificar'); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-cm-accent/10 border border-cm-accent/30 text-sm font-semibold text-cm-accent hover:bg-cm-accent/20 transition-colors text-left">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cm-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cm-accent" />
                  </span>
                  {pendingVerificationCount} pedido{pendingVerificationCount !== 1 ? 's' : ''} pendiente{pendingVerificationCount !== 1 ? 's' : ''} de verificación de pago
                </span>
                <span className="text-cm-text-tertiary text-xs">Ir a Pedidos →</span>
              </button>
            </div>
          )}

          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
            </div>
          }>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderTab()}
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
