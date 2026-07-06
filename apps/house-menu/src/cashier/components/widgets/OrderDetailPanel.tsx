import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Percent } from 'lucide-react';
import type { Order, ItemDiscount } from '../../types';
import { calculateDiscountedPrice } from '../../services/calculator';

interface DiscountState {
  [itemIndex: number]: {
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;
    active: boolean;
  };
}

interface OrderDetailPanelProps {
  order: Order;
  onClose: () => void;
  onDiscountChange?: (itemIndex: number, discount: ItemDiscount | null) => void;
}

export function OrderDetailPanel({ order, onClose, onDiscountChange }: OrderDetailPanelProps) {
  const items = order.items || [];
  const [discounts, setDiscounts] = useState<DiscountState>({});
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const toggleDiscount = (i: number) => {
    if (expandedItem === i) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(i);
    if (!discounts[i]) {
      setDiscounts(prev => ({ ...prev, [i]: { type: 'percentage', value: 0, reason: '', active: false } }));
    }
  };

  const updateDiscount = (i: number, field: string, val: string | number) => {
    setDiscounts(prev => {
      const current = prev[i] || { type: 'percentage', value: 0, reason: '', active: false };
      const updated = { ...current, [field]: val };
      const newDiscounts = { ...prev, [i]: updated };
      // Notify parent
      if (onDiscountChange) {
        if (updated.active && updated.value > 0) {
          onDiscountChange(i, { type: updated.type, value: updated.value, reason: updated.reason });
        } else {
          onDiscountChange(i, null);
        }
      }
      return newDiscounts;
    });
  };

  const toggleActive = (i: number) => {
    setDiscounts(prev => {
      const current = prev[i] || { type: 'percentage', value: 0, reason: '', active: false };
      const updated = { ...current, active: !current.active };
      const newDiscounts = { ...prev, [i]: updated };
      if (onDiscountChange) {
        if (updated.active && updated.value > 0) {
          onDiscountChange(i, { type: updated.type, value: updated.value, reason: updated.reason });
        } else {
          onDiscountChange(i, null);
        }
      }
      return newDiscounts;
    });
  };

  const totalWithDiscounts = items.reduce((sum, item, i) => {
    const d = discounts[i];
    const discount = d?.active && d.value > 0 ? { type: d.type, value: d.value } : null;
    return sum + calculateDiscountedPrice(item, discount);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="cashier-panel border border-[var(--cashier-border)] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cashier-border)] bg-[var(--cashier-surface)]">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--cashier-text)]">
            #{order.id.slice(-6).toUpperCase()}
          </h3>
          <p className="text-[10px] font-bold text-[var(--cashier-text-secondary)]">
            {order.customerName || 'Cliente'}{order.mesa && ` · Mesa ${order.mesa}`}
          </p>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-[var(--cashier-bg)] border border-transparent hover:border-[var(--cashier-border)] transition-colors">
          <X size={16} className="text-[var(--cashier-text-secondary)]" />
        </button>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--cashier-text-muted)] text-center py-4 font-bold">
            Sin items registrados
          </p>
        ) : (
          items.map((item, i) => {
            const d = discounts[i];
            const hasDiscount = d?.active && d.value > 0;
            const discountedPrice = calculateDiscountedPrice(item, hasDiscount ? { type: d.type, value: d.value } : null);
            const originalPrice = (item.price || 0) * (item.quantity || 1);

            return (
              <div key={i} className="border-b border-[var(--cashier-border)]/30 last:border-b-0">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[var(--cashier-text-muted)] bg-[var(--cashier-bg)] px-1.5 py-0.5 rounded-md border border-[var(--cashier-border)] shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-xs font-bold text-[var(--cashier-text)] truncate">
                        {item.name || item.productName || item.productId}
                      </span>
                    </div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-[10px] text-[var(--cashier-text-muted)] ml-7 mt-0.5">
                        {item.selectedOptions.map(o => o.name).join(', ')}
                      </p>
                    )}
                    {/* Discount toggle */}
                    {onDiscountChange && (
                      <button onClick={() => toggleDiscount(i)}
                        className={`mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          hasDiscount
                            ? 'bg-[var(--cashier-accent)]/10 text-[var(--cashier-accent)]'
                            : 'text-[var(--cashier-text-muted)] hover:text-[var(--cashier-accent)] hover:bg-[var(--cashier-accent)]/5'
                        }`}>
                        <Percent size={10} />
                        {hasDiscount ? `${d.type === 'percentage' ? d.value + '%' : 'S/ ' + d.value}` : 'Descuento'}
                      </button>
                    )}
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    {hasDiscount ? (
                      <>
                        <p className="text-[10px] font-mono font-bold text-[var(--cashier-text-muted)] line-through">
                          S/ {originalPrice.toFixed(2)}
                        </p>
                        <p className="text-xs font-mono font-black text-[var(--cashier-success)]">
                          S/ {discountedPrice.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-mono font-black text-[var(--cashier-text)]">
                        S/ {originalPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Discount controls (expandable) */}
                {expandedItem === i && onDiscountChange && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="flex items-center gap-1.5 pb-2 pl-1"
                  >
                    <button onClick={() => updateDiscount(i, 'type', 'percentage')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                        (d?.type || 'percentage') === 'percentage'
                          ? 'bg-[var(--cashier-accent)] text-white'
                          : 'bg-[var(--cashier-bg)] text-[var(--cashier-text-secondary)] border border-[var(--cashier-border)]'
                      }`}>%</button>
                    <button onClick={() => updateDiscount(i, 'type', 'fixed')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
                        d?.type === 'fixed'
                          ? 'bg-[var(--cashier-accent)] text-white'
                          : 'bg-[var(--cashier-bg)] text-[var(--cashier-text-secondary)] border border-[var(--cashier-border)]'
                      }`}>S/</button>
                    <input
                      type="number" step="0.01" min="0"
                      value={d?.value || ''}
                      onChange={e => updateDiscount(i, 'value', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 px-2 py-1 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-lg text-[10px] font-mono font-black text-[var(--cashier-text)] focus:outline-none focus:border-[var(--cashier-accent)]"
                    />
                    <input
                      type="text"
                      value={d?.reason || ''}
                      onChange={e => updateDiscount(i, 'reason', e.target.value)}
                      placeholder="Motivo (opcional)"
                      className="flex-1 px-2 py-1 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-lg text-[10px] font-bold text-[var(--cashier-text)] placeholder:text-[var(--cashier-text-muted)] focus:outline-none focus:border-[var(--cashier-accent)]"
                    />
                    <button onClick={() => toggleActive(i)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        d?.active
                          ? 'bg-[var(--cashier-success)] text-white'
                          : 'bg-[var(--cashier-bg)] text-[var(--cashier-text-secondary)] border border-[var(--cashier-border)] hover:border-[var(--cashier-success)]'
                      }`}>
                      {d?.active ? 'ON' : 'OFF'}
                    </button>
                  </motion.div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      <div className="px-4 py-3 border-t border-[var(--cashier-border)] bg-[var(--cashier-surface)]">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[var(--cashier-text-secondary)] uppercase tracking-wider">
            Total {order.payment_status === 'pagado' ? 'Pagado' : 'a Pagar'}
          </span>
          <span className={`font-mono font-black text-lg ${order.payment_status === 'pagado' ? 'text-[var(--cashier-success)]' : 'text-[var(--cashier-text)]'}`}>
            S/ {totalWithDiscounts.toFixed(2)}
          </span>
        </div>
        {Object.values(discounts).some(d => d.active) && (
          <p className="text-[10px] font-bold text-[var(--cashier-accent)] mt-1">
            {Object.values(discounts).filter(d => d.active).length} descuento(s) aplicado(s)
          </p>
        )}
      </div>
    </motion.div>
  );
}
