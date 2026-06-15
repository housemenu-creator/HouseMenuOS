import { useMemo } from 'react';
import { Clock, DollarSign, TrendingUp, TrendingDown, Package, Store, Award, Sparkles, Activity, CheckCircle2, ChevronRight } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import FunnelRow from '../components/FunnelRow';
import StatusBadge from '../components/StatusBadge';

export default function DashboardTab({ kpiData, funnelData, kioskEnabled, toggleKiosk, allOrders, now, activeBranchName }) {
  
  // ── 1. Agrupar Ventas por Hora (de hoy) ───────────────────────────────────────
  const hourlySales = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 a 22:00
    const salesMap = {};
    hours.forEach(h => { salesMap[h] = { count: 0, revenue: 0 }; });

    const todayStr = new Date().toDateString();
    allOrders.forEach(o => {
      const date = new Date(o.createdAt);
      if (date.toDateString() !== todayStr) return;
      const hr = date.getHours();
      if (hr >= 8 && hr <= 22) {
        salesMap[hr].count += 1;
        salesMap[hr].revenue += (o.financials?.total || o.total || 0);
      }
    });

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

  // ── 2. Calcular Top Productos Vendidos (de hoy) ──────────────────────────────
  const topProducts = useMemo(() => {
    const counts = {};
    const todayStr = new Date().toDateString();

    allOrders.forEach(o => {
      const date = new Date(o.createdAt);
      if (date.toDateString() !== todayStr) return;

      (o.items || []).forEach(item => {
        const name = item.name;
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        if (!counts[name]) {
          counts[name] = { name, quantity: 0, revenue: 0 };
        }
        counts[name].quantity += qty;
        counts[name].revenue += qty * price;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [allOrders]);

  const totalQtyToday = useMemo(() => {
    return topProducts.reduce((sum, p) => sum + p.quantity, 0);
  }, [topProducts]);

  return (
    <div className="space-y-6">
      
      {/* ── Fila de Bienvenida & Control Rápido ── */}
      <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cm-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cm-accent/10 flex items-center justify-center text-cm-accent">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-cm-text leading-tight flex items-center gap-1.5">
              Panel de Sucursal <Sparkles className="w-3.5 h-3.5 text-cm-accent animate-pulse" />
            </h2>
            <p className="text-xs text-cm-muted font-medium mt-0.5">{activeBranchName}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Reloj */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cm-bg-alt border border-cm-border text-xs font-semibold text-cm-text-secondary">
            <Clock className="w-3.5 h-3.5 text-cm-accent" />
            <span>{now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Switch de Kiosko */}
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
      </div>

      {/* ── KPIs en Bento Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Ingresos Hoy</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ {kpiData.revenue.toFixed(2)}</p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Cerrado en el día</p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Ticket Promedio</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ {kpiData.avgTicket.toFixed(2)}</p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Por transacción</p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Proyectado</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><TrendingDown className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3">S/ {kpiData.projected.toFixed(2)}</p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">Estimación fin de día</p>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 hover:shadow-cm-sm transition-all duration-200 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cm-muted tracking-wider">Pedidos Activos</span>
            <div className="w-7 h-7 rounded-lg bg-cm-accent/15 flex items-center justify-center text-cm-accent group-hover:scale-110 transition-transform relative">
              <span className="absolute inset-0 rounded-lg bg-cm-accent/30 animate-ping" />
              <Package className="w-4 h-4 z-10" />
            </div>
          </div>
          <p className="text-2xl font-black text-cm-text mt-3 flex items-baseline gap-2">
            {kpiData.activeOrders}
            {kpiData.activeOrders > 0 && <span className="w-2 h-2 rounded-full bg-cm-accent animate-pulse self-center" />}
          </p>
          <p className="text-[10px] text-cm-muted font-medium mt-1">En preparación / ruta</p>
        </div>
      </div>

      {/* ── Bento Grid Inferior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Ventas por Hora - Span 7 */}
        <div className="lg:col-span-7 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-cm-text tracking-wider">Picos de Venta Hoy</h3>
            <p className="text-[10px] text-cm-muted font-medium mt-0.5">Ingresos estimados por hora de pedido</p>
          </div>

          <div className="h-48 flex items-end justify-between gap-1.5 pt-6 pb-2 px-1">
            {hourlySales.map(h => {
              const heightPct = (h.revenue / maxHourlyRevenue) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center h-full group/bar relative">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-cm-text text-cm-bg text-[10px] font-black px-2 py-1 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                    S/ {h.revenue.toFixed(1)} ({h.count} ped)
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full flex-1 flex items-end rounded-t bg-cm-bg-alt overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPct, h.revenue > 0 ? 3 : 0)}%` }}
                      className="w-full bg-cm-accent/20 group-hover/bar:bg-cm-accent rounded-t transition-all duration-300"
                    />
                  </div>
                  
                  {/* Label */}
                  <span className="text-[9px] font-bold text-cm-muted mt-1.5 tracking-tighter truncate max-w-full">
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel Operacional - Span 5 */}
        <div className="lg:col-span-5 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-cm-text tracking-wider">Funnel de Operaciones</h3>
            <p className="text-[10px] text-cm-muted font-medium mt-0.5">Estado de pedidos activos en tiempo real</p>
          </div>

          <div className="space-y-2.5 pt-4">
            {funnelData.map(s => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.color.replace('bg-', 'text-') === s.color ? 'bg-cm-accent' : s.color}`} />
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
        </div>

        {/* Top Vendidos - Span 6 */}
        <div className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-cm-text tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cm-accent" /> Más Vendidos Hoy
              </h3>
              <p className="text-[10px] text-cm-muted font-medium mt-0.5">Productos con mayor volumen de salida</p>
            </div>
            {totalQtyToday > 0 && (
              <span className="text-[10px] font-bold bg-cm-accent/10 text-cm-accent px-2 py-0.5 rounded-full">
                {totalQtyToday} u. vendidas
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
        </div>

        {/* Últimos Pedidos - Span 6 */}
        <div className="lg:col-span-6 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-sm">
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
                    <p className="text-[10px] text-cm-muted font-mono">{o.id.slice(-6).toUpperCase()}</p>
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
        </div>

      </div>

    </div>
  );
}
