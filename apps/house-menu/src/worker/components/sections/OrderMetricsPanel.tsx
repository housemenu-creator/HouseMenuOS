import { useState, useEffect, useRef } from 'react';
import { Activity, Coffee } from 'lucide-react';

function AnimCounter({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  const st = useRef(0);
  const from = useRef(0);
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display; st.current = null;
    const step = (ts) => {
      if (!st.current) st.current = ts;
      const p = Math.min((ts - st.current) / duration, 1);
      const e = 1 - (1 - p) * (1 - p);
      setDisplay(Math.round(from.current + (value - from.current) * e));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <>{display}</>;
}

// ── Display config for each status ──

const STATUS_DISPLAY: Record<string, { label: string; dot: string; badge: string }> = {
  recibido:   { label: 'Recibido',   dot: 'bg-cm-warning',  badge: 'bg-cm-warning/10 text-cm-warning border-cm-warning/20' },
  preparando: { label: 'Preparando', dot: 'bg-cm-info',     badge: 'bg-cm-info/10 text-cm-info border-cm-info/20' },
  listo:      { label: 'Listo',      dot: 'bg-cm-success',  badge: 'bg-cm-success/10 text-cm-success border-cm-success/20' },
  en_camino:  { label: 'En camino',  dot: 'bg-cm-accent',   badge: 'bg-cm-accent/10 text-cm-accent border-cm-accent/20' },
  entregado:  { label: 'Entregado',  dot: 'bg-cm-border',   badge: 'bg-cm-border text-cm-muted border-cm-border' },
  cancelado:  { label: 'Cancelado',  dot: 'bg-cm-error',    badge: 'bg-cm-error/10 text-cm-error border-cm-error/20' },
};

// ── Props ──

interface Props {
  statusCounts: Record<string, number>;
  activeOrders: any[];
}

// ── Componente ──

export default function OrderMetricsPanel({ statusCounts, activeOrders }: Props) {
  const orderMetrics = [
    { label: 'Recibidos',   count: statusCounts['recibido'] || 0,   dot: 'bg-cm-warning', key: 'recibido' },
    { label: 'En cocina',   count: statusCounts['preparando'] || 0, dot: 'bg-cm-info',    key: 'preparando' },
    { label: 'Listos',      count: statusCounts['listo'] || 0,       dot: 'bg-cm-success', key: 'listo' },
    { label: 'En camino',   count: statusCounts['en_camino'] || 0,   dot: 'bg-cm-accent',  key: 'en_camino' },
  ];

  const recentActiveOrders = activeOrders.slice(-5).reverse();

  return (
    <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
      <div className="flex items-center justify-between border-b border-cm-border/60 pb-3">
        <div>
          <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">En Tiempo Real</span>
          <h2 className="text-sm font-bold text-cm-text flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cm-accent" />
            Estado de Operaciones
          </h2>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-black text-cm-success bg-cm-success/10 px-2.5 py-1 rounded-full border border-cm-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Pipeline de estados */}
      <div className="grid grid-cols-4 gap-3">
        {orderMetrics.map(({ label, count, dot, key }) => (
          <div key={key} className="text-center">
            <div className="relative mb-1">
              <div className={`w-2 h-2 rounded-full ${dot} mx-auto ${count > 0 ? 'animate-pulse' : 'opacity-30'}`} />
            </div>
            <p className="text-2xl font-black text-cm-text tabular-nums"><AnimCounter value={count} /></p>
            <p className="text-[9px] text-cm-muted font-bold uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Feed de pedidos activos */}
      <div>
        <p className="text-[10px] font-black text-cm-muted uppercase tracking-widest mb-2">Últimos Pedidos Activos</p>
        {recentActiveOrders.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-cm-border rounded-xl">
            <Coffee className="w-5 h-5 text-cm-muted mx-auto mb-1.5 opacity-30" />
            <p className="text-xs text-cm-muted">Sin pedidos activos ahora mismo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActiveOrders.map((order) => {
              const st = STATUS_DISPLAY[order.status] || STATUS_DISPLAY['recibido'];
              const total = order.financials?.total;
              return (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 bg-cm-bg-alt/60 border border-cm-border/50 rounded-xl hover:border-cm-accent/20 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0 ${order.status === 'recibido' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-cm-text truncate">
                      {order.customerName || 'Cliente'}{order.tableNumber ? ` · Mesa ${order.tableNumber}` : ''}
                    </p>
                    <p className="text-[10px] text-cm-muted">
                      #{order.id.slice(-5).toUpperCase()}
                      {order.type === 'delivery' ? <span className="ml-1.5 text-purple-400">📦 Delivery</span> : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${st.badge}`}>
                      {st.label}
                    </span>
                    {total != null && (
                      <p className="text-[10px] font-bold text-cm-text mt-0.5">S/ {total.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
