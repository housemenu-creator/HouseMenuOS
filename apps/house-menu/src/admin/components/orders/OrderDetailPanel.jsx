import {
  Edit3,
  StickyNote,
  Printer,
  DollarSign,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatCurrency, formatOrderId } from '../../../lib/format';
import QuickStatusActions from './QuickStatusActions';

const PAYMENT_STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', dot: 'bg-yellow-500', bg: 'bg-yellow-500/10 text-yellow-600' },
  por_verificar: { label: 'Por verificar', dot: 'bg-cm-accent', bg: 'bg-cm-accent/10 text-cm-accent' },
  pagado: { label: 'Pagado', dot: 'bg-green-500', bg: 'bg-green-500/10 text-green-600' },
  reembolsado: { label: 'Reembolsado', dot: 'bg-orange-400', bg: 'bg-orange-400/10 text-orange-600' },
};

function ItemRow({ item }) {
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  return (
    <tr className="border-b border-cm-border/50 last:border-0">
      <td className="py-2 text-sm text-cm-text">{item.name}</td>
      <td className="py-2 text-center text-sm text-cm-text-secondary">x{qty}</td>
      <td className="py-2 text-sm text-cm-text-secondary">
        {item.details?.join(', ') || '\u2014'}
      </td>
      <td className="py-2 text-right text-sm text-cm-text font-medium">
        {formatCurrency(price)}
      </td>
      <td className="py-2 text-right text-sm text-cm-text font-semibold">
        {formatCurrency(qty * price)}
      </td>
    </tr>
  );
}

