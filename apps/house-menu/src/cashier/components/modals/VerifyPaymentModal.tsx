import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../lib/format';
import type { Order } from '../../types';

interface VerifyPaymentModalProps {
  order: Order;
  onVerify: (orderId: string) => Promise<{ success: boolean }>;
  onReject?: (orderId: string) => Promise<void>;
  onClose: () => void;
}

export function VerifyPaymentModal({ order, onVerify, onClose }: VerifyPaymentModalProps) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    await onVerify(order.id);
    setVerifying(false);
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
          className="bg-cm-surface rounded-2xl shadow-cm-lg w-full max-w-sm overflow-hidden border border-cm-border"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header-strip modal-header-strip-accent" />

          <div className="px-6 pt-5 pb-3 text-center">
            <div className="w-12 h-12 bg-cm-accent-light text-cm-accent rounded-full flex items-center justify-center mx-auto mb-3 border border-cm-accent/15 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-cm-text">Verificar Operación</h3>
            <p className="text-xs text-cm-text-secondary font-bold mt-1">
              #{order.id.slice(-6).toUpperCase()} — {order.customerName || 'Anónimo'}
            </p>
            <p className="text-xl font-mono font-black text-cm-accent mt-2.5">
              {formatCurrency(order.financials?.total || 0)}
            </p>
          </div>

          {/* Payment details */}
          <div className="px-6 pb-2 space-y-2 text-xs">
            {order.payment_details?.wallet_type && (
              <div className="flex justify-between bg-cm-bg-alt/50 border border-cm-border/50 rounded-xl px-4 py-2.5 shadow-sm font-semibold">
                <span className="text-cm-text-secondary">Billetera:</span>
                <span className="font-black text-cm-text uppercase tracking-wider text-[10px] bg-cm-bg-alt border border-cm-border/50 px-2 py-0.5 rounded-lg">
                  {order.payment_details.wallet_type}
                </span>
              </div>
            )}
            {order.payment_details?.operation_number && (
              <div className="flex justify-between bg-cm-bg-alt/50 border border-cm-border/50 rounded-xl px-4 py-2.5 shadow-sm font-semibold">
                <span className="text-cm-text-secondary">Código de Operación:</span>
                <span className="font-black text-cm-text font-mono text-[10px] bg-cm-accent-light text-cm-accent border border-cm-accent/20 px-2 py-0.5 rounded-lg">
                  #{order.payment_details.operation_number}
                </span>
              </div>
            )}
            {order.payment_details?.voucherUrl && (
              <div className="bg-cm-bg-alt/40 border border-cm-border/50 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] font-black text-cm-text-secondary uppercase tracking-wider mb-2">Comprobante de Captura (Voucher)</p>
                <div className="relative group overflow-hidden rounded-xl border border-cm-border shadow-sm">
                  <img src={order.payment_details.voucherUrl} alt="Voucher"
                    className="w-full h-auto object-cover max-h-60 rounded-xl hover:scale-[1.03] transition-all duration-300" />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-cm-border text-xs font-black text-cm-text-secondary rounded-xl hover:bg-cm-bg-alt/50 transition-colors"
            >
              Rechazar
            </button>
            <button onClick={handleVerify} disabled={verifying}
              className="flex-1 py-2.5 bg-cm-accent hover:bg-cm-accent-hover text-white text-xs font-black rounded-xl disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {verifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                <><CheckCircle size={14} /> Confirmar Pago</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
