import { Award, ShoppingBag, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

// ── Props ──

interface Props {
  kpis: { totalOrders: number; totalRevenue: number; avgOrderValue: number; cancellations: number };
  currentTime: Date;
}

// ── Componente ──

export default function KPISection({ kpis, currentTime }: Props) {
  return (
    <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
      <div className="flex items-center justify-between border-b border-cm-border/60 pb-3">
        <div>
          <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">Tus Métricas</span>
          <h2 className="text-sm font-bold text-cm-text flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Desempeño del Turno
          </h2>
        </div>
        <span className="text-[10px] font-black text-cm-muted bg-cm-bg-alt px-2.5 py-1 rounded-lg uppercase">
          {currentTime.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Órdenes', value: kpis.totalOrders.toString(), icon: <ShoppingBag className="w-4 h-4 text-cm-accent" />, sub: 'procesadas hoy' },
          { label: 'Facturado', value: `S/ ${kpis.totalRevenue.toFixed(0)}`, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, sub: 'volumen bruto' },
          { label: 'Ticket Medio', value: `S/ ${kpis.avgOrderValue.toFixed(0)}`, icon: <BarChart3 className="w-4 h-4 text-amber-500" />, sub: 'por orden' },
          { label: 'Canceladas', value: kpis.cancellations.toString(), icon: <AlertCircle className="w-4 h-4 text-red-500" />, sub: 'anuladas' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="bg-cm-bg-alt/50 border border-cm-border rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-cm-text-secondary text-[10px] font-black uppercase tracking-wider">
              {icon} {label}
            </div>
            <p className="text-xl font-black text-cm-text tabular-nums">{value}</p>
            <p className="text-[9px] text-cm-muted">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
