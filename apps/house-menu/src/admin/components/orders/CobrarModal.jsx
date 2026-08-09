import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency, formatOrderId } from '../../../lib/format';

const PAYMENT_METHODS = [
  { key: 'Efectivo', label: 'Efectivo' },
  { key: 'Yape/Plin', label: 'Yape / Plin' },
  { key: 'Tarjeta (POS)', label: 'Tarjeta (POS)' },
  { key: 'Contraentrega', label: 'Contraentrega' },
];

export default function CobrarModal({ isOpen, order, onClose, onConfirm, loading = false }) {
  const [method, setMethod] = useState(order?.payment_method || 'Efectivo');

  const handleConfirm = () => {
    if (order) onConfirm(order.id, method);
  };

  return (
    <AnimatePresence>
      {isOpen && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-cm-text mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cm-accent" />
              Cobrar pedido
            </h3>
            <p className="text-sm text-cm-text-secondary mb-4">
              {formatOrderId(order.id)} — {formatCurrency(order.financials?.total || 0)}
            </p>
            <p className="text-xs font-semibold text-cm-text-secondary mb-2 uppercase tracking-wider">
              ¿Con qué método se cobró?
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`py-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    method === m.key
                      ? 'bg-cm-accent border-cm-accent text-white shadow-cm-sm'
                      : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary hover:bg-cm-accent/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2.5 bg-cm-success text-white text-sm font-semibold rounded-lg hover:bg-cm-success/80 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Cobrar'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
