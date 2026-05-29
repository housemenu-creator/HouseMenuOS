import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, Square, CheckSquare, User, Hash, ArrowRight, Printer, Circle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import PriorityBadge from '../kds/components/PriorityBadge';
import TimerBadge from '../kds/components/TimerBadge';
import AllergenAlert from '../kds/components/AllergenAlert';
import PacingBadge from '../kds/components/PacingBadge';
import { PRIORITY } from '../kds/kdsTypes';
import useTimerStore from '../kds/store/timerStore';
import { printTicket } from '../lib/printTicket';
import { ordersService } from '../lib/ordersService';
import { useBranch } from '../context/BranchContext';

const STATUS_ACCENT = {
  recibido: {
    border: 'border-l-cm-accent',
    bg: 'bg-cm-accent/5',
    btnBg: 'bg-cm-accent hover:bg-cm-accent-hover',
    statusBg: 'bg-cm-accent/10',
    statusText: 'text-cm-accent',
    statusBorder: 'border-cm-accent/20',
    itemCheck: '#cm-accent',
  },
  preparando: {
    border: 'border-l-cm-warning',
    bg: 'bg-cm-warning/5',
    btnBg: 'bg-cm-warning hover:bg-cm-warning/80',
    statusBg: 'bg-cm-warning/10',
    statusText: 'text-cm-warning',
    statusBorder: 'border-cm-warning/20',
    itemCheck: '#cm-warning',
  },
  listo: {
    border: 'border-l-cm-success',
    bg: 'bg-cm-success/5',
    btnBg: 'bg-cm-success hover:bg-cm-success/80',
    statusBg: 'bg-cm-success/10',
    statusText: 'text-cm-success',
    statusBorder: 'border-cm-success/20',
    itemCheck: '#cm-success',
  },
};

const ALERT_OVERRIDE = {
  safe: {},
  warning: {
    border: 'border-l-cm-warning',
    bg: 'bg-cm-warning/5',
    btnBg: 'bg-cm-warning hover:bg-cm-warning/80',
    shadow: 'shadow-[0_0_12px_-4px_rgba(234,179,8,0.3)]',
  },
  critical: {
    border: 'border-l-cm-error',
    bg: 'bg-cm-error/5',
    btnBg: 'bg-cm-error hover:bg-cm-error/80',
    shadow: 'shadow-[0_0_16px_-4px_rgba(239,68,68,0.4)]',
  },
};

const THRESHOLD_WARNING = 8 * 60 * 1000;
const THRESHOLD_CRITICAL = 12 * 60 * 1000;

const QUANTITY_COLORS = [
  'bg-cm-accent/20 text-cm-accent',
  'bg-cm-warning/20 text-cm-warning',
  'bg-cm-success/20 text-cm-success',
];

