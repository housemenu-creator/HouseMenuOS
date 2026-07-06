import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Loader2, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '../../../lib/format';
import type { Order } from '../../types';

interface CancelOrderModalProps {
  order: Order;
  onCancel: (orderId: string, reason: string) => Promise<{ success: boolean }>;
  onRefund?: (orderId: string, itemIndices: number[], reason: string) => Promise<{ success: boolean }>;
  onClose: () => void;
}

export function CancelOrderModal({ order, onCancel, onRefund, onClose }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const items = order.items || [];
  const isPartial = onRefund !== undefined && selectedItems.length > 0;
  const iconClass = isPartial ? 'bg-amber-500/20 text-amber-500 border-amber-500/15' : 'bg-cm-error-soft text-cm-error border-cm-error/15';

  const toggleItem = (index: number) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleAction = async () => {
    if (!reason.trim()) return;
    setCancelling(true);
    try {
      if (isPartial && onRefund) {
        await onRefund(order.id, selectedItems, reason);
      } else {
        await onCancel(order.id, reason);
      }
    } finally {
      setCancelling(false);
    }
  };

  const selectedSubtotal = selectedItems.reduce((sum, i) => {
    const item = items[i];
    return sum + (item ? (item.price || 0) * (item.quantity || 1) : 0);
  }, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        data-testid="modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-cm-surface rounded-2xl shadow-cm-lg w-full max-w-sm overflow-hidden border border-cm-border"
          onClick={e => e.stopPropagation()}
        >
          <div className={`modal-header-strip ${isPartial ? 'modal-header-strip-warning' : 'modal-header-strip-error'}`} />

          <div className="px-6 pt-5 pb-3 text-center">
            <div className={`w-12 h-12 ${iconClass} rounded-full flex items-center justify-center mx-auto mb-3 border shadow-sm`}>
              {isPartial ? <RotateCcw className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-cm-text">
              {isPartial ? 'Reembolso Parcial' : 'Cancelar Orden'}
            </h3>
            <p className="text-xs text-cm-text-secondary font-bold mt-1">
              #{order.id.slice(-6).toUpperCase()} — {order.customerName || 'Cliente'}
              {order.mesa ? ` · Mesa ${order.mesa}` : ''}
            </p>
            <p className="text-xl font-mono font-black mt-2.5" style={{ color: isPartial ? '#f59e0b' : 'var(--cm-error)' }}>
              {isPartial
                ? `S/ ${selectedSubtotal.toFixed(2)} / S/ ${formatCurrency(order.financials?.total || 0)}`
                : formatCurrency(order.financials?.total || 0)
              }
            </p>
          </div>

          <div className="px-6 pb-4 space-y-3">
            {/* Item selection for partial refund */}
            {onRefund && items.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-cm-text-secondary uppercase tracking-wider">
                  {items.length > 1 ? 'Seleccioná los items a reembolsar (opcional)' : 'Items'}
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {items.map((item, i) => {
                    const isSelected = selectedItems.includes(i);
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleItem(i)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all border ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-cm-bg-alt/30 border-transparent hover:border-cm-border'
                        }`}
                      >
                        {isSelected
                          ? <CheckSquare size={16} className="text-amber-500 shrink-0" />
                          : <Square size={16} className="text-cm-text-muted shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-cm-text truncate block">
                            {item.name || item.productName || item.productId}
                          </span>
                          <span className="text-[10px] font-semibold text-cm-text-muted">
                            {item.quantity}x · S/ {item.price.toFixed(2)} c/u
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-cm-text-secondary shrink-0 ml-1">
                          S/ {itemTotal.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <p className="text-[10px] font-bold text-amber-500 text-right">
                    {selectedItems.length} de {items.length} item(s) seleccionado(s)
                  </p>
                )}
              </div>
            )}

            {/* Reason field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-cm-text-secondary uppercase tracking-wider">
                {isPartial ? 'Motivo del reembolso *' : 'Motivo de cancelación *'}
              </label>
              <textarea
                value={reason} onChange={e => setReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-cm-bg-alt/50 border border-cm-border rounded-xl text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-error transition-colors"
                rows={3}
                placeholder={isPartial ? 'Explica por qué se reembolsan estos items...' : 'Explica detalladamente por qué se cancela esta orden...'}
                autoFocus
              />
            </div>

            {/* Quick reason buttons */}
            <div className="flex flex-wrap gap-1.5">
              {['Cliente insatisfecho', 'Error del mesero', 'Cambio de pedido'].map(label => (
                <button
                  key={label}
                  onClick={() => setReason(label)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                    reason === label
                      ? 'bg-cm-error/10 border-cm-error/30 text-cm-error'
                      : 'bg-cm-bg-alt/30 border-transparent text-cm-text-muted hover:border-cm-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-cm-border text-xs font-black text-cm-text-secondary rounded-xl hover:bg-cm-bg-alt/50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleAction} disabled={cancelling || !reason.trim()}
                className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  isPartial ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cm-error hover:bg-red-700'
                }`}
              >
                {cancelling ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                ) : isPartial ? (
                  <><RotateCcw size={14} /> Reembolsar ({selectedItems.length})</>
                ) : (
                  <><Ban size={14} /> Cancelar Orden</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
