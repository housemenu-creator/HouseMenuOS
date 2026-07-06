import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Wallet, Smartphone, CreditCard,
  Loader2, Check, Percent, Plus, X,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/format';
import type { Order } from '../../types';

interface PaymentEntry {
  method: string;
  amount: number;
}

interface QuickPayModalProps {
  order: Order;
  onPay: (orderId: string, method: string, discount: Record<string, unknown> | null) => Promise<{ success: boolean }>;
  onClose: () => void;
}

const payMethods = [
  { id: 'Efectivo', label: 'Efectivo', icon: <Wallet className="w-4 h-4" />, color: 'emerald' },
  { id: 'Yape/Plin', label: 'Yape/Plin', icon: <Smartphone className="w-4 h-4" />, color: 'blue' },
  { id: 'Tarjeta (POS)', label: 'Tarjeta', icon: <CreditCard className="w-4 h-4" />, color: 'violet' },
];

export function QuickPayModal({ order, onPay, onClose }: QuickPayModalProps) {
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [paying, setPaying] = useState(false);
  const [multiMethod, setMultiMethod] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: 'Efectivo', amount: 0 },
  ]);

  const baseTotal = order.financials?.total || order.total || 0;

  const finalTotal = (() => {
    if (discountType === 'none' || !discountValue) return baseTotal;
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return baseTotal;
    if (discountType === 'percentage') return Math.max(0, baseTotal * (1 - Math.min(val, 100) / 100));
    return Math.max(0, baseTotal - val);
  })();

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = finalTotal - totalPaid;
  const balanced = Math.abs(remaining) < 0.01;

  const handlePay = async () => {
    setPaying(true);
    const hasDiscount = discountType !== 'none' && discountValue && parseFloat(discountValue) > 0;
    const discount = hasDiscount ? { type: discountType, value: parseFloat(discountValue), originalTotal: baseTotal } : null;

    if (multiMethod) {
      for (const p of payments) {
        if (p.amount > 0) {
          await onPay(order.id, p.method, discount);
        }
      }
    } else {
      await onPay(order.id, payments[0]?.method || 'Efectivo', discount);
    }
    setPaying(false);
  };

  const addPayment = () => {
    if (payments.length >= 6) return;
    const usedMethods = payments.map(p => p.method);
    const nextMethod = payMethods.find(m => !usedMethods.includes(m.id))?.id || 'Efectivo';
    setPayments(prev => [...prev, { method: nextMethod, amount: 0 }]);
  };

  const updatePayment = (i: number, field: keyof PaymentEntry, value: string) => {
    setPayments(prev => prev.map((p, idx) =>
      idx === i ? { ...p, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : p
    ));
  };

  const removePayment = (i: number) => {
    if (payments.length <= 1) return;
    setPayments(prev => prev.filter((_, idx) => idx !== i));
  };

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
          className="bg-[var(--cashier-surface)] border border-[var(--cashier-border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header-strip modal-header-strip-success" />

          <div className="px-5 pt-5 pb-3 text-center">
            <div className="w-12 h-12 bg-[var(--cashier-success)]/10 text-[var(--cashier-success)] rounded-full flex items-center justify-center mx-auto mb-3 border border-[var(--cashier-success)]/15 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-[var(--cashier-text)]">Registrar Pago</h3>
            <p className="text-xs text-[var(--cashier-text-secondary)] font-bold mt-1">
              #{order.id.slice(-6).toUpperCase()} — {order.customerName || 'Cliente'}
              {order.mesa ? ` · Mesa ${order.mesa}` : ''}
            </p>

            <div className="mt-3 bg-[var(--cashier-bg)]/30 border border-[var(--cashier-border)]/50 rounded-2xl py-3 px-4 inline-block min-w-[160px]">
              {discountType !== 'none' && discountValue && parseFloat(discountValue) > 0 ? (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-mono font-bold text-[var(--cashier-text-secondary)] line-through">
                    {formatCurrency(baseTotal)}
                  </span>
                  <span className="text-2xl font-mono font-black text-[var(--cashier-success)] tracking-tight mt-0.5">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              ) : (
                <p className="text-2xl font-mono font-black text-[var(--cashier-text)] tracking-tight">
                  {formatCurrency(baseTotal)}
                </p>
              )}
            </div>
          </div>

          {/* Discount */}
          <div className="px-5 pb-2">
            <button
              onClick={() => setDiscountType(discountType === 'none' ? 'percentage' : 'none')}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                discountType !== 'none'
                  ? 'bg-[var(--cashier-accent)]/10 text-[var(--cashier-accent)] border-[var(--cashier-accent)]/30'
                  : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] border-[var(--cashier-border)] hover:border-[var(--cashier-accent)]/30 hover:bg-[var(--cashier-bg)]/30'
              }`}
            >
              <Percent size={13} />
              {discountType !== 'none' ? 'Descuento Aplicado' : 'Aplicar Descuento'}
            </button>
            {discountType !== 'none' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                className="flex items-center gap-2 mt-2"
              >
                <div className="flex rounded-xl overflow-hidden border border-[var(--cashier-border)] shrink-0 shadow-sm">
                  <button onClick={() => setDiscountType('percentage')}
                    className={`px-3 py-2 text-[10px] font-black transition-colors ${
                      discountType === 'percentage' ? 'bg-[var(--cashier-accent)] text-white' : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)]'
                    }`}>%</button>
                  <button onClick={() => setDiscountType('fixed')}
                    className={`px-3 py-2 text-[10px] font-black transition-colors ${
                      discountType === 'fixed' ? 'bg-[var(--cashier-accent)] text-white' : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] hover:bg-[var(--cashier-bg)]'
                    }`}>S/</button>
                </div>
                <input type="number" step="0.01" min="0" value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'Ej: 10' : 'Ej: 5.00'}
                  className="flex-1 w-full px-3 py-2 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-black text-[var(--cashier-text)] focus:outline-none focus:border-[var(--cashier-accent)] transition-colors font-mono"
                  autoFocus
                />
              </motion.div>
            )}
          </div>

          {/* Multi-method toggle */}
          <div className="px-5 pt-2">
            <button
              onClick={() => setMultiMethod(!multiMethod)}
              className={`flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                multiMethod
                  ? 'bg-[var(--cashier-info)]/10 text-[var(--cashier-info)] border-[var(--cashier-info)]/30'
                  : 'bg-[var(--cashier-surface)] text-[var(--cashier-text-secondary)] border-[var(--cashier-border)] hover:border-[var(--cashier-info)]/30'
              }`}
            >
              <CreditCard size={12} />
              {multiMethod ? 'Modo Simple' : 'Pago Múltiple'}
            </button>
          </div>

          {/* Payment entries */}
          <div className="px-5 pt-2 space-y-2">
            {payments.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5"
              >
                <select
                  value={entry.method}
                  onChange={e => updatePayment(i, 'method', e.target.value)}
                  className="bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-[11px] font-bold text-[var(--cashier-text)] px-2 py-2.5 outline-none focus:border-[var(--cashier-accent)]"
                >
                  {payMethods.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--cashier-text-muted)]">S/</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={entry.amount || ''}
                    onChange={e => updatePayment(i, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 bg-[var(--cashier-bg)] border border-[var(--cashier-border)] rounded-xl text-xs font-mono font-black text-[var(--cashier-text)] focus:outline-none focus:border-[var(--cashier-accent)]"
                  />
                </div>
                {multiMethod && payments.length > 1 && (
                  <button onClick={() => removePayment(i)}
                    className="p-2 rounded-xl hover:bg-[var(--cashier-error)]/10 text-[var(--cashier-error)] transition-colors shrink-0">
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add method */}
          {multiMethod && payments.length < 6 && (
            <div className="px-5 pt-1.5">
              <button onClick={addPayment}
                className="flex items-center justify-center gap-1 w-full py-2 border-2 border-dashed border-[var(--cashier-border)] text-[10px] font-black text-[var(--cashier-text-secondary)] uppercase tracking-wider rounded-xl hover:border-[var(--cashier-accent)] hover:text-[var(--cashier-accent)] transition-all">
                <Plus size={12} /> Agregar Método
              </button>
            </div>
          )}

          {/* Balance indicator */}
          {multiMethod && !balanced && (
            <div className={`px-5 pt-1.5`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl inline-block ${
                remaining <= 0 ? 'bg-[var(--cashier-warning)]/10 text-[var(--cashier-warning)]' : 'bg-[var(--cashier-error)]/10 text-[var(--cashier-error)]'
              }`}>
                {remaining > 0
                  ? `Faltan ${formatCurrency(remaining)}`
                  : `Exceso de ${formatCurrency(Math.abs(remaining))}`
                }
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 pb-5 pt-3 flex gap-3">
            <button onClick={() => { setDiscountType('none'); setDiscountValue(''); onClose(); }}
              className="flex-1 py-3 border border-[var(--cashier-border)] text-xs font-black text-[var(--cashier-text-secondary)] rounded-xl hover:bg-[var(--cashier-bg)]/50 transition-colors">
              Cancelar
            </button>
            <button onClick={handlePay} disabled={paying || (multiMethod && !balanced)}
              className="flex-1 py-3 bg-[var(--cashier-success)] text-white text-xs font-black rounded-xl disabled:opacity-40 hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98]">
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                <><Check size={14} /> Cobrar {formatCurrency(multiMethod ? totalPaid : finalTotal)}</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
