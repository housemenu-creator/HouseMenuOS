import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Loader2, Plus, Minus } from 'lucide-react';
import { formatCurrency, formatOrderId } from '../lib/format';

export default function EditOrderModal({ isOpen, order, onClose, onSave, saving }) {
  const [editItems, setEditItems] = useState([]);

  useEffect(() => {
    if (isOpen && order) {
      setEditItems((order.items || []).map(i => ({ ...i, quantity: Number(i.quantity || 1) })));
    }
  }, [isOpen, order]);

  const handleChange = (index, field, value) => {
    setEditItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const total = editItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

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
            className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-cm-surface border-b border-cm-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-cm-text">Editar Pedido</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-cm-accent/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-cm-text-secondary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-cm-text-secondary">
                {formatOrderId(order.id)} — {order.customerName || 'Anonimo'}
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cm-border">
                    <th className="text-left py-2 text-xs font-semibold text-cm-text-secondary">Producto</th>
                    <th className="text-center py-2 text-xs font-semibold text-cm-text-secondary">Cant</th>
                    <th className="text-left py-2 text-xs font-semibold text-cm-text-secondary hidden sm:table-cell">Detalles</th>
                    <th className="text-right py-2 text-xs font-semibold text-cm-text-secondary">P.Unit</th>
                    <th className="text-right py-2 text-xs font-semibold text-cm-text-secondary">Subtotal</th>
                    <th className="w-8 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => {
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.price || 0);
                    return (
                      <tr key={idx} className="border-b border-cm-border/50 last:border-0">
                        <td className="py-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleChange(idx, 'name', e.target.value)}
                            className="w-full bg-cm-bg-alt border border-cm-border rounded px-2 py-1 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleChange(idx, 'quantity', Math.max(1, qty - 1))}
                              className="p-0.5 text-cm-text-secondary hover:text-cm-accent"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-cm-text">{qty}</span>
                            <button
                              onClick={() => handleChange(idx, 'quantity', qty + 1)}
                              className="p-0.5 text-cm-text-secondary hover:text-cm-accent"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 text-sm text-cm-text-secondary">{item.details?.join(', ') || '-'}</td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            value={price}
                            onChange={e => handleChange(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-20 text-right bg-cm-bg-alt border border-cm-border rounded px-2 py-1 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                          />
                        </td>
                        <td className="py-2 text-right font-semibold text-sm text-cm-text">{formatCurrency(qty * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="text-right text-sm font-bold text-cm-text pt-2 border-t border-cm-border">
                Nuevo Total: {formatCurrency(total)}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onSave(editItems, total)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
