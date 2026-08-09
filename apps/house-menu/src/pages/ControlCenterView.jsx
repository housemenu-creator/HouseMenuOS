import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import {
  BarChart3, Package, Users, ShoppingCart, TrendingUp, TrendingDown,
  Clock, DollarSign, Utensils, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, Activity, Zap, Percent, Loader2
} from 'lucide-react';
import { realtimeDB as db } from '@house/db';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';

// ── AnimCounter ──────────────────────────────────────
function AnimCounter({ value, duration = 600, prefix = '', suffix = '' }) {
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

  // Si el valor original tiene decimales, los mostramos
  const isDecimal = value !== Math.floor(value);
  const formatted = isDecimal ? (value).toFixed(2) : display;
  return <>{prefix}{formatted}{suffix}</>;
}

// ── Variants + Skeleton ───────────────────────────────
const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };

function SkeletonBlock({ className = '' }) {
  return <div className={`bg-cm-border rounded-lg animate-pulse ${className}`} />;
}

// ── Sidebar nav items ──────────────────────────────────
const NAV_ITEMS = [
  { id: 'resumen', label: 'Resumen', icon: BarChart3 },
  { id: 'ventas', label: 'Ventas', icon: DollarSign },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
];

// ── KPI Card ───────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend, color, isNumeric }) {
  const isUp = trend > 0;
  return (
    <motion.div variants={iv}
      className="bg-cm-surface border border-cm-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-cm-success' : 'text-cm-error'}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-cm-text tabular-nums">
          {isNumeric ? <AnimCounter value={Number(value)} /> : value}
        </p>
        <p className="text-sm text-cm-text-secondary">{label}</p>
      </div>
      {sub && <p className="text-xs text-cm-text-tertiary">{sub}</p>}
    </motion.div>
  );
}

// ── Status badge ────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pendiente: 'warning',
    confirmado: 'info',
    en_preparacion: 'accent',
    listo: 'success',
    en_camino: 'info',
    entregado: 'success',
    cancelado: 'error',
    por_verificar: 'warning',
  };
  const colors = {
    success: 'bdg-success',
    warning: 'bdg-warning',
    error: 'bdg-error',
    info: 'bdg-info',
    accent: 'bdg-accent',
  };
  const cls = colors[map[status] || 'neutral'] || 'bdg-neutral';
  return <span className={`bdg ${cls}`}>{status?.replace('_', ' ')}</span>;
}

// ── Ventas Chart (simple bar chart with CSS) ──────────
function VentasChart({ hourlyData }) {
  const max = Math.max(...Object.values(hourlyData), 1);
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-cm-text mb-4">Ventas por hora (hoy)</h3>
      <div className="flex items-end gap-2 h-40">
        {Object.entries(hourlyData).sort(([a], [b]) => a.localeCompare(b)).map(([hour, amount]) => {
          const pct = (amount / max) * 100;
          return (
            <div key={hour} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full flex flex-col items-center justify-end h-full">
                <div
                  className="w-full bg-cm-accent/30 rounded-t-sm hover:bg-cm-accent/50 transition-colors min-h-[4px]"
                  style={{ height: `${pct}%` }}
                  title={`${hour}: S/ ${amount.toFixed(2)}`}
                />
              </div>
              <span className="text-[10px] text-cm-text-tertiary">{hour}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Products ────────────────────────────────────────
function TopProducts({ products }) {
  const top = products.slice(0, 6);
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-cm-text mb-4">Productos más vendidos</h3>
      <div className="flex flex-col gap-2">
        {top.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-1 border-b border-cm-border last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cm-accent">#{i + 1}</span>
              <span className="text-sm text-cm-text">{p.name}</span>
            </div>
            <span className="text-xs text-cm-text-secondary">{p.qty} ventas</span>
          </div>
        ))}
        {top.length === 0 && <p className="text-sm text-cm-text-tertiary text-center py-4">Sin datos aún</p>}
      </div>
    </div>
  );
}

// ── Stock Alerts ───────────────────────────────────────
function StockAlerts({ products }) {
  const low = products.filter(p => p.stock <= 5);
  const out = products.filter(p => p.stock === 0);
  return (
    <div className="flex flex-col gap-3">
      {out.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cm-error/10 border border-cm-error/30">
          <XCircle size={16} className="text-cm-error" />
          <span className="text-sm text-cm-error font-medium">{out.length} producto(s) sin stock</span>
        </div>
      )}
      {low.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cm-warning/10 border border-cm-warning/30">
          <AlertTriangle size={16} className="text-cm-warning" />
          <span className="text-sm text-cm-warning font-medium">{low.length} producto(s) con stock bajo</span>
        </div>
      )}
      {out.length === 0 && low.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cm-success/10 border border-cm-success/30">
          <CheckCircle size={16} className="text-cm-success" />
          <span className="text-sm text-cm-success">Stock en niveles normales</span>
        </div>
      )}
    </div>
  );
}

