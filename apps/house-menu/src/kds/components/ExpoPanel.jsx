import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { confirmDialog } from '../../components/ConfirmDialog';
import { CheckCircle, Clock, User, Hash, Package, UtensilsCrossed, Bike } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatTimer } from '../utils/formatTimer';
import useTimerStore from '../store/timerStore';

const SOURCE_ICONS = {
  'delivery': Bike,
  'pickup': Package,
  'dine-in': UtensilsCrossed,
};

const SOURCE_LABELS = {
  'delivery': 'Delivery',
  'pickup': 'Recojo',
  'dine-in': 'Mesa',
};

function ExpoCard({ order, onDeliver }) {
  const elapsedMs = useTimerStore((s) => s.elapsed[order.id] || 0);
  const isUrgent = elapsedMs > 5 * 60 * 1000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative flex flex-col rounded-2xl border bg-cm-surface p-5 transition-all duration-200',
        isUrgent ? 'border-cm-error/30 shadow-cm-md' : 'border-cm-border hover:shadow-cm-md',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold text-cm-muted bg-cm-muted/5 px-2 py-0.5 rounded-md border border-cm-border">
            <Hash className="w-2.5 h-2.5" />
            {(order.id || '').slice(-6).toUpperCase()}
          </span>
          {order.tableNumber && (
            <span className="text-[0.55rem] font-semibold text-cm-accent bg-cm-accent/10 px-2 py-0.5 rounded-full">
              Mesa {order.tableNumber}
            </span>
          )}
        </div>
        <span className={cn(
          'text-[0.55rem] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border',
          isUrgent ? 'text-cm-error bg-cm-error/10 border-cm-error/20 animate-pulse' : 'text-cm-success bg-cm-success/10 border-cm-success/20'
        )}>
          {isUrgent ? 'URGENTE' : 'LISTO'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-cm-muted/40" />
        <span className="font-bold text-lg text-cm-text">{order.customerName}</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-cm-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className={cn(
            'font-mono font-bold text-sm tabular-nums',
            isUrgent ? 'text-cm-error' : 'text-cm-muted'
          )}>
            {formatTimer(elapsedMs)}
          </span>
        </div>
      </div>

      <div className="flex-1">
        {order.observaciones && (
          <p className="text-[0.55rem] text-cm-warning font-semibold mb-2 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight">
            📝 {order.observaciones}
          </p>
        )}
        {order.items?.slice(0, 5).map((item, i) => (
          <div key={i} className="text-sm text-cm-text/70 flex items-center gap-2 py-0.5">
            <span className="text-cm-muted/30">×{item.quantity || 1}</span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items?.length > 5 && (
          <p className="text-[0.6rem] text-cm-muted/50 mt-1">+{order.items.length - 5} más</p>
        )}
      </div>

      {order.location && (
        <p className="text-[0.65rem] text-cm-muted mt-2 pt-2 border-t border-cm-border/50">
          📍 {order.location}
        </p>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={async () => {
          const ok = await confirmDialog('¿Entregar este pedido al cliente?', 'Entregar');
          if (!ok) return;
          onDeliver(order.id);
        }}
        className={cn(
          'w-full mt-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2',
          isUrgent
            ? 'bg-cm-error text-white hover:bg-cm-error/80 shadow-cm-sm'
            : 'bg-cm-success text-white hover:bg-cm-success/80 shadow-cm-sm'
        )}
      >
        <CheckCircle className="w-4 h-4" />
        ENTREGAR
      </motion.button>
    </motion.div>
  );
}

export default function ExpoPanel({ readyOrders, onDeliver }) {
  const grouped = useMemo(() => {
    const groups = { 'dine-in': [], delivery: [], pickup: [] };
    for (const o of readyOrders) {
      const src = o.source || 'dine-in';
      if (groups[src]) groups[src].push(o);
      else groups['dine-in'].push(o);
    }
    return groups;
  }, [readyOrders]);

  const hasAny = Object.values(grouped).some((g) => g.length > 0);

  if (!hasAny) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-cm-success/30" />
          <p className="text-cm-muted font-semibold">No hay pedidos listos para entregar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 pb-10 scrollbar-hide">
      {Object.entries(grouped).map(([source, orders]) => {
        if (orders.length === 0) return null;
        const Icon = SOURCE_ICONS[source] || UtensilsCrossed;
        const label = SOURCE_LABELS[source] || source;
        return (
          <div key={source} className="mb-8">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-cm-bg pb-2 z-10">
              <div className="w-8 h-8 rounded-xl bg-cm-accent/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-cm-accent" />
              </div>
              <h2 className="font-bold text-lg text-cm-text">{label}</h2>
              <span className="text-xs text-cm-muted bg-cm-muted/5 px-2 py-0.5 rounded-full">{orders.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {orders.map((order) => (
                  <ExpoCard key={order.id} order={order} onDeliver={onDeliver} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
