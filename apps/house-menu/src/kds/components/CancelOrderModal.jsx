import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ChefHat } from 'lucide-react';

const QUICK_REASONS = [
  'Stock insuficiente',
  'Producto no disponible',
  'Cliente canceló',
  'Error en el pedido',
  'Tiempo de espera excesivo',
];

export default function CancelOrderModal({ order, isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState(false);

  const handleSelectReason = (r) => {
    setReason(r);
    setCustom(false);
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(order.id, reason.trim());
    setReason('');
    setCustom(false);
  };

  const handleClose = () => {
    setReason('');
    setCustom(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-cm-bg rounded-2xl border border-cm-border shadow-cm-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cm-error/10 border border-cm-error/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-cm-error" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cm-text">Rechazar pedido</h3>
                  <p className="text-[10px] text-cm-text-secondary font-medium">
                    #{order?.id?.slice(-6).toUpperCase()} — {order?.customerName}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-1.5 hover:bg-cm-surface rounded-lg transition-colors text-cm-text-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-cm-text-secondary leading-relaxed">
                El pedido pasará a estado <strong className="text-cm-error">cancelado</strong> y el stock se revertirá automáticamente.
              </p>

              {/* Quick reasons */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSelectReason(r)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                      reason === r && !custom
                        ? 'bg-cm-error/10 border-cm-error text-cm-error'
                        : 'bg-cm-surface border-cm-border text-cm-text-secondary hover:border-cm-text'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => { setCustom(true); setReason(''); }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    custom
                      ? 'bg-cm-error/10 border-cm-error text-cm-error'
                      : 'bg-cm-surface border-cm-border text-cm-text-secondary hover:border-cm-text'
                  }`}
                >
                  Otro
                </button>
              </div>

              {/* Custom reason textarea */}
              {custom && (
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describí el motivo del rechazo..."
                  maxLength={300}
                  rows={3}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cm-error text-cm-text placeholder:text-cm-text-tertiary resize-none"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-cm-border bg-cm-surface/50">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-cm-border text-xs font-bold text-cm-text-secondary hover:bg-cm-surface transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={!reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cm-error text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cm-error/90 transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Rechazar pedido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