// ── Staff Now ───────────────────────────────────────────
function StaffNow({ employees }) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];

  const active = employees.filter(e => e.active && e.schedule?.includes(todayName));
  const absent = employees.filter(e => e.active && !e.schedule?.includes(todayName));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-cm-success/10 border border-cm-success/30">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-cm-success" />
          <span className="text-sm text-cm-success">En turno</span>
        </div>
        <span className="text-lg font-bold text-cm-success">{active.length}</span>
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-cm-text-tertiary/10 border border-cm-text-tertiary/20">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-cm-text-tertiary" />
          <span className="text-sm text-cm-text-secondary">Fuera de turno</span>
        </div>
        <span className="text-lg font-bold text-cm-text-tertiary">{absent.length}</span>
      </div>
    </div>
  );
}

// ── Recent Orders Table ─────────────────────────────────
function RecentOrders({ orders }) {
  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cm-border">
              <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">ID</th>
              <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Hora</th>
              <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Cliente</th>
              <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Total</th>
              <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map((o) => (
              <tr key={o.id} className="border-b border-cm-border/50 hover:bg-cm-bg-alt transition-colors">
                <td className="p-3 font-mono text-xs text-cm-accent">{o.id?.slice(-6).toUpperCase()}</td>
                <td className="p-3 text-cm-text-secondary">{o.createdAt ? new Date(o.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="p-3 text-cm-text">{o.customerName || o.customerPhone || '—'}</td>
                <td className="p-3 font-semibold text-cm-text">S/ {Number(o.total || 0).toFixed(2)}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-cm-text-tertiary">Sin pedidos aún</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────
export default function ControlCenterView() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('resumen');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((c) => c + 1);
    setLoading(true);
  }, []);

  // ── Load data ─────────────────────────────────────────
  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    setError(null);

    const ordersRef = ref(db, `branches/${activeBranchId}/orders`);
    const productsRef = ref(db, `branches/${activeBranchId}/catalog/products`);
    const staffRef = ref(db, `branches/${activeBranchId}/staff`);

    const unsubOrders = onValue(ordersRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(data);
      } else {
        setOrders([]);
      }
    }, (err) => { console.warn('ControlCenter orders error:', err); setError('Error al cargar pedidos'); setLoading(false); });

    const unsubProducts = onValue(productsRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
        setProducts(data);
      } else {
        setProducts([]);
      }
    }, (err) => { console.warn('ControlCenter products error:', err); });

    const unsubStaff = onValue(staffRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
        setEmployees(data);
      } else {
        setEmployees([]);
      }
    }, (err) => { console.warn('ControlCenter staff error:', err); });

    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsubOrders();
      unsubProducts();
      unsubStaff();
      clearTimeout(timer);
    };
  }, [activeBranchId, retryCount]);

  // ── Computed stats ────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= today);
    const totalVentas = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgTicket = todayOrders.length > 0 ? totalVentas / todayOrders.length : 0;
    const totalItems = todayOrders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0), 0);

    // Hourly sales
    const hourlyData = {};
    todayOrders.forEach(o => {
      if (!o.createdAt) return;
      const h = new Date(o.createdAt).getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      hourlyData[key] = (hourlyData[key] || 0) + Number(o.total || 0);
    });

    // Top products
    const prodCount = {};
    todayOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const name = item.name || '?';
        prodCount[name] = (prodCount[name] || 0) + (item.quantity || 1);
      });
    });
    const topProducts = Object.entries(prodCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    // Status breakdown
    const statusCount = {};
    orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

    return {
      totalVentas,
      pedidoCount: todayOrders.length,
      avgTicket,
      totalItems,
      hourlyData,
      topProducts,
      statusCount,
      allOrders: orders,
    };
  }, [orders]);

  if (!user) return null;

  // ── Error state ──
  if (error) {
    return (
      <div className="h-screen bg-cm-bg flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 px-6 text-center">
          <AlertCircle className="w-12 h-12 text-cm-error" />
          <p className="text-lg font-bold text-cm-error">{error}</p>
          <button onClick={handleRetry}
            className="px-6 py-3 text-xs font-black bg-cm-accent text-white rounded-xl hover:brightness-110 transition-all tracking-wider uppercase">
            Reintentar
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Skeleton loading ──
  if (loading && orders.length === 0) {
    return (
      <div className="flex h-screen bg-cm-bg overflow-hidden">
        <aside className="w-56 flex-shrink-0 bg-cm-surface border-r border-cm-border flex flex-col">
          <div className="p-4 border-b border-cm-border space-y-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="flex-1 p-3 space-y-1">
            {[1,2,3,4,5].map((i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
          </div>
        </aside>
        <main className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-cm-surface border border-cm-border rounded-xl p-5 space-y-2">
                <SkeletonBlock className="h-10 w-10" />
                <SkeletonBlock className="h-7 w-24" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-cm-surface border border-cm-border rounded-xl p-5 space-y-4">
              <SkeletonBlock className="h-4 w-40" />
              <div className="flex items-end gap-2 h-40">
                {[1,2,3,4,5,6,7,8].map((i) => <SkeletonBlock key={i} className="flex-1 h-full max-h-[80%]" />)}
              </div>
            </div>
            <div className="bg-cm-surface border border-cm-border rounded-xl p-5 space-y-3">
              <SkeletonBlock className="h-4 w-36" />
              {[1,2,3,4].map((i) => <SkeletonBlock key={i} className="h-6 w-full" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="flex h-screen bg-cm-bg overflow-hidden">
      {/* ── Sidebar ── */}
      <motion.aside variants={iv} className="w-56 flex-shrink-0 bg-cm-surface border-r border-cm-border flex flex-col">
        <div className="p-4 border-b border-cm-border">
          <h1 className="text-sm font-bold text-cm-text tracking-wide">Control Center</h1>
          <p className="text-xs text-cm-text-tertiary mt-0.5">House Portal OS</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === id
                  ? 'bg-cm-accent/10 text-cm-accent border border-cm-accent/30'
                  : 'text-cm-text-secondary hover:bg-cm-bg-alt hover:text-cm-text'
              }`}
            >
              <Icon size={18} />
              {label}
            </motion.button>
          ))}
        </nav>
        <div className="p-3 border-t border-cm-border">
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cm-text-secondary hover:bg-cm-bg-alt hover:text-cm-text transition-all"
          >
            <ChevronRight size={18} />
            Panel Admin
          </button>
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
          {/* ── KPIs ── */}
          <motion.section variants={cv} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign}
              label="Ventas hoy"
              value={`S/ ${stats.totalVentas.toFixed(2)}`}
              sub={`${stats.pedidoCount} pedidos`}
              trend={null}
              color="bg-cm-success/20 text-cm-success"
              isNumeric={false}
            />
            <KpiCard
              icon={ShoppingCart}
              label="Pedidos hoy"
              value={stats.pedidoCount}
              sub={`${stats.totalItems} ítems`}
              trend={null}
              color="bg-cm-info/20 text-cm-info"
              isNumeric={true}
            />
            <KpiCard
              icon={Utensils}
              label="Ticket promedio"
              value={`S/ ${stats.avgTicket.toFixed(2)}`}
              sub={`${stats.pedidoCount > 0 ? 'por pedido' : 'sin pedidos'}`}
              trend={null}
              color="bg-cm-accent/20 text-cm-accent"
              isNumeric={false}
            />
            <KpiCard
              icon={Activity}
              label="Órdenes activas"
              value={stats.statusCount['en_preparacion'] || 0}
              sub={`${(stats.statusCount['pendente'] || 0) + (stats.statusCount['confirmado'] || 0)} pendientes`}
              trend={null}
              color="bg-cm-warning/20 text-cm-warning"
              isNumeric={true}
            />
          </motion.section>

          {/* ── Section content with AnimatePresence ── */}
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}>

          {activeSection === 'resumen' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <VentasChart hourlyData={stats.hourlyData} />
              </div>
              <div>
                <TopProducts products={stats.topProducts} />
              </div>
            </div>
          )}

          {activeSection === 'ventas' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <VentasChart hourlyData={stats.hourlyData} />
              </div>
              <div>
                <TopProducts products={stats.topProducts} />
              </div>
              <div className="lg:col-span-3">
                <RecentOrders orders={stats.allOrders} />
              </div>
            </div>
          )}

          {activeSection === 'stock' && (
            <div className="flex flex-col gap-4">
              <StockAlerts products={products} />
              <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cm-border">
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Producto</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Categoría</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Precio</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-b border-cm-border/50 hover:bg-cm-bg-alt transition-colors">
                          <td className="p-3 font-medium text-cm-text">{p.name}</td>
                          <td className="p-3 text-cm-text-secondary">{p.category || 'General'}</td>
                          <td className="p-3 font-semibold text-cm-text">S/ {Number(p.price || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`bdg ${p.stock === 0 ? 'bdg-error' : p.stock <= 5 ? 'bdg-warning' : 'bdg-success'}`}>
                              {p.stock ?? '∞'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-cm-text-tertiary">Sin productos cargados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'staff' && (
            <div className="flex flex-col gap-4">
              <StaffNow employees={employees} />
              <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cm-border">
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Nombre</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Rol</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Teléfono</th>
                        <th className="text-left p-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => (
                        <tr key={e.id} className="border-b border-cm-border/50 hover:bg-cm-bg-alt transition-colors">
                          <td className="p-3 font-medium text-cm-text">{e.name}</td>
                          <td className="p-3 text-cm-text-secondary capitalize">{e.role || '—'}</td>
                          <td className="p-3 text-cm-text-secondary">{e.phone || '—'}</td>
                          <td className="p-3">
                            <span className={`bdg ${e.active ? 'bdg-success' : 'bdg-neutral'}`}>
                              {e.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {employees.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-cm-text-tertiary">Sin staff registrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'pedidos' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(stats.statusCount).map(([status, count]) => (
                  <div key={status} className="bg-cm-surface border border-cm-border rounded-xl p-3 flex flex-col items-center gap-1">
                    <span className="text-xl font-bold text-cm-text tabular-nums">
                      <AnimCounter value={count} />
                    </span>
                    <StatusBadge status={status} />
                  </div>
                ))}
              </div>
              <RecentOrders orders={stats.allOrders} />
            </div>
          )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}