import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatOrderId } from '../../../lib/format';

export default function VerifyPaymentModal({
  isOpen,
  order,
  onClose,
  onConfirm,
  onReject,
  confirmLoading = false,
  rejectLoading = false,
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleConfirm = () => {
    onConfirm();
  };

  const handleReject = () => {
    onReject(rejectReason);
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
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            className="bg-cm-surface rounded-2xl shadow-cm-lg p-6 w-full max-w-sm mx-4 border-2 border-cm-accent/30"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cm-accent/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cm-accent" />
              </div>
              <div>
                <h3 className="text-base font-black text-cm-text">Verificar Pago Yape / Plin</h3>
                <p className="text-xs text-cm-text-secondary">
                  {formatOrderId(order.id)} — {order.customerName || 'Anónimo'}
                </p>
              </div>
            </div>

            {/* Payment details */}
            <div className="bg-cm-bg rounded-xl p-4 mb-4 space-y-3 border border-cm-border">
              <div className="flex justify-between text-sm">
                <span className="text-cm-text-secondary">Total a verificar</span>
                <span className="font-black text-cm-text text-base">
                  {formatCurrency(order.financials?.total || 0)}
                </span>
              </div>
              {order.payment_details && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-cm-text-secondary">Billetera</span>
                    <span className="font-bold uppercase text-cm-accent">
                      {order.payment_details.wallet_type || 'N/A'}
                    </span>
                  </div>
                  {order.payment_details.operation_number && (
                    <div className="flex justify-between text-xs">
                      <span className="text-cm-text-secondary">N° Operación</span>
                      <span className="font-mono font-bold text-cm-text tracking-wider">
                        {order.payment_details.operation_number}
                      </span>
                    </div>
                  )}

                  {/* Voucher image */}
                  {order.payment_details.voucher_uploaded && order.payment_details.voucher_url ? (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-wider mb-1.5">
                        Comprobante
                      </p>
                      <a
                        href={order.payment_details.voucher_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={order.payment_details.voucher_url}
                          alt="Voucher Yape/Plin"
                          className="w-full h-40 object-cover rounded-xl border border-cm-border bg-cm-bg-alt hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      </a>
                      <p className="text-[10px] text-cm-text-tertiary mt-1">
                        Click para ver completo
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs">
                      <span className="text-cm-text-secondary">Comprobante foto</span>
                      <span className="font-bold text-orange-400">✗ No subido</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Reject input mode */}
            {showRejectInput ? (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-bold text-cm-error">¿Motivo del rechazo?</p>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ej: N° operación inválido, monto incorrecto..."
                  className="w-full bg-cm-bg-alt border border-cm-error/50 rounded-xl px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-error placeholder:text-cm-text-tertiary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                    className="flex-1 py-2 border border-cm-border text-xs font-bold text-cm-text rounded-xl hover:bg-cm-surface-hover transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectLoading}
                    className="flex-1 py-2 bg-cm-error text-white text-xs font-black rounded-xl hover:bg-cm-error/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {rejectLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    {rejectLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-cm-text-secondary text-center mb-4">
                  Al confirmar, el pedido quedará marcado como <strong>pagado</strong> y se
                  contabilizará en caja.
                </p>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="flex-1 py-2.5 border-2 border-cm-error/40 text-cm-error text-sm font-bold rounded-xl hover:bg-cm-error/5 transition-colors"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirmLoading}
                    className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-black rounded-xl hover:bg-cm-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    {confirmLoading ? 'Verificando...' : 'Confirmar Pago'}
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
