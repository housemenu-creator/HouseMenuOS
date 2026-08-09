import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, TrendingDown, Package, Store, Award,
  Sparkles, Activity, CheckCircle2, ChevronRight, AlertTriangle,
  RefreshCw, Inbox, ShoppingBag
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CajaTab from './CajaTab';

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const startTime = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display;
    startTime.current = null;

    const step = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(from.current + (value - from.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}</>;
}

function IntCounter({ value }) {
  return <AnimatedCounter value={value} decimals={0} duration={600} />;
}

// ── Loading Skeleton ──
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-cm-surface border border-cm-border rounded-2xl p-5">
        <div className="h-5 w-48 bg-cm-border rounded" />
        <div className="h-3 w-24 bg-cm-border rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-cm-surface border border-cm-border rounded-2xl p-5">
            <div className="h-3 w-20 bg-cm-border rounded mb-3" />
            <div className="h-8 w-28 bg-cm-border rounded mb-2" />
            <div className="h-3 w-16 bg-cm-border rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-cm-surface border border-cm-border rounded-2xl p-5 h-64" />
        <div className="lg:col-span-5 bg-cm-surface border border-cm-border rounded-2xl p-5 h-64" />
        <div className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 h-48" />
        <div className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 h-48" />
      </div>
    </div>
  );
}

// ── Empty State ──
function DashboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mb-4">
        <ShoppingBag className="w-8 h-8 text-cm-accent" />
      </div>
      <h2 className="text-lg font-bold text-cm-text">Tu dashboard está listo</h2>
      <p className="text-sm text-cm-muted font-medium mt-1 max-w-sm">
        Apenas lleguen los primeros pedidos del día, verás los datos en tiempo real aquí.
      </p>
    </div>
  );
}

// ── Error State ──
function DashboardError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cm-error/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-cm-error" />
      </div>
      <h2 className="text-lg font-bold text-cm-text">Error al cargar datos</h2>
      <p className="text-sm text-cm-muted font-medium mt-1 max-w-sm">
        No se pudieron obtener los datos del dashboard.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent-hover transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}

// ── Animation variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Main Component ──

