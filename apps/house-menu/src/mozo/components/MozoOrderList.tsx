import { User, Printer, CheckCircle2, DollarSign } from 'lucide-react';
import StatusBadge from '../../admin/components/StatusBadge';
import { printTicket } from '../../lib/printTicket';

import type { Order } from '../../worker/workerTypes';

interface MozoOrderListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string) => void;
  onCobrar: (order: Order) => void;
}

export default function MozoOrderList({ orders, onUpdateStatus, onCobrar }: MozoOrderListProps) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isPaid = order.payment_status === 'pagado';

        return (
          <div key={order.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-cm-text-secondary">#{(order.id || '').slice(-4).toUpperCase()}</span>
                  <StatusBadge status={order.status} />
                  {isPaid && (
                    <span className="text-[0.55rem] font-bold text-cm-success bg-cm-success/10 border border-cm-success/20 px-1.5 py-0.5 rounded-full">Pagado</span>
                  )}
                </div>
                <p className="font-bold text-cm-text mt-1">{order.customerName || 'Anónimo'}</p>
                {order.location && (
                  <p className="text-xs text-cm-text-secondary flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" /> {order.location}
                  </p>
                )}
                {order.observaciones && (
                  <p className="text-[0.6rem] text-cm-warning font-semibold mt-1.5 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight inline-block">
                    {order.observaciones}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="text-lg font-black text-cm-text">S/ {(order.financials?.total || 0).toFixed(2)}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => printTicket(order)}
                    className="p-1.5 rounded-lg bg-cm-accent/5 border border-cm-border text-cm-text-secondary hover:text-cm-accent hover:border-cm-accent/30 transition-colors"
                    title="Imprimir comanda">
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="bg-cm-bg-alt rounded-lg p-3 mb-3 space-y-1">
                {order.items.map((item, idx) => (
                  <div key={`${item.productId || idx}-${idx}`} className="flex justify-between text-sm items-start">
                    <div>
                      <span className="text-cm-text">x{item.quantity || 1} {item.name}</span>
                      {item.details && item.details.length > 0 && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {item.details.map((d, dIdx) => (
                            <p key={dIdx} className="text-[0.55rem] text-cm-text-tertiary border-l-2 border-cm-border pl-2">{d}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-cm-text-secondary font-medium text-xs whitespace-nowrap ml-2">
                      S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-2 flex-1">
                {order.status === 'listo' && (
                  <button onClick={() => onUpdateStatus(order.id, 'entregado')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-success/10 text-cm-success text-xs font-bold rounded-lg hover:bg-cm-success/20 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Entregar
                  </button>
                )}
                {order.status === 'recibido' && (
                  <span className="text-[0.6rem] text-cm-text-tertiary italic">En cocina...</span>
                )}
                {order.status === 'preparando' && (
                  <span className="text-[0.6rem] text-cm-accent italic font-semibold">Preparando...</span>
                )}
              </div>

              {order.status === 'entregado' && !isPaid && (
                <button onClick={() => onCobrar(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
                  <DollarSign className="w-3.5 h-3.5" /> Cobrar
                </button>
              )}
            </div>

            <p className="text-[0.55rem] text-cm-text-tertiary mt-2">
              {order.createdAt ? new Date(order.createdAt).toLocaleString('es-PE') : '—'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
