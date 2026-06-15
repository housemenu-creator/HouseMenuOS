import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Hash, Printer, Square, CheckSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Order } from '../workerTypes';

interface OrderCardProps {
  order: Order;
  isHistory?: boolean;
  selected?: boolean;
  isBulkMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onPrint?: (order: Order) => void;
  statusAccent?: {
    border: string;
    bg: string;
    statusBg: string;
    statusText: string;
    statusBorder: string;
  };
  renderHeader?: (order: Order) => React.ReactNode;
  renderActions?: (order: Order) => React.ReactNode;
  renderItems?: (order: Order) => React.ReactNode;
  renderFooter?: (order: Order) => React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_STATUS_ACCENT = {
  border: 'border-l-cm-accent',
  bg: 'bg-cm-accent/5',
  statusBg: 'bg-cm-accent/10',
  statusText: 'text-cm-accent',
  statusBorder: 'border-cm-accent/20',
};

const QUANTITY_COLORS = [
  'bg-cm-accent/20 text-cm-accent',
  'bg-cm-warning/20 text-cm-warning',
  'bg-cm-success/20 text-cm-success',
];

function OrderCard({
  order,
  isHistory = false,
  selected = false,
  isBulkMode = false,
  onToggleSelect,
  onPrint,
  statusAccent,
  renderHeader,
  renderActions,
  renderItems,
  renderFooter,
  className,
  children,
}: OrderCardProps) {
  const accent = statusAccent || DEFAULT_STATUS_ACCENT;
  const totalItems = order.items?.length || 0;

  const defaultRenderHeader = (o: Order) => (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold text-cm-muted bg-cm-muted/5 px-2 py-0.5 rounded-md border border-cm-border">
            <Hash className="w-2.5 h-2.5" />
            {(o.id || '').slice(-6).toUpperCase()}
          </span>
          {onPrint && !isBulkMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrint(o); }}
              className="text-cm-muted/30 hover:text-cm-muted/60 transition-colors p-0.5"
              aria-label="Imprimir comanda"
            >
              <Printer className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        <h3 className="font-semibold text-base text-cm-text leading-tight flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-cm-muted/40 flex-shrink-0" />
          {o.customerName}
        </h3>

        {o.location && (
          <p className="text-[0.65rem] text-cm-muted mt-0.5 truncate">{o.location}</p>
        )}
        {o.observaciones && (
          <p className="text-[0.6rem] text-cm-warning font-semibold mt-1.5 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight">
            {o.observaciones}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={cn(
          'text-[0.55rem] font-semibold uppercase tracking-[0.15em] px-2 py-1 rounded-full border',
          accent.statusBg, accent.statusText, accent.statusBorder
        )}>
          {o.status}
        </span>
      </div>
    </div>
  );

  const defaultRenderItems = (o: Order) => (
    <div className="space-y-1.5">
      {o.items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className={cn(
            'mt-0.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-md text-[0.55rem] font-semibold border',
            QUANTITY_COLORS[i % QUANTITY_COLORS.length],
            'border-cm-border'
          )}>
            {item.quantity || 1}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-[0.8rem] text-cm-text">
              {item.name}
            </span>
            {item.details && item.details.length > 0 && (
              <p className="text-[0.6rem] text-cm-muted mt-0.5 leading-relaxed truncate">
                {item.details.join(' • ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      layout
      layoutId={order.id}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
      onClick={() => isBulkMode && onToggleSelect?.(order.id)}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border bg-cm-surface',
        'border-cm-border transition-all duration-200 border-l-[3px]',
        accent.border,
        selected && 'ring-2 ring-cm-accent ring-offset-2 ring-offset-cm-bg',
        isHistory && 'opacity-60 grayscale-[20%] cursor-default',
        isBulkMode && 'cursor-pointer',
        className
      )}
    >
      {isBulkMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(order.id); }}
          className="absolute top-3 left-3 z-20 p-0.5 rounded-md transition-colors hover:bg-cm-accent/10"
        >
          {selected ? (
            <CheckSquare className="w-4.5 h-4.5 text-cm-accent" />
          ) : (
            <Square className="w-4.5 h-4.5 text-cm-muted/30" />
          )}
        </button>
      )}

      <div className={cn('px-4 pt-3.5 pb-2.5', isBulkMode && 'pl-10')}>
        {renderHeader ? renderHeader(order) : defaultRenderHeader(order)}
      </div>

      <div className={cn('px-4 py-2.5 border-t', accent.bg, 'border-cm-border')}>
        {totalItems > 0 && (renderItems ? renderItems(order) : defaultRenderItems(order))}

        {renderFooter && (
          <div className="mt-3 pt-3 border-t border-cm-border">
            {renderFooter(order)}
          </div>
        )}
      </div>

      {children}
      {renderActions && renderActions(order)}
    </motion.div>
  );
}

export default memo(OrderCard);