export default function OrderDetailPanel({
  order,
  branchId,
  can = () => false,
  onStatusChange,
  onEdit,
  onNotes,
  onPrint,
  onRefund,
  onCobrar,
  onVerify,
}) {
  const canEdit = order.status !== 'cancelado' && order.status !== 'entregado';
  const canRefund = order.payment_status === 'pagado' && !order.refund;
  const financials = order.financials;
  const paymentCfg = order.payment_status
    ? PAYMENT_STATUS_CONFIG[order.payment_status]
    : null;

  return (
    <div className="space-y-4">
      {/* Items table */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cm-text-secondary">
          Items del pedido
        </h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cm-border">
              <th className="py-1.5 text-left text-xs font-semibold text-cm-text-secondary">
                Producto
              </th>
              <th className="py-1.5 text-center text-xs font-semibold text-cm-text-secondary">
                Cant
              </th>
              <th className="hidden py-1.5 text-left text-xs font-semibold text-cm-text-secondary sm:table-cell">
                Detalles
              </th>
              <th className="py-1.5 text-right text-xs font-semibold text-cm-text-secondary">
                P.Unit
              </th>
              <th className="py-1.5 text-right text-xs font-semibold text-cm-text-secondary">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).length > 0 ? (
              (order.items || []).map((item, idx) => (
                <ItemRow key={idx} item={item} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-sm text-cm-text-secondary"
                >
                  Sin items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial summary + Payment info + Actions */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-0.5 text-sm">
          {financials && (
            <>
              <p className="text-cm-text-secondary">
                Subtotal:{' '}
                <span className="text-cm-text">
                  {formatCurrency(financials.subtotal || 0)}
                </span>
              </p>
              {financials.deliveryFee > 0 && (
                <p className="text-cm-text-secondary">
                  Delivery:{' '}
                  <span className="text-cm-text">
                    {formatCurrency(financials.deliveryFee)}
                  </span>
                </p>
              )}
              {financials.packaging_total > 0 && (
                <p className="text-cm-text-secondary">
                  Empaques:{' '}
                  <span className="text-cm-text">
                    {formatCurrency(financials.packaging_total)}
                  </span>
                </p>
              )}
              <p className="font-bold text-cm-text">
                Total: {formatCurrency(financials.total || 0)}
              </p>
            </>
          )}

          {/* Payment info */}
          {order.payment_method && (
            <p className="flex items-center gap-1 text-xs text-cm-text-secondary">
              Pago: <strong>{order.payment_method}</strong>
              {order.payment_status === 'pagado' && (
                <span className="font-bold text-green-500">&check; Verificado</span>
              )}
              {order.payment_status === 'por_verificar' && (
                <span className="animate-pulse font-bold text-cm-accent">
                  &#8987; Por verificar
                </span>
              )}
              {order.payment_status === 'reembolsado' && (
                <span className="font-bold text-orange-400">
                  &#8617; Reembolsado
                </span>
              )}
              {order.payment_status === 'pendiente' && (
                <span className="font-bold text-yellow-500">
                  &#9888; Pendiente
                </span>
              )}
              {paymentCfg && !order.payment_method && (
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${paymentCfg.bg}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${paymentCfg.dot}`} />
                  {paymentCfg.label}
                </span>
              )}
            </p>
          )}

          {/* Yape/Plin verification details */}
          {order.payment_details && (
            <div className="mt-2 space-y-1 rounded-xl border border-cm-accent/20 bg-cm-accent/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cm-accent">
                Comprobante Yape / Plin
              </p>
              <p className="text-xs text-cm-text">
                Billetera:{' '}
                <strong className="uppercase">
                  {order.payment_details.wallet_type || 'N/A'}
                </strong>
              </p>
              {order.payment_details.operation_number && (
                <p className="text-xs text-cm-text">
                  N&deg; Operaci&oacute;n:{' '}
                  <strong className="font-mono tracking-wider">
                    {order.payment_details.operation_number}
                  </strong>
                </p>
              )}
              <p className="text-xs text-cm-text-secondary">
                Comprobante foto:{' '}
                {order.payment_details.voucher_uploaded
                  ? '\u2705 Subido'
                  : '\u274C No subido'}
              </p>
            </div>
          )}

          {/* Internal note */}
          {(order.notes?.length > 0 || order.internalNote) && (
            <p className="mt-1 text-xs text-cm-warning">
              <StickyNote className="mr-1 inline h-3 w-3" />
              {order.notes?.[order.notes.length - 1]?.text || order.internalNote}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <QuickStatusActions
            order={order}
            branchId={branchId}
            can={can}
            onStatusChange={onStatusChange}
          />

          {can('orders:edit') && canEdit && (
            <button
              onClick={() => onEdit && onEdit(order)}
              className="flex items-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-1.5 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20"
            >
              <Edit3 className="h-3.5 w-3.5" /> Editar
            </button>
          )}

          {can('orders:edit') && (
            <button
              onClick={() => onNotes && onNotes(order)}
              className="flex items-center gap-1.5 rounded-lg bg-cm-info/10 px-3 py-1.5 text-xs font-semibold text-cm-info transition-colors hover:bg-cm-info/20"
            >
              <StickyNote className="h-3.5 w-3.5" /> Nota
            </button>
          )}

          <button
            onClick={() => onPrint && onPrint(order)}
            className="flex items-center gap-1.5 rounded-lg border border-cm-border bg-cm-surface px-3 py-1.5 text-xs font-semibold text-cm-text transition-colors hover:bg-cm-accent/5"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>

          {order.payment_status === 'pendiente' && can('orders:mark_paid') && (
            <button
              onClick={() => onCobrar && onCobrar(order)}
              className="flex items-center gap-1.5 rounded-lg bg-cm-success/10 px-3 py-1.5 text-xs font-semibold text-cm-success transition-colors hover:bg-cm-success/20"
            >
              <DollarSign className="h-3.5 w-3.5" /> Cobrar
            </button>
          )}

          {order.payment_status === 'por_verificar' && can('orders:mark_paid') && (
            <button
              onClick={() => onVerify && onVerify(order)}
              className="flex items-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-1.5 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Verificar
            </button>
          )}

          {canRefund && can('orders:refund') && (
            <button
              onClick={() => onRefund && onRefund(order)}
              className="flex items-center gap-1.5 rounded-lg bg-cm-warning/10 px-3 py-1.5 text-xs font-semibold text-cm-warning transition-colors hover:bg-cm-warning/20"
            >
              <Undo2 className="h-3.5 w-3.5" /> Reembolsar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
