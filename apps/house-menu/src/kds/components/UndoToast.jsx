import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function UndoToast({ history, onUndo, canUndo }) {
  const last = history[0];
  const label = last
    ? `${(last.orderId || '').slice(-6).toUpperCase()} · ${last.from || ''} → ${last.to || ''}`
    : '';

  return (
    <AnimatePresence>
      {canUndo && history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-5 py-3 rounded-2xl',
            'bg-cm-surface border border-cm-border shadow-cm-lg',
          )}
        >
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-cm-muted" />
            <span className="text-xs text-cm-muted font-medium">
              Deshacer cambio
            </span>
            <span className="text-[0.6rem] text-cm-muted/50 font-mono bg-cm-muted/5 px-2 py-0.5 rounded-md">
              {label}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onUndo}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold',
              'bg-cm-accent text-white shadow-cm-sm hover:shadow-cm-md transition-shadow'
            )}
          >
            <Undo2 className="w-3.5 h-3.5" />
            UNDO
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
