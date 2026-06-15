import React, { memo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, CookingPot } from 'lucide-react';

const STATUS_META = {
  recibido: {
    icon: AlertCircle,
    border: 'border-cm-accent/20',
    bg: 'bg-cm-accent/10',
    text: 'text-cm-accent',
    badgeBg: 'bg-cm-accent/10',
    badgeText: 'text-cm-accent',
    badgeBorder: 'border-cm-accent/20',
  },
  preparando: {
    icon: CookingPot,
    border: 'border-cm-warning/20',
    bg: 'bg-cm-warning/10',
    text: 'text-cm-warning',
    badgeBg: 'bg-cm-warning/10',
    badgeText: 'text-cm-warning',
    badgeBorder: 'border-cm-warning/20',
  },
  listo: {
    icon: CheckCircle2,
    border: 'border-cm-success/20',
    bg: 'bg-cm-success/10',
    text: 'text-cm-success',
    badgeBg: 'bg-cm-success/10',
    badgeText: 'text-cm-success',
    badgeBorder: 'border-cm-success/20',
  },
};

function KDSColumn({ title, status, count, onDrop, children, className, onReorder, orderedIds }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const meta = STATUS_META[status] || STATUS_META.recibido;
  const Icon = meta.icon;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId && onDrop) onDrop(orderId, status);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl border overflow-hidden transition-all duration-200 bg-cm-surface',
        isDragOver ? 'border-cm-accent shadow-[0_0_20px_-4px_rgba(var(--cm-accent-rgb,99,102,241),0.25)]' : 'border-cm-border shadow-cm-sm',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Accent strip at top */}
      <div className={cn('h-[3px] w-full shrink-0', {
        'bg-cm-accent': status === 'recibido',
        'bg-cm-warning': status === 'preparando',
        'bg-cm-success': status === 'listo',
      })} />

      <div className={cn('px-4 pt-3 pb-3 border-b', meta.border)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
              meta.bg
            )}>
              <Icon className={cn(
                'w-4 h-4',
                meta.text,
                status === 'recibido' && count > 0 && 'animate-pulse',
              )} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-cm-text tracking-tight">{title}</h3>
              <p className="text-[0.6rem] text-cm-muted uppercase tracking-[0.12em] font-semibold">{count} {count === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <span className={cn(
            'min-w-[2rem] h-7 px-2 rounded-lg text-sm font-black border flex items-center justify-center',
            meta.badgeBg, meta.badgeText, meta.badgeBorder
          )}>
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-cm-border scrollbar-track-transparent">
        {count === 0 && !isDragOver && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center gap-3 py-10"
          >
            <div className={cn('w-12 h-12 rounded-2xl border-2 border-dashed flex items-center justify-center', meta.border)}>
              <Icon className={cn('w-5 h-5', meta.text, 'opacity-20')} />
            </div>
            <p className="text-cm-muted/35 text-[0.65rem] font-bold uppercase tracking-[0.2em]">Sin pedidos</p>
          </motion.div>
        )}

        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={cn(
              'h-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed min-h-[120px]',
              meta.border, meta.bg
            )}
          >
            <Icon className={cn('w-6 h-6', meta.text, 'opacity-60')} />
            <p className={cn('text-sm font-bold uppercase tracking-widest', meta.text, 'opacity-60')}>Soltar aquí</p>
          </motion.div>
        )}

        {count > 0 && !isDragOver && onReorder && orderedIds ? (
          <Reorder.Group axis="y" values={orderedIds} onReorder={(ids) => onReorder(ids)} className="space-y-2">
            {children}
          </Reorder.Group>
        ) : count > 0 && !isDragOver ? (
          <AnimatePresence>
            {children}
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}

export default memo(KDSColumn);
