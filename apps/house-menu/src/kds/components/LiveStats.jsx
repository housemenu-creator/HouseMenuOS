import { useMemo } from 'react';
import { Clock, ChefHat, AlertTriangle, UtensilsCrossed, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function LiveStats({ orders, orderIndex }) {
  const stats = useMemo(() => {
    const active = orderIndex
      .map((id) => orders[id])
      .filter((o) => o && o.status !== 'entregado' && o.status !== 'cancelado');

    const recibido = active.filter((o) => o.status === 'recibido');
    const preparando = active.filter((o) => o.status === 'preparando');
    const listo = active.filter((o) => o.status === 'listo');
    const overdue = active.filter((o) => o.pacingStatus === 'overdue');
    const totalItems = active.reduce((s, o) => s + (o.items?.length || 0), 0);

    return {
      total: active.length,
      recibido: recibido.length,
      preparando: preparando.length,
      listo: listo.length,
      overdue: overdue.length,
      totalItems,
    };
  }, [orders, orderIndex]);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <StatBadge icon={UtensilsCrossed} value={stats.total} label="Activos" accent />
      <StatBadge icon={Clock} value={stats.recibido} label="Nuevos" color="accent" />
      <StatBadge icon={ChefHat} value={stats.preparando} label="Cocinando" color="warning" />
      <StatBadge icon={TrendingUp} value={stats.listo} label="Listos" color="success" />
      {stats.overdue > 0 && (
        <StatBadge
          icon={AlertTriangle}
          value={stats.overdue}
          label="Atrasados"
          color="error"
          pulse
        />
      )}
    </div>
  );
}

function StatBadge({ icon: Icon, value, label, color, pulse, accent }) {
  const colorMap = {
    accent: 'bg-cm-accent/10 text-cm-accent border-cm-accent/20',
    warning: 'bg-cm-warning/10 text-cm-warning border-cm-warning/20',
    success: 'bg-cm-success/10 text-cm-success border-cm-success/20',
    error: 'bg-cm-error/10 text-cm-error border-cm-error/20',
  };
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
      accent ? 'bg-cm-accent text-white border-cm-accent' : colorMap[color],
      pulse && 'animate-pulse',
    )}>
      <Icon className="w-3 h-3" />
      <span>{value}</span>
      <span className={cn('font-normal opacity-70', accent && 'opacity-80')}>{label}</span>
    </div>
  );
}
