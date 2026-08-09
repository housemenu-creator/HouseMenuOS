import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useBranch } from '../../context/BranchContext';
import {
  TrendingUp, ShoppingCart, Users, Clock, DollarSign, ArrowUpDown,
  ChefHat, Bike, Medal, AlertTriangle, Download, FileText, BarChart3
} from 'lucide-react';
import KpiCard from '../charts/KpiCard';
import BarChartWidget from '../charts/BarChartWidget';
import LineChartWidget from '../charts/LineChartWidget';
import PieChartWidget from '../charts/PieChartWidget';
import {
  groupOrdersByPeriod, filterOrdersByDate, todayOrders, ordersOnDate,
  computeKpis, topProducts, bottomProducts, salesByPaymentMethod,
  salesByCategory, staffProductivity, kitchenTimes, dailyReport,
  ordersByHour, ordersToCSV, productsToCSV,
} from '../../lib/analyticsService';

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'custom', label: 'Personalizado' },
];

function fmtCurrency(n) {
  return `S/ ${Number(n).toFixed(2)}`;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AnalyticsTab({ allOrders }) {
  const { activeBranchId } = useBranch();
  console.log('[AnalyticsTab] allOrders recibidas:', allOrders.length, 'primer item:', allOrders[0]);
  const [period, setPeriod] = useState('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [chartPeriod, setChartPeriod] = useState('hour'); // hour|day|month

  const filtered = useMemo(() => {
    const now = new Date();
    if (period === 'today') return todayOrders(allOrders);
    if (period === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return ordersOnDate(allOrders, y);
    }
    if (period === 'week') return filterOrdersByDate(allOrders, 7);
    if (period === 'month') return filterOrdersByDate(allOrders, 30);
    if (period === 'custom' && customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      return allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= s && d <= e;
      });
    }
    return todayOrders(allOrders);
  }, [allOrders, period, customStart, customEnd]);

  const previous = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return ordersOnDate(allOrders, y);
    }
    if (period === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 2);
      return ordersOnDate(allOrders, y);
    }
    if (period === 'week') return filterOrdersByDate(allOrders, 14).filter(o => o.createdAt < now.getTime() - 7 * 86400000);
    if (period === 'month') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 60);
      return allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= cutoff && d < new Date(now.getTime() - 30 * 86400000);
      });
    }
    return [];
  }, [allOrders, period]);

  const kpis = useMemo(() => computeKpis(filtered, previous), [filtered, previous]);
  const trendData = useMemo(() => groupOrdersByPeriod(filtered, chartPeriod), [filtered, chartPeriod]);
  const top = useMemo(() => topProducts(filtered, 10), [filtered]);
  const bottom = useMemo(() => bottomProducts(filtered, 10), [filtered]);
  const byMethod = useMemo(() => salesByPaymentMethod(filtered), [filtered]);
  const byCategory = useMemo(() => salesByCategory(filtered), [filtered]);
  const staff = useMemo(() => staffProductivity(filtered), [filtered]);
  const kitchen = useMemo(() => kitchenTimes(filtered), [filtered]);
  const report = useMemo(() => dailyReport(filtered), [filtered]);
  const peakHours = useMemo(() => ordersByHour(filtered), [filtered]);

  const handleExportOrders = useCallback(() => {
    downloadCSV(ordersToCSV(filtered), `ordenes-${period}-${Date.now()}.csv`);
  }, [filtered, period]);

  const handleExportProducts = useCallback(() => {
    downloadCSV(productsToCSV(filtered), `productos-${period}-${Date.now()}.csv`);
  }, [filtered, period]);

  const handlePrintReport = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cm-accent" />
          <h2 className="text-lg font-bold text-cm-text">Analytics</h2>
          <span className="text-xs text-cm-text-secondary ml-1">{filtered.length} pedidos</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-cm-surface border border-cm-border rounded-lg px-1 py-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  period === p.key ? 'bg-cm-accent text-white' : 'text-cm-text-secondary hover:bg-cm-accent/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleExportOrders} title="Exportar órdenes CSV"
              className="p-2 rounded-lg text-cm-text-secondary hover:text-cm-accent hover:bg-cm-accent/10 transition-colors">
              <FileText className="w-4 h-4" />
            </button>
            <button onClick={handleExportProducts} title="Exportar productos CSV"
              className="p-2 rounded-lg text-cm-text-secondary hover:text-cm-accent hover:bg-cm-accent/10 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={handlePrintReport} title="Imprimir reporte"
              className="p-2 rounded-lg text-cm-text-secondary hover:text-cm-accent hover:bg-cm-accent/10 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-3">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-cm-bg-alt border border-cm-border text-xs text-cm-text" />
          <span className="text-xs text-cm-text-secondary">a</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-cm-bg-alt border border-cm-border text-xs text-cm-text" />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ingresos" value={fmtCurrency(kpis.revenue.value)}
          sublabel={fmtCurrency(kpis.revenue.prev)} trend={kpis.revenue.change} trendLabel="vs período anterior"
          icon={DollarSign} color="accent" />
        <KpiCard label="Pedidos" value={kpis.orders.value}
          sublabel={`${kpis.orders.prev} anteriores`} trend={kpis.orders.change}
          icon={ShoppingCart} color="info" />
        <KpiCard label="Ticket promedio" value={fmtCurrency(kpis.avgTicket.value)}
          sublabel={fmtCurrency(kpis.avgTicket.prev)} trend={kpis.avgTicket.change}
          icon={TrendingUp} color="success" />
        <KpiCard label="Tiempo cocina" value={`${kitchen.avg}m`}
          sublabel={`min ${kitchen.min}m / max ${kitchen.max}m`}
          icon={Clock} color="warning" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend chart */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-cm-text">Tendencia de ventas</h3>
            <div className="flex gap-1">
              {['hour', 'day', 'month'].map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-2 py-1 text-[0.6rem] font-semibold rounded-md transition-colors ${
                    chartPeriod === p ? 'bg-cm-accent/10 text-cm-accent' : 'text-cm-text-secondary'
                  }`}>
                  {p === 'hour' ? 'Hora' : p === 'day' ? 'Día' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <LineChartWidget
            data={trendData}
            dataKeys={[
              { dataKey: 'revenue', name: 'Ingresos', color: '#C2410C' },
              { dataKey: 'count', name: 'Pedidos', color: '#2563EB' },
            ]}
            xKey="label"
            height={260}
            yFormatter={(v) => `S/${v}`}
          />
        </div>

        {/* Payment methods */}
        <PieChartWidget
          data={byMethod}
          title="Métodos de pago"
          dataKey="value"
          nameKey="name"
          height={300}
        />
      </div>

      {/* Peak hours */}
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-cm-accent" />
          <h3 className="text-sm font-semibold text-cm-text">Horas pico</h3>
        </div>
        <BarChartWidget
          data={peakHours}
          dataKeys={[
            { dataKey: 'count', name: 'Pedidos', color: '#2563EB' },
          ]}
          xKey="hour"
          height={200}
        />
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <div className="text-lg font-bold text-cm-accent">
              {peakHours.reduce((a, b) => b.count > (a.count || 0) ? b : a, { count: 0 }).hour}
            </div>
            <div className="text-cm-text-secondary text-[0.6rem] uppercase tracking-wider">Hora pico</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cm-text">{peakHours.reduce((s, h) => s + h.count, 0)}</div>
            <div className="text-cm-text-secondary text-[0.6rem] uppercase tracking-wider">Total pedidos</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cm-text">
              {(() => { const max = peakHours.reduce((a, b) => b.count > a.count ? b : a, { count: 0 }); return max.revenue ? fmtCurrency(max.revenue) : '—' })()}
            </div>
            <div className="text-cm-text-secondary text-[0.6rem] uppercase tracking-wider">Pico ingresos</div>
          </div>
        </div>
      </div>

      {/* Products row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products — bar chart horizontal */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-cm-accent" />
            Top productos más vendidos
          </h3>
          {top.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-cm-text-secondary text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cm-text font-medium truncate">{p.name}</span>
                      <span className="text-cm-text-secondary">{p.qty} uds · {fmtCurrency(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-cm-bg-alt rounded-full overflow-hidden">
                      <div className="h-full bg-cm-accent rounded-full transition-all" style={{ width: `${(p.qty / top[0].qty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <PieChartWidget
          data={byCategory}
          title="Ventas por categoría"
          dataKey="value"
          nameKey="name"
          height={300}
        />
      </div>

      {/* Bottom products */}
      {bottom.length > 0 && bottom[0].qty > 0 && (
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cm-warning" />
            Productos con menos salida
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {bottom.map(p => (
              <div key={p.name} className="bg-cm-bg-alt rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-cm-text truncate">{p.name}</div>
                <div className="text-cm-text-secondary mt-0.5">{p.qty} vendidos · {fmtCurrency(p.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff productivity */}
      {staff.length > 0 && (
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-cm-accent" />
            Productividad del staff
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-cm-text-secondary border-b border-cm-border">
                  <th className="text-left font-semibold py-2 pr-4">Staff</th>
                  <th className="text-right font-semibold py-2 px-3">Pedidos</th>
                  <th className="text-right font-semibold py-2 px-3">Ingresos</th>
                  <th className="text-right font-semibold py-2 px-3">Mesa</th>
                  <th className="text-right font-semibold py-2 px-3">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.name} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                    <td className="py-2 pr-4 font-medium text-cm-text">{s.name}</td>
                    <td className="py-2 px-3 text-right text-cm-text">{s.orders}</td>
                    <td className="py-2 px-3 text-right text-cm-text">{fmtCurrency(s.revenue)}</td>
                    <td className="py-2 px-3 text-right text-cm-text-secondary">{s.tableOrders}</td>
                    <td className="py-2 px-3 text-right text-cm-text-secondary">{s.deliveryOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kitchen + Delivery stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-4 h-4 text-cm-info" />
            <h3 className="text-sm font-semibold text-cm-text">Cocina</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-cm-text">{kitchen.avg}m</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">Promedio</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cm-text">{kitchen.min}m</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">Mínimo</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cm-text">{kitchen.max}m</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">Máximo</div>
            </div>
          </div>
          <div className="mt-2 text-[0.6rem] text-cm-text-secondary text-center">Basado en {kitchen.samples} pedidos completados</div>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bike className="w-4 h-4 text-cm-accent" />
            <h3 className="text-sm font-semibold text-cm-text">Delivery</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-cm-text">{filtered.filter(o => o.driverId).length}</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">Asignados</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cm-text">{filtered.filter(o => o.status === 'en_camino').length}</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">En camino</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cm-text">{filtered.filter(o => o.status === 'entregado' && o.driverId).length}</div>
              <div className="text-[0.6rem] text-cm-text-secondary uppercase tracking-wider">Entregados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily report preview */}
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6" id="daily-report">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-cm-text flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cm-accent" />
            Resumen del día
          </h3>
          <button onClick={() => window.print()} className="text-xs font-semibold text-cm-accent hover:underline">
            Imprimir reporte
          </button>
        </div>
        <div className="text-xs text-cm-text-secondary mb-4">{report.date}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-cm-bg-alt rounded-lg p-3">
            <div className="text-[0.6rem] text-cm-text-secondary uppercase">Ingresos</div>
            <div className="text-base font-bold text-cm-text mt-1">{fmtCurrency(report.revenue)}</div>
          </div>
          <div className="bg-cm-bg-alt rounded-lg p-3">
            <div className="text-[0.6rem] text-cm-text-secondary uppercase">Pedidos</div>
            <div className="text-base font-bold text-cm-text mt-1">{report.totalOrders}</div>
          </div>
          <div className="bg-cm-bg-alt rounded-lg p-3">
            <div className="text-[0.6rem] text-cm-text-secondary uppercase">Ticket Prom.</div>
            <div className="text-base font-bold text-cm-text mt-1">{fmtCurrency(report.avgTicket)}</div>
          </div>
          <div className="bg-cm-bg-alt rounded-lg p-3">
            <div className="text-[0.6rem] text-cm-text-secondary uppercase">Completados</div>
            <div className="text-base font-bold text-cm-success mt-1">{report.statusCounts.entregado}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-[0.6rem] font-semibold text-cm-text-secondary uppercase mb-2">Métodos de pago</h4>
            <div className="space-y-1.5">
              {report.byMethod.map(m => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <span className="text-cm-text">{m.name}</span>
                  <span className="text-cm-text-secondary">{fmtCurrency(m.value)} ({m.count} pedidos)</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[0.6rem] font-semibold text-cm-text-secondary uppercase mb-2">Estados de pedidos</h4>
            <div className="space-y-1.5">
              {Object.entries(report.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className="text-cm-text capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-cm-text-secondary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
