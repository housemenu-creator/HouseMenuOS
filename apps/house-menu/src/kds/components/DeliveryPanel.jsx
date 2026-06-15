import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, MapPin, Clock, User, Hash, CheckCircle, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatTimer } from '../utils/formatTimer';
import useTimerStore from '../store/timerStore';

function DeliveryCard({ order, onHandoff }) {
  const elapsedMs = useTimerStore((s) => s.elapsed[order.id] || 0);
  const isUrgent = elapsedMs > 8 * 60 * 1000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={cn(
        'relative flex flex-col rounded-2xl border bg-cm-surface p-5 transition-all',
        isUrgent ? 'border-cm-error/30' : 'border-cm-border hover:shadow-cm-md',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            isUrgent ? 'bg-cm-error/10' : 'bg-cm-accent/10'
          )}>
            <Bike className={cn('w-4 h-4', isUrgent ? 'text-cm-error' : 'text-cm-accent')} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-[0.55rem] font-semibold text-cm-muted bg-cm-muted/5 px-2 py-0.5 rounded-md border border-cm-border">
              <Hash className="w-2 h-2" />
              {(order.id || '').slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
        <span className={cn(
          'text-[0.55rem] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border',
          isUrgent ? 'text-cm-error bg-cm-error/10 border-cm-error/20 animate-pulse' : 'text-cm-success bg-cm-success/10 border-cm-success/20'
        )}>
          {isUrgent ? 'URGENTE' : 'LISTO'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-cm-muted/40" />
        <span className="font-bold text-lg text-cm-text">{order.customerName}</span>
      </div>

      {order.location && (
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-cm-muted/40 mt-0.5 shrink-0" />
          <span className="text-sm text-cm-muted leading-tight">{order.location}</span>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-cm-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className={cn(
            'font-mono font-bold text-sm tabular-nums',
            isUrgent && 'text-cm-error'
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
        {order.items?.slice(0, 4).map((item, i) => (
          <div key={i} className="text-sm text-cm-text/70 flex items-center gap-2 py-0.5">
            <span className="text-cm-muted/30">×{item.quantity || 1}</span>
            <span className="truncate">{item.name}</span>
          </div>
        ))}
        {order.items?.length > 4 && (
          <p className="text-[0.6rem] text-cm-muted/50 mt-1">+{order.items.length - 4} items</p>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onHandoff(order.id)}
        className={cn(
          'w-full mt-4 py-3.5 rounded-xl font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-2.5',
          isUrgent
            ? 'bg-cm-error text-white hover:bg-cm-error/80 shadow-cm-sm'
            : 'bg-cm-accent text-white hover:bg-cm-accent-hover shadow-cm-sm'
        )}
      >
        <CheckCircle className="w-4 h-4" />
        ENTREGAR A DELIVERY
      </motion.button>
    </motion.div>
  );
}

export default function DeliveryPanel({ readyOrders, onHandoff }) {
  const deliveryOrders = useMemo(
    () => readyOrders.filter((o) => o.source === 'delivery' || o.source === 'pickup'),
    [readyOrders]
  );

  if (deliveryOrders.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Bike className="w-16 h-16 mx-auto mb-4 text-cm-muted/20" />
          <p className="text-cm-muted font-semibold">No hay pedidos para delivery</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 pb-10 scrollbar-hide">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-cm-accent/10 flex items-center justify-center">
          <Bike className="w-5 h-5 text-cm-accent" />
        </div>
        <div>
          <h2 className="font-bold text-xl text-cm-text">Delivery Handoff</h2>
          <p className="text-xs text-cm-muted">{deliveryOrders.length} pedido{deliveryOrders.length !== 1 ? 's' : ''} pendiente{deliveryOrders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {deliveryOrders.map((order) => (
            <DeliveryCard key={order.id} order={order} onHandoff={onHandoff} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