export default function DashboardTab({
  kpiData, funnelData, kioskEnabled, toggleKiosk, allOrders,
  now, activeBranchName, userRole, cashSessions, activeBranchId, user
}) {
  const [error, setError] = useState(null);
  const [key, setKey] = useState(0);
  const retry = useCallback(() => { setError(null); setKey(k => k + 1); }, []);

  // ── Role-specific dashboard ──────────────────────────────────
  if (userRole === 'cajero') {
    return (
      <div className="space-y-4">
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cm-accent/10 flex items-center justify-center text-cm-accent">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-cm-text">Panel de Caja</h2>
            <p className="text-xs text-cm-muted font-medium">{activeBranchName}</p>
          </div>
        </div>
        <CajaTab cashSessions={cashSessions} allOrders={allOrders} activeBranchId={activeBranchId} user={user} />
      </div>
    );
  }

  if (error) return <DashboardError onRetry={retry} />;

  // ── Computed data ──
  const hourlySales = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8);
    const salesMap = {};
    hours.forEach(h => { salesMap[h] = { count: 0, revenue: 0 }; });
    const todayStr = new Date().toDateString();
    try {
      allOrders.forEach(o => {
        const date = new Date(o.createdAt);
        if (date.toDateString() !== todayStr) return;
        const hr = date.getHours();
        if (hr >= 8 && hr <= 22) {
          salesMap[hr].count += 1;
          salesMap[hr].revenue += (o.financials?.total || o.total || 0);
        }
      });
    } catch { setError('Error procesando ventas por hora'); }
    return hours.map(h => ({
      hour: `${h}h`,
      count: salesMap[h].count,
      revenue: salesMap[h].revenue
    }));
  }, [allOrders]);

  const maxHourlyRevenue = useMemo(() => {
    const maxVal = Math.max(...hourlySales.map(h => h.revenue), 0);
    return maxVal === 0 ? 1 : maxVal;
  }, [hourlySales]);

  const topProducts = useMemo(() => {
    const counts = {};
    const todayStr = new Date().toDateString();
    try {
      allOrders.forEach(o => {
        const date = new Date(o.createdAt);
        if (date.toDateString() !== todayStr) return;
        (o.items || []).forEach(item => {
          const name = item.name;
          const qty = Number(item.quantity || 1);
          const price = Number(item.price || 0);
          if (!counts[name]) counts[name] = { name, quantity: 0, revenue: 0 };
          counts[name].quantity += qty;
          counts[name].revenue += qty * price;
        });
      });
    } catch { setError('Error procesando productos'); }
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [allOrders]);

  const totalQtyToday = useMemo(() => topProducts.reduce((sum, p) => sum + p.quantity, 0), [topProducts]);

  return (
    <motion.div
      key={key}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Welcome Header ── */}
      <motion.div variants={itemVariants} className="bg-cm-surface border border-cm-border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cm-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cm-accent/10 flex items-center justify-center text-cm-accent">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-cm-text leading-tight flex items-center gap-1.5">
              Panel de Sucursal <Sparkles className="w-3.5 h-3.5 text-cm-accent" />
            </h2>
            <p className="text-xs text-cm-muted font-medium mt-0.5">{activeBranchName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cm-bg-alt border border-cm-border text-xs font-semibold text-cm-text-secondary">
            <Clock className="w-3.5 h-3.5 text-cm-accent" />
            <span>{now?.toLocaleTimeString?.('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '--:--:--'}</span>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-cm-bg-alt border border-cm-border">
            <span className="text-xs font-bold text-cm-text-secondary">Autoservicio Kiosko</span>
            <button
              onClick={toggleKiosk}
              className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${kioskEnabled ? 'bg-cm-accent' : 'bg-cm-muted/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${kioskEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPIs ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Ingresos Hoy</span>
            <div className="w-7 h-7 rounded-lg bg-cm-success-soft flex items-center justify-center text-cm-success group-hover:scale-110 transition-transform"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ <AnimatedCounter value={kpiData.revenue} decimals={2} /></p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Cerrado en el día</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Ticket Promedio</span>
            <div className="w-7 h-7 rounded-lg bg-cm-info-soft flex items-center justify-center text-cm-info group-hover:scale-110 transition-transform"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ <AnimatedCounter value={kpiData.avgTicket} decimals={2} /></p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Por transacción</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Proyectado</span>
            <div className="w-7 h-7 rounded-lg bg-cm-warning-soft flex items-center justify-center text-cm-warning group-hover:scale-110 transition-transform"><TrendingDown className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ <AnimatedCounter value={kpiData.projected} decimals={2} /></p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Estimación fin de día</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Pedidos Activos</span>
            <div className="w-7 h-7 rounded-lg bg-cm-accent/15 flex items-center justify-center text-cm-accent group-hover:scale-110 transition-transform relative">
              <span className="absolute inset-0 rounded-lg bg-cm-accent/30 animate-ping" />
              <Package className="w-4 h-4 z-10" />
            </div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3 flex items-baseline gap-2">
            <IntCounter value={kpiData.activeOrders} />
            {kpiData.activeOrders > 0 && <span className="w-2 h-2 rounded-full bg-cm-accent animate-pulse self-center" />}
          </p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">En preparación / ruta</p>
        </motion.div>
      </motion.div>

      {/* ── Bento Grid ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ventas por Hora */}
        <motion.div variants={itemVariants} className="lg:col-span-7 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-cm-text tracking-wider">Picos de Venta Hoy</h3>
            <p className="text-[10px] text-cm-muted font-medium mt-0.5">Ingresos estimados por hora de pedido</p>
          </div>
          <div className="h-48 flex items-end justify-between gap-1.5 pt-6 pb-2 px-1">
            {hourlySales.map(h => {
              const heightPct = (h.revenue / maxHourlyRevenue) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center h-full group/bar relative">
                  <div className="absolute bottom-full mb-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-cm-text text-cm-bg text-[10px] font-black px-2 py-1 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                    S/ {h.revenue.toFixed(1)} ({h.count} ped)
                  </div>
                  <div className="w-full flex-1 flex items-end rounded-t bg-cm-bg-alt overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPct, h.revenue > 0 ? 3 : 0)}%` }}
                      className="w-full bg-gradient-to-t from-cm-accent/30 to-cm-accent/10 group-hover/bar:from-cm-accent group-hover/bar:to-cm-accent/80 rounded-t transition-all duration-300"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-cm-muted mt-1.5 tracking-tighter truncate max-w-full">
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Funnel */}
        <motion.div variants={itemVariants} className="lg:col-span-5 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-cm-text tracking-wider">Funnel de Operaciones</h3>
            <p className="text-[10px] text-cm-muted font-medium mt-0.5">Estado de pedidos activos en tiempo real</p>
          </div>
          <div className="space-y-2.5 pt-4">
            {funnelData.map(s => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.color === 'bg-cm-accent' ? 'bg-cm-accent' : s.color}`} />
                    <span className="font-bold text-cm-text-secondary">{s.label}</span>
                  </div>
                  <span className="font-black text-cm-text">{s.count} <span className="text-[10px] text-cm-muted font-medium">/ {s.total}</span></span>
                </div>
                <div className="w-full h-1.5 bg-cm-bg-alt rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.total > 0 ? (s.count / s.total) * 100 : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Vendidos */}
        <motion.div variants={itemVariants} className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-cm-text tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cm-accent" /> Más Vendidos Hoy
              </h3>
              <p className="text-[10px] text-cm-muted font-medium mt-0.5">Productos con mayor volumen de salida</p>
            </div>
            {totalQtyToday > 0 && (
              <span className="text-[10px] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full">
                <IntCounter value={totalQtyToday} /> u. vendidas
              </span>
            )}
          </div>
          <div className="space-y-3">
            {topProducts.map((p, idx) => (
              <div key={p.name} className="flex items-center justify-between border-b border-cm-border/50 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-cm-bg-alt border border-cm-border flex items-center justify-center text-[10px] font-black text-cm-text-secondary shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-cm-text truncate">{p.name}</p>
                    <p className="text-[9px] text-cm-muted font-medium">S/ {(p.revenue / p.quantity).toFixed(2)} c/u</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-cm-text">x{p.quantity}</p>
                  <p className="text-[9px] text-emerald-500 font-bold">S/ {p.revenue.toFixed(1)}</p>
                </div>
              </div>
            ))}
            {!topProducts.length && (
              <p className="text-xs text-cm-muted text-center py-8">Esperando primeros pedidos del día</p>
            )}
          </div>
        </motion.div>

        {/* Live Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-cm-text tracking-wider">Live Feed: Pedidos</h3>
              <p className="text-[10px] text-cm-muted font-medium mt-0.5">Historial de las últimas órdenes ingresadas</p>
            </div>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {allOrders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-cm-border/50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={o.status} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-cm-text truncate">{o.customerName || 'Cliente Anónimo'}</p>
                    <p className="text-[10px] text-cm-muted font-mono">{o.id?.slice(-6).toUpperCase() || '------'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-cm-text">S/ {(o.financials?.total || o.total || 0).toFixed(2)}</p>
                  <span className="text-[9px] text-cm-muted font-medium">
                    {new Date(o.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {!allOrders.length && (
              <p className="text-xs text-cm-muted text-center py-8">No hay registros de pedidos hoy</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
