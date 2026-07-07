import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Undo2, Loader2 } from 'lucide-react';
import { formatCurrency, formatOrderId } from '../../../lib/format';

export default function RefundModal({ isOpen, order, onClose, onConfirm, processing }) {
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState('Efectivo');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setRefundAmount(order.financials?.total || 0);
      setRefundMethod('Efectivo');
      setRefundReason('');
    }
  }, [isOpen, order]);

  const maxAmount = order?.financials?.total || 0;

  return (
    <AnimatePresence>
      {isOpen && order && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-cm-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cm-warning" />
                <h3 className="text-lg font-bold text-cm-text">Reembolsar pedido</h3>
              </div>
              <p className="text-xs text-cm-text-secondary mt-1">
                {formatOrderId(order.id)} — {order.customerName || 'Anonimo'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">
                  Monto a reembolsar
                </p>
                <input
                  type="number"
                  step="0.5"
                  value={refundAmount}
                  onChange={e => setRefundAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                />
                <p className="text-xs text-cm-text-secondary mt-1">
                  Máximo: {formatCurrency(maxAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">
                  Método de reembolso
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['Efectivo', 'Yape/Plin', 'Transferencia'].map(m => (
                    <button
                      key={m}
                      onClick={() => setRefundMethod(m)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        refundMethod === m
                          ? 'bg-cm-warning border-cm-warning text-white'
                          : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary hover:bg-cm-accent/10'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">
                  Motivo (opcional)
                </p>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                  placeholder="Ej: Cliente insatisfecho, error en pedido..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-cm-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirm({ amount: refundAmount, method: refundMethod, reason: refundReason })}
                disabled={processing}
                className="flex-1 py-2.5 bg-cm-warning text-white text-sm font-semibold rounded-lg hover:bg-cm-warning/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Reembolsar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
