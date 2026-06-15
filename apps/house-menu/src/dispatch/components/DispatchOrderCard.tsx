import { motion } from 'framer-motion';
import { Truck, Navigation, Clock, UtensilsCrossed, User, CheckCircle2 } from 'lucide-react';
import { formatWaitingTime, getWaitingUrgency } from '../../lib/deliveryService';
import type { DispatchOrder } from '../hooks/useDispatchOrders';

interface DispatchOrderCardProps {
  order: DispatchOrder;
  loadingId: string | null;
  onAssignDriver: (order: DispatchOrder) => void;
  onConfirmDelivery: (order: DispatchOrder) => void;
  onUnassignDriver?: (order: DispatchOrder) => void;
}

const URGENCY_STYLES: Record<string, string> = {
  low: 'text-cm-text-secondary bg-cm-bg-alt',
  medium: 'text-cm-warning bg-cm-warning/10 border border-cm-warning/20',
  high: 'text-cm-error bg-cm-error/10 border border-cm-error/20 animate-pulse',
};

export default function DispatchOrderCard({ order, loadingId, onAssignDriver, onConfirmDelivery, onUnassignDriver }: DispatchOrderCardProps) {
  const isDelivery = ((order.type || order.order_type || '') as string).toLowerCase().includes('delivery');
  const isReady = order.status === 'listo';
  const urgency = getWaitingUrgency(order.waitingMs);

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-cm-surface rounded-xl border border-cm-border overflow-hidden">
      <div className={`p-4 border-b-2 flex justify-between items-start ${
        isReady ? 'bg-cm-warning/10 border-cm-warning/20' : 'bg-cm-success/10 border-cm-success/20'
      }`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-black text-lg text-cm-text uppercase tracking-tight">{order.customerName}</h3>
            {!isDelivery && (
              <span className="flex items-center gap-1 text-[9px] font-black text-white bg-cm-accent px-2 py-0.5 rounded uppercase tracking-wider">
                <UtensilsCrossed className="w-3 h-3" /> LOCAL
              </span>
            )}
            {isDelivery && (
              <span className="flex items-center gap-1 text-[9px] font-black text-white bg-cm-info px-2 py-0.5 rounded uppercase tracking-wider">
                <Truck className="w-3 h-3" /> DELIVERY
              </span>
            )}
          </div>
          {order.location && (
            <p className="text-cm-muted font-bold mt-1 flex items-center gap-1.5 text-sm">
              <Navigation className="w-3.5 h-3.5" /> {order.location}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-xs text-cm-muted font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </p>
            <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full ${URGENCY_STYLES[urgency]}`}>
              {formatWaitingTime(order.waitingMs)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs bg-cm-accent/10 text-cm-text-secondary px-2 py-1 rounded font-bold">
            #{(order.id || '').slice(-4).toUpperCase()}
          </span>
          <p className="text-base font-black text-cm-accent mt-2">S/ {(order.financials?.total ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-2">Pedido</p>
        <ul className="space-y-1.5 mb-3">
          {order.items?.map((item, i) => (
            <li key={item.productId || i} className="flex justify-between items-start text-sm">
              <div>
                <span className="font-bold text-cm-text">{item.name}</span>
                {item.details && item.details.length > 0 && (
                  <span className="block text-xs text-cm-muted mt-0.5">{item.details.join(', ')}</span>
                )}
              </div>
              <span className="font-bold text-cm-muted ml-4 shrink-0 text-xs">×{item.quantity || 1}</span>
            </li>
          ))}
        </ul>

        {order.observaciones && (
          <div className="bg-cm-warning/10 border border-cm-warning/20 rounded-lg p-2.5 mb-3">
            <p className="text-[0.55rem] font-bold text-cm-warning uppercase tracking-widest mb-0.5">Nota</p>
            <p className="text-xs font-bold text-cm-warning">{order.observaciones}</p>
          </div>
        )}

        {order.status === 'en_camino' && order.driverName && (
          <div className="bg-cm-info/10 border border-cm-info/20 rounded-lg p-2.5 mb-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-cm-info">
                <User className="w-3.5 h-3.5" /> {order.driverName}
              </span>
              {onUnassignDriver && (
                <button onClick={() => onUnassignDriver(order)}
                  className="text-[0.55rem] font-bold text-cm-info underline underline-offset-2 hover:text-cm-info/70">
                  Desasignar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {isReady ? (
          !isDelivery ? (
            <button onClick={() => onConfirmDelivery(order)}
              className="w-full py-3.5 rounded-xl font-black tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110">
              <CheckCircle2 className="w-4 h-4" /> ENTREGAR EN LOCAL
            </button>
          ) : (
            <button onClick={() => onAssignDriver(order)}
              disabled={loadingId === order.id}
              className="w-full py-3.5 rounded-xl font-black tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-info text-white shadow-cm-md hover:brightness-110 disabled:opacity-60">
              {loadingId === order.id ? (
                <span className="animate-pulse">PROCESANDO...</span>
              ) : (
                <><Truck className="w-4 h-4" /> ASIGNAR REPARTIDOR</>
              )}
            </button>
          )
        ) : (
          <button onClick={() => onConfirmDelivery(order)}
            className="w-full py-3.5 rounded-xl font-black tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110">
            <CheckCircle2 className="w-4 h-4" /> CONFIRMAR ENTREGA
          </button>
        )}
      </div>
    </motion.div>
  );
}
