import React, { memo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../lib/utils';
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

function KanbanColumn({ title, status, count, onDrop, children, className, onReorder, orderedIds }) {
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
        'flex flex-col h-full rounded-xl border transition-all duration-200 bg-cm-surface',
        isDragOver ? 'border-cm-accent shadow-cm-md' : 'border-cm-border shadow-cm-sm',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={cn('px-4 pt-3 pb-2.5 border-b', meta.border)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', meta.bg)}>
              <Icon className={cn(
                'w-3.5 h-3.5',
                meta.text,
                status === 'recibido' && count > 0 && 'animate-pulse',
              )} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-cm-text">{title}</h3>
              <p className="text-[0.6rem] text-cm-muted uppercase tracking-wider font-medium">{status}</p>
            </div>
          </div>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold border',
            meta.badgeBg, meta.badgeText, meta.badgeBorder
          )}>
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-cm-border scrollbar-track-transparent">
        {count === 0 && !isDragOver && (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-10">
            <div className="w-10 h-10 rounded-xl border border-dashed border-cm-border flex items-center justify-center">
              <Icon className="w-4 h-4 text-cm-muted/30" />
            </div>
            <p className="text-cm-muted/40 text-xs font-semibold uppercase tracking-widest">Sin pedidos</p>
          </div>
        )}

        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex items-center justify-center rounded-xl border-2 border-dashed border-cm-accent/30 bg-cm-accent/5 min-h-[100px]"
          >
            <p className="text-cm-accent/50 text-sm font-semibold uppercase tracking-widest">Soltar aquí</p>
          </motion.div>
        )}

        {!isDragOver && onReorder && orderedIds ? (
          <Reorder.Group axis="y" values={orderedIds} onReorder={(ids) => onReorder(ids)} className="space-y-2">
            {children}
          </Reorder.Group>
        ) : (
          <AnimatePresence>
            {!isDragOver && children}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default memo(KanbanColumn);
