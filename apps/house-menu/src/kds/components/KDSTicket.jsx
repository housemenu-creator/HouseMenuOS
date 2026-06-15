import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, Square, CheckSquare, User, Hash, ArrowRight, Printer, Circle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import PriorityBadge from './PriorityBadge';
import TimerBadge from './TimerBadge';
import AllergenAlert from './AllergenAlert';
import PacingBadge from './PacingBadge';
import { PRIORITY, STATION_THRESHOLDS } from '../kdsTypes';
import useTimerStore from '../store/timerStore';
import { printTicket } from '../../lib/printTicket';
import { ordersService } from '../../lib/ordersService';
import { useBranch } from '../../context/BranchContext';

const STATUS_ACCENT = {
  recibido: {
    border: 'border-l-cm-accent',
    bg: 'bg-cm-accent/5',
    btnBg: 'bg-cm-accent hover:bg-cm-accent-hover',
    statusBg: 'bg-cm-accent/10',
    statusText: 'text-cm-accent',
    statusBorder: 'border-cm-accent/20',
  },
  preparando: {
    border: 'border-l-cm-warning',
    bg: 'bg-cm-warning/5',
    btnBg: 'bg-cm-warning hover:bg-cm-warning/80',
    statusBg: 'bg-cm-warning/10',
    statusText: 'text-cm-warning',
    statusBorder: 'border-cm-warning/20',
  },
  listo: {
    border: 'border-l-cm-success',
    bg: 'bg-cm-success/5',
    btnBg: 'bg-cm-success hover:bg-cm-success/80',
    statusBg: 'bg-cm-success/10',
    statusText: 'text-cm-success',
    statusBorder: 'border-cm-success/20',
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

const QUANTITY_COLORS = [
  'bg-cm-accent/20 text-cm-accent',
  'bg-cm-warning/20 text-cm-warning',
  'bg-cm-success/20 text-cm-success',
];

const fontSizes = {
  normal: {
    title: 'text-sm font-bold',
    items: 'text-xs',
    details: 'text-[0.6rem]',
    meta: 'text-[0.65rem]',
    button: 'text-xs py-3',
  },
  large: {
    title: 'text-base font-bold',
    items: 'text-sm',
    details: 'text-[0.7rem]',
    meta: 'text-[0.75rem]',
    button: 'text-sm py-3.5',
  },
  huge: {
    title: 'text-lg font-black',
    items: 'text-base',
    details: 'text-[0.8rem]',
    meta: 'text-[0.85rem]',
    button: 'text-base py-4',
  },
};

const densities = {
  cozy: {
    cardPadding: 'px-4 pt-3.5 pb-2.5',
    itemsPadding: 'px-4 py-2.5',
    itemGap: 'space-y-1.5',
  },
  compact: {
    cardPadding: 'px-3 pt-2 pb-1.5',
    itemsPadding: 'px-3 py-1.5',
    itemGap: 'space-y-0.5',
  },
};

function getStartTimestamp(order) {
  if (!order) return null;
  return order.statusTimestamps?.[order.status] || order.createdAt;
}

function TicketAlertBar({ order, alertLevel }) {
  const startTs = getStartTimestamp(order);
  const [elapsed, setElapsed] = useState(() => startTs ? Date.now() - new Date(startTs).getTime() : 0);

  useEffect(() => {
    if (alertLevel === 'safe' || !startTs || order?.status === 'listo' || order?.status === 'entregado') {
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(startTs).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [startTs, alertLevel, order?.status]);

  if (alertLevel === 'safe') return null;

  const station = order.station || 'all';
  const thresholds = STATION_THRESHOLDS[station] || STATION_THRESHOLDS.all;
  const maxMs = thresholds.critical;
  const widthPercent = Math.min(100, (elapsed / maxMs) * 100);

  return (
    <div className="absolute top-0 left-0 right-0 h-[3px]">
      <div className={cn(
        'h-full transition-all duration-1000 ease-linear',
        alertLevel === 'warning' && 'bg-cm-warning',
        alertLevel === 'critical' && 'bg-cm-error',
      )} style={{ width: `${widthPercent}%` }} />
    </div>
  );
}

function KDSTicket({
  order,
  onDragStart,
  onUpdateStatus,
  onItemToggle,
  isHistory = false,
  selected = false,
  onToggleSelect,
  isBulkMode = false,
  branchId: propBranchId,
  fontSize = 'normal',
  density = 'cozy',
  activeStation = 'all',
}) {
  const { activeBranchId } = useBranch();
  const branchId = propBranchId || activeBranchId;
  
  // Nos suscribimos SOLAMENTE al nivel de alerta (safe/warning/critical)
  // Esto previene que se re-renderice la tarjeta completa cada segundo
  const alertLevel = useTimerStore((s) => s.alertLevels?.[order.id] || 'safe');
  
  const [doneItems, setDoneItems] = useState(new Set());
  const baseAccent = STATUS_ACCENT[order.status] || STATUS_ACCENT.recibido;
  const alertOver = ALERT_OVERRIDE[alertLevel];
  const accent = { ...baseAccent, ...alertOver };
  const totalItems = order.items?.length || 0;
  const doneCount = doneItems.size;

  const fStyles = fontSizes[fontSize] || fontSizes.normal;
  const dStyles = densities[density] || densities.cozy;

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
        'border-l-[4px]',
        accent.border,
        alertOver.shadow,
        alertLevel === 'critical' && 'animate-[pulse_2s_ease-in-out_infinite]',
        selected && 'ring-2 ring-cm-accent ring-offset-2 ring-offset-cm-bg',
        !isHistory && !isBulkMode && 'cursor-grab active:cursor-grabbing hover:shadow-cm-md hover:-translate-y-px',
        isHistory && 'opacity-60 grayscale-[20%] cursor-default',
        isBulkMode && 'cursor-pointer',
      )}
    >
      {!isHistory && (
        <TicketAlertBar order={order} alertLevel={alertLevel} />
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

        <div className={cn(dStyles.cardPadding, isBulkMode && 'pl-10')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1 text-[0.6rem] font-black text-cm-muted/70 bg-cm-bg px-2 py-0.5 rounded-md border border-cm-border/60 font-mono tracking-wider">
                  #{(order.id || '').slice(-6).toUpperCase()}
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

              <h3 className={cn(fStyles.title, 'text-cm-text leading-tight flex items-center gap-1.5')}>
                <User className="w-3 h-3 text-cm-muted/30 flex-shrink-0" />
                {order.customerName}
              </h3>

              {order.location && (
                <p className={cn(fStyles.meta, 'text-cm-muted mt-0.5 truncate flex items-center gap-1')}>
                  <span className="text-cm-muted/40">●</span> {order.location}
                </p>
              )}
              {order.observaciones && (
                <p className="text-[0.6rem] text-cm-warning font-semibold mt-2 bg-cm-warning/10 border border-cm-warning/20 rounded-lg px-2.5 py-1.5 leading-tight">
                  📝 {order.observaciones}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={cn(
                'text-[0.55rem] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border',
                accent.statusBg, accent.statusText, accent.statusBorder
              )}>
                {order.status}
              </span>
              <TimerBadge order={isHistory ? null : order} elapsedMs={isHistory ? 0 : undefined} />
            </div>
          </div>
        </div>

      <div className={cn(dStyles.itemsPadding, 'border-t', accent.bg, 'border-cm-border')}>
        {order.items?.length > 0 && (
          <div className={dStyles.itemGap}>
            {order.items.map((item, i) => {
              const isDone = doneItems.has(i);
              
              // Si la estación actual es específica, atenuamos los ítems de otras estaciones
              const isOtherStation = activeStation !== 'all' && item.station !== activeStation;

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 transition-all',
                    isOtherStation ? 'opacity-20 line-through scale-[0.98]' : ''
                  )}
                >
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
                      fStyles.items,
                      'font-semibold',
                      isDone ? 'text-cm-success/70 line-through' : 'text-cm-text'
                    )}>{item.name}</span>
                    {item.details?.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {item.details.map((d, idx) => (
                          <p key={idx} className={cn(fStyles.details, 'text-cm-muted leading-relaxed pl-1.5 border-l-2 border-cm-border/20')}>
                            {d}
                          </p>
                        ))}
                      </div>
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
            'w-full font-black tracking-widest transition-all flex items-center justify-center gap-2',
            'border-t border-black/10',
            accent.btnBg,
            'text-white',
            fStyles.button
          )}
        >
          {order.status === 'recibido' ? (
            <><Clock className="w-3.5 h-3.5" /> INICIAR PREPARACIÓN</>
          ) : (
            <><Check className="w-4 h-4" /> LISTO{totalItems > 0 && ` (${doneCount}/${totalItems})`} <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

export default memo(KDSTicket);
