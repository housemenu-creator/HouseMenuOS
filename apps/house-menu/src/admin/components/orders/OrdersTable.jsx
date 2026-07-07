import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Store,
  UtensilsCrossed,
  StickyNote,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatCurrency, formatOrderId } from '../../../lib/format';

const PAYMENT_STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', dot: 'bg-yellow-500', bg: 'bg-yellow-500/10 text-yellow-600' },
  por_verificar: { label: 'Por verificar', dot: 'bg-cm-accent', bg: 'bg-cm-accent/10 text-cm-accent' },
  pagado: { label: 'Pagado', dot: 'bg-green-500', bg: 'bg-green-500/10 text-green-600' },
  reembolsado: { label: 'Reembolsado', dot: 'bg-orange-400', bg: 'bg-orange-400/10 text-orange-600' },
};

const ORDER_TYPE_CONFIG = {
  delivery: { icon: Truck, label: 'Delivery' },
  pickup: { icon: Store, label: 'Recojo' },
  local: { icon: UtensilsCrossed, label: 'Local' },
};

const COLUMNS = [
  { field: 'id', label: 'ID', defaultDir: 'desc', align: 'left' },
  { field: 'customerName', label: 'Cliente', defaultDir: 'asc', align: 'left' },
  { field: 'orderType', label: 'Tipo', defaultDir: 'asc', align: 'left' },
  { field: 'status', label: 'Estado', defaultDir: 'asc', align: 'left' },
  { field: 'total', label: 'Total', defaultDir: 'desc', align: 'right' },
  { field: 'createdAt', label: 'Fecha', defaultDir: 'desc', align: 'right' },
];

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-2 py-3">
        <div className="h-3.5 w-3.5 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-16 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-24 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-14 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="h-4 w-20 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="ml-auto h-4 w-16 rounded bg-cm-border" />
      </td>
      <td className="px-3 py-3">
        <div className="ml-auto h-4 w-20 rounded bg-cm-border" />
      </td>
    </tr>
  ));
}

function SortHeader({ column, sortField, sortDir, onSort }) {
  const isActive = sortField === column.field;
  const Icon = isActive ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : null;
  const alignClass = column.align === 'right' ? 'text-right' : 'text-left';

  return (
    <th
      className={`cursor-pointer select-none px-3 py-3 ${alignClass} text-xs font-semibold text-cm-text-secondary uppercase tracking-wider hover:text-cm-text transition-colors`}
      onClick={() => onSort(column.field, sortField === column.field ? undefined : column.defaultDir)}
    >
      <span className="inline-flex items-center gap-1">
        {column.label}
        {isActive && Icon && <Icon className="w-3 h-3" />}
      </span>
    </th>
  );
}

export default function OrdersTable({
  orders = [],
  expandedId = null,
  onToggleExpand = () => {},
  sortField = 'createdAt',
  sortDir = 'desc',
  onSort = () => {},
  highlightedIndex = -1,
  renderDetailPanel = null,
  can = () => false,
  error = null,
  onRetry = null,
  loading = false,
}) {
  const isNewOrder = (createdAt) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 60000;
  };

  const handleSort = (field, defaultDir) => {
    if (sortField === field) {
      onSort(field, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, defaultDir);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-cm-error" />
          <p className="text-sm font-semibold text-cm-text-secondary">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-lg bg-cm-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cm-accent-hover"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="w-8 px-2 py-3" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    className={`px-3 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} text-xs font-semibold text-cm-text-secondary uppercase tracking-wider`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cm-border">
              <SkeletonRows />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!orders.length) {
    return (
      <div className="overflow-hidden rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cm-border bg-cm-bg-alt">
                <th className="w-8 px-2 py-3" />
                {COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    className={`px-3 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} text-xs font-semibold text-cm-text-secondary uppercase tracking-wider`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="py-12 text-center text-sm text-cm-text-secondary">
          No se encontraron pedidos
        </div>
      </div>
    );
  }

  // Populated state
  return (
    <div className="overflow-hidden rounded-xl border border-cm-border bg-cm-surface shadow-cm-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cm-border bg-cm-bg-alt">
              <th className="w-8 px-2 py-3" />
              {COLUMNS.map((col) => (
                <SortHeader
                  key={col.field}
                  column={col}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cm-border">
            {orders.map((order) => {
              const isExpanded = expandedId === order.id;
              const typeConfig = ORDER_TYPE_CONFIG[order.orderType];
              const TypeIcon = typeConfig?.icon;
              const isNew = isNewOrder(order.createdAt);
              const needsVerification = order.payment_status === 'por_verificar';
              const hasNotes = (order.notes?.length > 0) || !!order.internalNote;
              const paymentCfg = order.payment_status
                ? PAYMENT_STATUS_CONFIG[order.payment_status]
                : null;

              return (
                <Fragment key={order.id}>
                  <tr
                    className={`transition-colors cursor-pointer hover:bg-cm-accent/5 ${
                      needsVerification ? 'animate-pulse-overdue' : ''
                    } ${isNew ? 'border-l-2 border-l-cm-info' : ''}`}
                    onClick={() => onToggleExpand(order.id)}
                  >
                    <td className="px-2 py-3 text-cm-text-tertiary">
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cm-text-secondary">
                          {formatOrderId(order.id)}
                        </span>
                        {isNew && (
                          <span className="inline-flex items-center rounded bg-cm-info/15 px-1.5 py-0.5 text-[9px] font-black uppercase leading-tight tracking-wider text-cm-info">
                            NUEVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-cm-text">
                      <span className="inline-flex items-center gap-1">
                        {order.customerName || 'Anonimo'}
                        {hasNotes && (
                          <StickyNote className="h-3 w-3 text-cm-warning" />
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {TypeIcon ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-cm-text-secondary"
                          title={typeConfig.label}
                        >
                          <TypeIcon className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs text-cm-text-secondary">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={order.status} />
                        {paymentCfg && (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight ${paymentCfg.bg}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${paymentCfg.dot}`}
                            />
                            {paymentCfg.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-cm-text">
                      {formatCurrency(
                        order.financials?.total || order.total || 0,
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-cm-text-secondary">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString('es-PE')
                        : '\u2014'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${order.id}-detail`}>
                      <td colSpan={7} className="px-0 py-0">
                        <AnimatePresence>
                          <motion.div
                            key={`${order.id}-expand`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-cm-border bg-cm-bg-alt/50 px-6 py-4">
                              {renderDetailPanel
                                ? renderDetailPanel(order)
                                : null}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
