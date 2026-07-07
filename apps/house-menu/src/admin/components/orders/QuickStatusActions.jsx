const STATUS_FLOW = {
  recibido: { next: 'preparando', label: 'En Cocina' },
  preparando: { next: 'listo', label: 'Listo' },
  listo: { next: 'entregado', label: 'Entregado' },
};

const STATUS_FLOW_DELIVERY = {
  ...STATUS_FLOW,
  listo: { next: 'en_camino', label: 'En Camino' },
  en_camino: { next: 'entregado', label: 'Entregado' },
};

const STATUS_COLORS = {
  recibido: 'bg-cm-error/10 text-cm-error hover:bg-cm-error/20',
  preparando: 'bg-cm-warning/10 text-cm-warning hover:bg-cm-warning/20',
  listo: 'bg-cm-accent/10 text-cm-accent hover:bg-cm-accent/20',
  en_camino: 'bg-cm-info/10 text-cm-info hover:bg-cm-info/20',
  entregado: 'bg-cm-success/10 text-cm-success hover:bg-cm-success/20',
};

export default function QuickStatusActions({ order, can, onStatusChange }) {
  if (order.status === 'cancelado' || order.status === 'entregado') return null;
  if (!can || !can('orders:status')) return null;

  const flow = order.orderType === 'delivery' ? STATUS_FLOW_DELIVERY : STATUS_FLOW;
  const step = flow[order.status];
  if (!step) return null;

  return (
    <button
      onClick={() => onStatusChange && onStatusChange(order.id, step.next)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${STATUS_COLORS[step.next] || 'bg-cm-accent/10 text-cm-accent hover:bg-cm-accent/20'}`}
    >
      {step.label}
    </button>
  );
}
