import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronDown, ChevronUp, Store, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatOrderId } from '../../../lib/format';
import StatusBadge from '../StatusBadge';
import type { CustomerOrder } from '../../hooks/crm/useCustomerProfile';

function OrderRow({ order }: { order: CustomerOrder }) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = order.items?.length || 0;
  const total = order.financials?.total ?? order.total ?? 0;

  return (
    <motion.div
      layout
      className="rounded-lg border border-cm-border bg-cm-surface"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-cm-accent/5"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-cm-text-tertiary" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-cm-text-tertiary" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-cm-text-secondary">
                {formatOrderId(order.id)}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {order.branchName && (
                <span className="inline-flex items-center gap-1 text-[10px] text-cm-text-secondary">
                  <Store className="h-3 w-3" />
                  {order.branchName}
                </span>
              )}
              <span className="text-[10px] text-cm-text-secondary">
                {new Date(order.createdAt).toLocaleString('es-PE')}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-cm-text">{formatCurrency(total)}</p>
          <p className="text-[10px] text-cm-text-secondary">{itemCount} item(s)</p>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-cm-border"
          >
            <div className="px-4 py-3 space-y-2">
              {/* Items */}
              {itemCount > 0 ? (
                <div className="space-y-1">
                  {order.items!.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-cm-text">
                        {item.name}{' '}
                        <span className="text-cm-text-secondary">x{item.quantity || 1}</span>
                      </span>
                      <span className="font-medium text-cm-text">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cm-text-secondary">Sin items registrados</p>
              )}

              {/* Financial summary */}
              {order.financials && (
                <div className="border-t border-cm-border/50 pt-2 space-y-0.5">
                  {order.financials.subtotal > 0 && (
                    <div className="flex justify-between text-xs text-cm-text-secondary">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.financials.subtotal)}</span>
                    </div>
                  )}
                  {order.financials.deliveryFee > 0 && (
                    <div className="flex justify-between text-xs text-cm-text-secondary">
                      <span>Delivery</span>
                      <span>{formatCurrency(order.financials.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-cm-text">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CustomerProfileOrders({
  orders = [],
}: {
  orders: CustomerOrder[];
}) {
  // Empty
  if (!orders.length) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-6 shadow-cm-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-4 w-4 text-cm-accent" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
            Historial de pedidos
          </h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ShoppingBag className="h-8 w-8 text-cm-text-tertiary" />
          <p className="text-sm text-cm-text-secondary">Sin pedidos registrados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-4 w-4 text-cm-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
          Historial de pedidos ({orders.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        <AnimatePresence>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
