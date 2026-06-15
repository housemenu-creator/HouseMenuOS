import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Order } from '../../worker/workerTypes';

interface ConfirmDeliveryModalProps {
  order: Order | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeliveryModal({ order, loading, onConfirm, onClose }: ConfirmDeliveryModalProps) {
  if (!order) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-cm-surface rounded-2xl w-full max-w-sm overflow-hidden border border-cm-border shadow-cm-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-cm-success/10 p-6 border-b-2 border-cm-success/20 text-center">
            <div className="w-16 h-16 bg-cm-success/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cm-success/30">
              <CheckCircle2 className="w-8 h-8 text-cm-success" />
            </div>
            <h2 className="text-xl font-black text-cm-text">¿Confirmar entrega?</h2>
            <p className="text-cm-muted text-sm mt-1">Esta acción no se puede deshacer</p>
          </div>

          <div className="p-6 space-y-3">
            <div className="bg-cm-bg rounded-xl p-4 border border-cm-border">
              <p className="text-xs font-bold text-cm-muted uppercase tracking-widest mb-1">Entregando a</p>
              <p className="font-black text-cm-text text-lg">{order.customerName}</p>
            </div>

            <div className="bg-cm-bg rounded-xl p-4 border border-cm-border">
              <p className="text-xs font-bold text-cm-muted uppercase tracking-widest mb-1">Ubicación</p>
              <p className="font-bold text-cm-text">{order.location}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose}
                className="flex-1 py-4 rounded-xl font-black text-sm border border-cm-border text-cm-muted hover:bg-cm-bg transition-colors">
                CANCELAR
              </button>
              <button onClick={onConfirm} disabled={loading}
                className="flex-1 py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-success text-white shadow-cm-md hover:brightness-110 disabled:opacity-60">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> PROCESANDO...</> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
