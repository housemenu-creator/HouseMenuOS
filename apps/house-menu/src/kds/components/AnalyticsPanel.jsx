import React, { useMemo } from 'react';
import { TrendingUp, Clock, ChefHat, Zap, UtensilsCrossed } from 'lucide-react';

function calcMetrics(historyOrders) {
  if (!historyOrders || historyOrders.length === 0) return null;

  const total = historyOrders.length;
  const totalSales = historyOrders.reduce((s, o) => s + (o.financials?.total || 0), 0);

  let avgPrepMs = 0;
  let prepTimes = 0;
  historyOrders.forEach((o) => {
    const recibido = o.statusTimestamps?.recibido ? new Date(o.statusTimestamps.recibido) : null;
    const listo = o.statusTimestamps?.listo ? new Date(o.statusTimestamps.listo) : null;
    if (recibido && listo) {
      avgPrepMs += listo - recibido;
      prepTimes++;
    }
  });
  const avgPrepMin = prepTimes > 0 ? Math.round((avgPrepMs / prepTimes) / 60000) : null;

  const itemsSold = {};
  historyOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const n = item.name || 'Item';
      itemsSold[n] = (itemsSold[n] || 0) + (item.quantity || 1);
    });
  });
  const topItem = Object.entries(itemsSold).sort((a, b) => b[1] - a[1])[0];

  return { total, totalSales, avgPrepMin, topItem };
}

const METRICS = [
  { key: 'total', label: 'Pedidos Hoy', icon: UtensilsCrossed, format: (v) => String(v) },
  { key: 'totalSales', label: 'Ventas', icon: TrendingUp, format: (v) => `S/ ${v.toFixed(2)}` },
  { key: 'avgPrepMin', label: 'Prep. Promedio', icon: Clock, format: (v) => v ? `${v} min` : '—' },
];

export default function AnalyticsPanel({ orders, className = '' }) {
  const completedOrders = useMemo(
    () => (orders || []).filter((o) => o.status === 'entregado'),
    [orders]
  );
  const metrics = useMemo(() => calcMetrics(completedOrders), [completedOrders]);

  if (!metrics) return null;

  return (
    <div className={`grid grid-cols-3 gap-3 mb-6 ${className}`}>
      {METRICS.map(({ key, label, icon: Icon, format }) => (
        <div
          key={key}
          className="bg-cm-muted/5 rounded-xl border border-cm-border/10 p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-cm-accent/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-cm-accent" />
          </div>
          <div>
            <p className="text-[0.6rem] text-cm-muted/50 uppercase tracking-wider font-bold">{label}</p>
            <p className="text-lg font-bold text-cm-text mt-0.5">{format(metrics[key])}</p>
          </div>
        </div>
      ))}

      {metrics.topItem && (
        <div className="col-span-3 bg-cm-muted/5 rounded-xl border border-cm-border/10 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cm-accent/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-cm-accent" />
          </div>
          <div>
            <p className="text-[0.6rem] text-cm-muted/50 uppercase tracking-wider font-bold">Producto Más Vendido</p>
            <p className="text-lg font-bold text-cm-text mt-0.5">
              {metrics.topItem?.[0]} <span className="text-sm font-bold text-cm-accent">×{metrics.topItem?.[1]}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
