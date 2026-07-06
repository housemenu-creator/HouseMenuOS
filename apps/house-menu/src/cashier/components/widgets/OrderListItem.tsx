import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Smartphone, ArrowRightLeft, Users } from 'lucide-react';
import type { Order } from '../../types';

interface OrderListItemProps {
  order: Order;
  onQuickPay: () => void;
  onCancel: () => void;
  onTransfer: () => void;
  onVerify: () => void;
  onSplit?: () => void;
}

const statusColors: Record<string, string> = {
  pagado: 'var(--cashier-success)',
  pendiente: 'var(--cashier-warning)',
  por_verificar: 'var(--cashier-info)',
  cancelado: 'var(--cashier-error)',
  reembolsado: 'var(--cashier-text-muted)',
};

const statusLabels: Record<string, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  por_verificar: 'Por Verificar',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
};

export function OrderListItem({ order, onQuickPay, onCancel, onTransfer, onVerify, onSplit }: OrderListItemProps) {
  const borderColor = statusColors[order.payment_status] || 'var(--cashier-border)';
  const statusLabel = statusLabels[order.payment_status] || order.payment_status;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="cashier-panel border rounded-xl overflow-hidden transition-all duration-150 hover:border-[var(--cashier-accent)]"
      style={{ borderColor, borderLeftWidth: 4 }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-[var(--cashier-text)]">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ borderColor, color: borderColor }}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs font-bold text-[var(--cashier-text-secondary)] mt-0.5">
              {order.customerName || 'Cliente General'}
              {order.mesa && <span> · Mesa {order.mesa}</span>}
            </p>
          </div>
          <p className="font-mono font-black text-lg text-[var(--cashier-text)]">
            S/ {order.financials?.total.toFixed(2) || '0.00'}
          </p>
        </div>

        {(order.items || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {order.items!.slice(0, 3).map((item, i) => (
              <span key={i} className="text-[10px] font-bold text-[var(--cashier-text-muted)] bg-[var(--cashier-bg)] px-2 py-0.5 rounded-md border border-[var(--cashier-border)]">
                {item.quantity}x {item.name || item.productName || item.productId}
              </span>
            ))}
            {(order.items!.length > 3) && (
              <span className="text-[10px] font-bold text-[var(--cashier-text-muted)]">
                +{order.items!.length - 3} más
              </span>
            )}
          </div>
        )}

        <div className="flex gap-1.5 mt-2">
          {order.payment_status === 'pendiente' && (
            <button onClick={onQuickPay}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 bg-[var(--cashier-success)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
              <CheckCircle size={12} /> Cobrar
            </button>
          )}
          {order.payment_status === 'por_verificar' && (
            <button onClick={onVerify}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 bg-[var(--cashier-info)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-sm">
              <Smartphone size={12} /> Verificar
            </button>
          )}
          <button onClick={onTransfer}
            className="flex items-center justify-center gap-1 px-2.5 py-2 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-all">
            <ArrowRightLeft size={12} />
          </button>
          {onSplit && (order.items?.length || 0) > 1 && (
            <button onClick={onSplit}
              className="flex items-center justify-center gap-1 px-2.5 py-2 border border-[var(--cashier-accent)]/30 text-[var(--cashier-accent)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-accent)]/10 transition-all">
              <Users size={12} />
            </button>
          )}
          <button onClick={onCancel}
            className="flex items-center justify-center gap-1 px-2.5 py-2 border border-[var(--cashier-error)]/30 text-[var(--cashier-error)] text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-error)]/10 transition-all">
            <XCircle size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
