import { MapPin, Package, CheckCircle2, Navigation, Clock, AlertTriangle, Phone, ImageIcon } from 'lucide-react';
import { calculateWaitingTime, formatWaitingTime, getWaitingUrgency } from '../../lib/deliveryService';
import type { Order } from '../../worker/workerTypes';

const STATUS_BADGE: Record<string, string> = {
  listo: 'bg-cm-info/10 text-cm-info border-cm-info/20',
  en_camino: 'bg-cm-warning/10 text-cm-warning border-cm-warning/20',
  entregado: 'bg-cm-success/10 text-cm-success border-cm-success/20',
};

interface DeliveryCardProps {
  order: Order;
  onPickup: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
}

export default function DeliveryCard({ order, onPickup, onDeliver }: DeliveryCardProps) {
  const waitingMs = calculateWaitingTime(order.updatedAt || order.createdAt);
  const urgency = getWaitingUrgency(waitingMs);

  return (
    <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-cm-text-secondary">#{(order.id || '').slice(-4).toUpperCase()}</span>
            <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[order.status] || 'bg-cm-muted/10 text-cm-muted'}`}>
              {order.status === 'en_camino' ? 'En ruta' : order.status === 'listo' ? 'Para recoger' : order.status === 'entregado' ? 'Entregado' : order.status}
            </span>
          </div>
          <p className="font-bold text-cm-text mt-1 truncate">{order.customerName || '—'}</p>
          {order.location && (
            <p className="text-xs text-cm-text-secondary flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" /> {order.location}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[0.5rem] text-cm-text-tertiary flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
            {(order.status === 'listo' || order.status === 'en_camino') && (
              <span className={`text-[0.45rem] font-bold px-1 py-0.5 rounded-full flex items-center gap-0.5 ${
                urgency === 'high' ? 'text-cm-error bg-cm-error/10 border border-cm-error/20' :
                urgency === 'medium' ? 'text-cm-warning bg-cm-warning/10 border border-cm-warning/20' :
                'text-cm-text-secondary bg-cm-bg-alt'
              }`}>
                <AlertTriangle className="w-2 h-2" />
                {formatWaitingTime(waitingMs)}
              </span>
            )}
          </div>
          {order.observaciones && (
            <p className="text-[0.6rem] text-cm-warning font-semibold mt-1 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight inline-block">
              {order.observaciones}
            </p>
          )}
        </div>
        <p className="text-base font-black text-cm-text shrink-0 ml-4">S/ {(order.financials?.total || 0).toFixed(2)}</p>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="bg-cm-bg-alt rounded-lg p-3 mb-3 space-y-1">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-cm-border" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-cm-border flex items-center justify-center shrink-0">
                    <ImageIcon className="w-3.5 h-3.5 text-cm-muted" />
                  </div>
                )}
                <span className="text-cm-text truncate">x{item.quantity || 1} {item.name}</span>
              </div>
              <span className="text-cm-text-secondary font-medium text-xs shrink-0">
                S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {order.status === 'listo' && (
          <button onClick={() => onPickup(order.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Package className="w-3.5 h-3.5" /> Recoger Pedido
            {waitingMs > 0 && <span className="ml-1 opacity-70">{formatWaitingTime(waitingMs)}</span>}
          </button>
        )}
        {order.status === 'en_camino' && (
          <button onClick={() => onDeliver(order.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-success text-white text-xs font-bold rounded-lg hover:bg-cm-success/80 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Entregado
          </button>
        )}
        {order.location && order.status === 'en_camino' && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.location)}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
            <Navigation className="w-3.5 h-3.5" /> Navegar
          </a>
        )}
        {(order as any).customerPhone && (
          <a href={`tel:${(order as any).customerPhone}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-cm-success/10 text-cm-success text-xs font-bold rounded-lg hover:bg-cm-success/20 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Llamar
          </a>
        )}
      </div>

      {order.status === 'entregado' && (
        <p className="text-[0.55rem] text-cm-text-tertiary mt-2">
          {new Date(order.createdAt).toLocaleString('es-PE')}
        </p>
      )}
    </div>
  );
}
