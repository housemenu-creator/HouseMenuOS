import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Store, Users,
  DollarSign, CheckCircle2,
  Activity, MapPin, Warehouse, Truck, Receipt, LogOut, Sun, Moon, Loader2,
  TrendingUp, ShieldBan
} from 'lucide-react';
import { ref, onValue, set } from 'firebase/database';
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
};

export default function AdminView() {
  const { activeBranchId, branches } = useBranch();
  const { user, can, logout, hasBranchAccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [orders, setOrders] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [now, setNow] = useState(new Date());
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [catalog, setCatalog] = useState({ products: {}, modifiers: {}, variations: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dailyMenus, setDailyMenus] = useState({});
  const [cashSessions, setCashSessions] = useState([]);
  const availableTabs = user ? (ROLE_REGISTRY[user.role]?.adminTabs || ['dashboard']) : ['dashboard'];

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, availableTabs]);

  const [branchAccessDenied, setBranchAccessDenied] = useState(false);

  useEffect(() => {
    if (activeBranchId && hasBranchAccess && !hasBranchAccess(activeBranchId)) {
      setBranchAccessDenied(true);
    } else {
      setBranchAccessDenied(false);
    }
  }, [activeBranchId, hasBranchAccess]);

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
      return d.toDateString() === nowDate.toDateString();
    });
    const revenue = todayOrders.reduce((sum, o) => sum + (o.financials?.total || 0), 0);
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
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allOrders, searchQuery, statusFilter]);

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
          return <DashboardTab kpiData={kpiData} funnelData={funnelData} kioskEnabled={kioskEnabled} toggleKiosk={toggleKiosk} allOrders={allOrders} now={now} activeBranchName={activeBranchName} />;
        case 'orders':
          return <OrdersTab allOrders={allOrders} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} filteredOrders={filteredOrders} onCancelOrder={cancelOrder} exportToCSV={exportToCSV} activeBranchId={activeBranchId} activeBranchName={activeBranchName} />;
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
    <div className="min-h-screen bg-cm-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-cm-text">Admin Hub</h1>
            <span className="text-xs font-semibold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full">Sucursal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-cm-text-secondary font-medium">{activeBranchName}</span>
            <span className="text-xs text-cm-text-secondary">{user?.name || user?.email}</span>
            <button onClick={toggleTheme} className="p-1.5 rounded-full hover:bg-cm-accent/10 text-cm-text-secondary hover:text-cm-accent transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={logout} className="flex items-center gap-1 text-xs font-medium text-cm-text-secondary hover:text-cm-accent transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>

        <nav className="segmented overflow-x-auto w-full">
          {availableTabs.map(key => {
            const tab = TAB_DEFS[key];
            if (!tab) return null;
            const Icon = tab.icon;
            const disabled = tab.perm && !can(tab.perm);
            return (
              <button key={key} disabled={disabled} onClick={() => setActiveTab(key)}
                className={`${activeTab === key ? 'active' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cm-accent animate-spin" /></div>}>
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderTab()}
          </motion.div>
        </Suspense>
      </div>
    </div>
  );
}
