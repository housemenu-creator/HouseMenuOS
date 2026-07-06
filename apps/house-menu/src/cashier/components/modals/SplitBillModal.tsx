import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Minus, Check, X } from 'lucide-react';
import type { Order } from '../../types';
import { calculateSplitDistribution, validateSplitBalance } from '../../services/calculator';

const MAX_DINERS = 6;

interface SplitBillModalProps {
  order: Order;
  onSplit: (orderId: string, splits: Array<{ name: string; items: number[]; method: string }>) => Promise<{ success: boolean }>;
  onClose: () => void;
}

export function SplitBillModal({ order, onSplit, onClose }: SplitBillModalProps) {
  const items = order.items || [];
  const [diners, setDiners] = useState<Array<{ name: string; items: number[]; method: string }>>([
    { name: 'Comensal 1', items: [], method: 'Efectivo' },
  ]);

  const addDiner = () => {
    if (diners.length >= MAX_DINERS) return;
    setDiners(prev => [...prev, { name: `Comensal ${prev.length + 1}`, items: [], method: 'Efectivo' }]);
  };

  const removeDiner = (i: number) => {
    if (diners.length <= 1) return;
    setDiners(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleItem = (dinerIdx: number, itemIdx: number) => {
    setDiners(prev => prev.map((d, di) => {
      if (di !== dinerIdx) return { ...d, items: d.items.filter(i => i !== itemIdx) };
      const has = d.items.includes(itemIdx);
      return { ...d, items: has ? d.items.filter(i => i !== itemIdx) : [...d.items, itemIdx].sort() };
    }));
  };

  const setDinerName = (i: number, name: string) => {
    setDiners(prev => prev.map((d, idx) => idx === i ? { ...d, name } : d));
  };

  const setDinerMethod = (i: number, method: string) => {
    setDiners(prev => prev.map((d, idx) => idx === i ? { ...d, method } : d));
  };

  const splits = calculateSplitDistribution(items, diners);
  const balance = validateSplitBalance(items, diners);

  const handleSplit = async () => {
    await onSplit(order.id, diners);
    onClose();
  };

  const assignedItems = new Set<number>();
  diners.forEach(d => d.items.forEach(i => assignedItems.add(i)));

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
          className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header-strip modal-header-strip-accent" />

          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black uppercase tracking-wider text-[var(--cashier-text)] flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--cashier-accent)]" />
                Dividir Cuenta
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[var(--cashier-bg)] border border-transparent hover:border-[var(--cashier-border)] transition-colors">
                <X size={18} className="text-[var(--cashier-text-secondary)]" />
              </button>
            </div>

            <p className="text-xs text-[var(--cashier-text-secondary)] font-bold mb-4">
              #{order.id.slice(-6).toUpperCase()} — {order.customerName || 'Cliente'} · Mesa {order.mesa || '-'}
            </p>

            {/* Balance indicator */}
            <div className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl mb-4 inline-block ${
              balance.balanced ? 'bg-[var(--cashier-success)]/10 text-[var(--cashier-success)]' : 'bg-[var(--cashier-warning)]/10 text-[var(--cashier-warning)]'
            }`}>
              {balance.balanced
                ? `✓ S/ ${balance.totalAssigned.toFixed(2)} — Completo`
                : `S/ ${balance.totalAssigned.toFixed(2)} de S/ ${balance.totalOrder.toFixed(2)} — Faltan ${balance.unassigned.length} ítems`
              }
            </div>

            {/* Items grid */}
            <div className="mb-4 space-y-1">
              <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider mb-2">Ítems de la orden</p>
              {items.map((item, itemIdx) => {
                const assignedTo = diners.findIndex(d => d.items.includes(itemIdx));
                return (
                  <div key={itemIdx} className="flex items-center gap-2 py-1.5 border-b border-[var(--cashier-border)]/30 last:border-b-0">
                    {diners.map((_, di) => (
                      <button
                        key={di}
                        onClick={() => toggleItem(di, itemIdx)}
                        className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all flex items-center justify-center ${
                          diners[di].items.includes(itemIdx)
                            ? 'bg-[var(--cashier-accent)] text-white shadow-sm'
                            : 'bg-[var(--cashier-bg)] text-[var(--cashier-text-muted)] border border-[var(--cashier-border)] hover:border-[var(--cashier-accent)]'
                        }`}
                      >
                        {di + 1}
                      </button>
                    ))}
                    <span className={`flex-1 text-xs font-bold ${
                      assignedTo >= 0 ? 'text-[var(--cashier-text)]' : 'text-[var(--cashier-text-muted)]'
                    }`}>
                      {item.quantity}x {item.name || item.productName || item.productId}
                    </span>
                    <span className="text-xs font-mono font-black text-[var(--cashier-text-secondary)]">
                      S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Diners */}
            <div className="space-y-2">
              {diners.map((diner, i) => {
                const split = splits[i];
                return (
                  <div key={i} className="cashier-panel bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text" value={diner.name}
                        onChange={e => setDinerName(i, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-[var(--cashier-border)] focus:border-[var(--cashier-accent)] text-sm font-black text-[var(--cashier-text)] px-1 py-0.5 outline-none transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-[var(--cashier-accent)]">
                          S/ {(split?.total || 0).toFixed(2)}
                        </span>
                        {diners.length > 1 && (
                          <button onClick={() => removeDiner(i)}
                            className="p-1 rounded-lg hover:bg-[var(--cashier-error)]/10 text-[var(--cashier-error)] transition-colors">
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-[var(--cashier-text-secondary)]">Método:</label>
                      <select
                        value={diner.method}
                        onChange={e => setDinerMethod(i, e.target.value)}
                        className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-lg text-[10px] font-bold text-[var(--cashier-text)] px-2 py-1 outline-none focus:border-[var(--cashier-accent)]"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Yape/Plin">Yape/Plin</option>
                        <option value="Tarjeta (POS)">Tarjeta</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add diner */}
            {diners.length < MAX_DINERS && (
              <button onClick={addDiner}
                className="w-full mt-3 py-2.5 border-2 border-dashed border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-xs font-black uppercase tracking-wider rounded-xl hover:border-[var(--cashier-accent)] hover:text-[var(--cashier-accent)] transition-all flex items-center justify-center gap-1.5">
                <Plus size={14} /> Agregar Comensal
              </button>
            )}

            {/* Action */}
            <div className="flex gap-3 mt-5">
              <button onClick={onClose}
                className="flex-1 py-3 border border-[var(--cashier-border)] text-[var(--cashier-text-secondary)] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[var(--cashier-bg)] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSplit} disabled={!balance.balanced}
                className="flex-1 py-3 bg-[var(--cashier-accent)] text-white text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-40 hover:bg-purple-700 transition-all shadow-sm flex items-center justify-center gap-1.5">
                <Check size={14} /> Split ({diners.length})
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