function KanbanTicket({
  order,
  onDragStart,
  onUpdateStatus,
  onItemToggle,
  isHistory = false,
  selected = false,
  onToggleSelect,
  elapsedMs,
  isBulkMode = false,
  branchId: propBranchId,
}) {
  const { activeBranchId } = useBranch();
  const branchId = propBranchId || activeBranchId;
  const timerElapsed = elapsedMs !== undefined ? elapsedMs : useTimerStore((s) => s.elapsed[order.id] || 0);
  const alertLevel = timerElapsed >= THRESHOLD_CRITICAL ? 'critical'
    : timerElapsed >= THRESHOLD_WARNING ? 'warning'
    : 'safe';
  const [doneItems, setDoneItems] = useState(new Set());
  const baseAccent = STATUS_ACCENT[order.status] || STATUS_ACCENT.recibido;
  const alertOver = ALERT_OVERRIDE[alertLevel];
  const accent = { ...baseAccent, ...alertOver };
  const totalItems = order.items?.length || 0;
  const doneCount = doneItems.size;

  const handleDragStart = (e) => {
    if (isBulkMode) return;
    e.dataTransfer.setData('text/plain', order.id);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(order);
  };

  const toggleItem = (index) => {
    setDoneItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const togglePriority = async () => {
    const nextPriority = order.priority === PRIORITY.RUSH ? PRIORITY.NORMAL : PRIORITY.RUSH;
    await ordersService.updateOrderPriority(branchId, order.id, nextPriority);
  };

  return (
    <motion.div
      layout
      layoutId={order.id}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
      draggable={!isHistory && !isBulkMode}
      onDragStart={handleDragStart}
      onClick={() => isBulkMode && onToggleSelect?.(order.id)}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border bg-cm-surface',
        'border-cm-border transition-all duration-200',
        'border-l-[3px]',
        accent.border,
        alertOver.shadow,
        alertLevel === 'critical' && 'animate-[pulse_2s_ease-in-out_infinite]',
        selected && 'ring-2 ring-cm-accent ring-offset-2 ring-offset-cm-bg',
        !isHistory && !isBulkMode && 'cursor-grab active:cursor-grabbing hover:shadow-cm-md hover:scale-[1.01]',
        isHistory && 'opacity-60 grayscale-[20%] cursor-default',
        isBulkMode && 'cursor-pointer',
      )}
    >
      {!isHistory && alertLevel !== 'safe' && (
        <div className="absolute top-0 left-0 right-0 h-1">
          <div className={cn(
            'h-full transition-all duration-1000 ease-linear',
            alertLevel === 'warning' && 'bg-cm-warning',
            alertLevel === 'critical' && 'bg-cm-error',
          )} style={{ width: `${Math.min(100, (timerElapsed / THRESHOLD_CRITICAL) * 100)}%` }} />
        </div>
      )}

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold text-cm-muted bg-cm-muted/5 px-2 py-0.5 rounded-md border border-cm-border">
                <Hash className="w-2.5 h-2.5" />
                {(order.id || '').slice(-6).toUpperCase()}
              </span>
              <PriorityBadge priority={order.priority || PRIORITY.NORMAL} />
              {!isHistory && !isBulkMode && (
                <button onClick={(e) => { e.stopPropagation(); togglePriority(); }}
                  className={`p-0.5 rounded transition-colors ${order.priority === PRIORITY.RUSH ? 'text-cm-error hover:text-cm-error/60' : 'text-cm-muted/30 hover:text-cm-muted/60'}`}
                  title={order.priority === PRIORITY.RUSH ? 'Quitar prioridad' : 'Marcar como prioritario'}>
                  <Zap className="w-2.5 h-2.5" />
                </button>
              )}
              {!isHistory && <PacingBadge status={order.pacingStatus} />}
              {!isBulkMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); printTicket(order); }}
                  className="text-cm-muted/30 hover:text-cm-muted/60 transition-colors p-0.5"
                  aria-label="Imprimir comanda"
                  title="Imprimir comanda"
                >
                  <Printer className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <h3 className="font-semibold text-base text-cm-text leading-tight flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-cm-muted/40 flex-shrink-0" />
              {order.customerName}
            </h3>

            {order.location && (
              <p className="text-[0.65rem] text-cm-muted mt-0.5 truncate">{order.location}</p>
            )}
            {order.observaciones && (
              <p className="text-[0.6rem] text-cm-warning font-semibold mt-1.5 bg-cm-warning/10 border border-cm-warning/20 rounded-md px-2 py-1 leading-tight">
                📝 {order.observaciones}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={cn(
              'text-[0.55rem] font-semibold uppercase tracking-[0.15em] px-2 py-1 rounded-full border',
              accent.statusBg, accent.statusText, accent.statusBorder
            )}>
              {order.status}
            </span>
            <TimerBadge elapsedMs={timerElapsed} />
          </div>
        </div>
      </div>

      <div className={cn('px-4 py-2.5 border-t', accent.bg, 'border-cm-border')}>
        {order.items?.length > 0 && (
          <div className="space-y-1.5">
            {order.items.map((item, i) => {
              const isDone = doneItems.has(i);
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {!isHistory && order.status !== 'listo' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleItem(i); }}
                      className={`mt-0.5 shrink-0 transition-colors ${isDone ? 'text-cm-success' : 'text-cm-muted/30 hover:text-cm-muted/60'}`}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                  ) : (
                    <span className={cn(
                      'mt-0.5 min-w-[1.25rem] h-5 flex items-center justify-center rounded-md text-[0.55rem] font-semibold border',
                      QUANTITY_COLORS[i % QUANTITY_COLORS.length],
                      'border-cm-border'
                    )}>
                      {item.quantity || 1}
                    </span>
                  )}
                  <div className={cn('min-w-0 flex-1', isDone && 'opacity-40')}>
                    <span className={cn(
                      'font-semibold text-[0.8rem]',
                      isDone ? 'text-cm-success/70 line-through' : 'text-cm-text'
                    )}>{item.name}</span>
                    {item.details?.length > 0 && (
                      <p className="text-[0.6rem] text-cm-muted mt-0.5 leading-relaxed truncate">
                        {item.details.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AllergenAlert allergens={order.allergens} className="mt-2.5" />

        {isHistory && (
          <div className="mt-3 pt-3 border-t border-cm-border flex justify-between items-center">
            <span className="text-[0.6rem] text-cm-muted uppercase font-semibold tracking-wider">Total</span>
            <span className="font-bold text-base text-cm-accent">S/ {order.financials?.total?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {!isHistory && onUpdateStatus && order.status !== 'listo' && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpdateStatus(order.id, order.status)}
          aria-label={order.status === 'recibido' ? 'Iniciar preparación' : 'Marcar como listo'}
          className={cn(
            'w-full py-3 font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2',
            'border-t border-cm-border',
            accent.btnBg,
            'text-white'
          )}
        >
          {order.status === 'recibido' ? (
            <><Clock className="w-3.5 h-3.5" /> INICIAR PREPARACIÓN</>
          ) : (
            <><Check className="w-3.5 h-3.5" /> MARCAR COMO LISTO{totalItems > 0 && ` (${doneCount}/${totalItems})`} <ArrowRight className="w-3 h-3" /></>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

export default memo(KanbanTicket);
