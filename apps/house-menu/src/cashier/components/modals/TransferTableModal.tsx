import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import type { Order } from '../../types';

interface TransferTableModalProps {
  order: Order;
  tables?: number[];
  onTransfer: (orderId: string, targetTable: string) => Promise<void>;
  onClose: () => void;
}

export function TransferTableModal({ order, tables, onTransfer, onClose }: TransferTableModalProps) {
  const [target, setTarget] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!target.trim()) return;
    setTransferring(true);
    await onTransfer(order.id, target);
    setTransferring(false);
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
          <div className="modal-header-strip modal-header-strip-info" />

          <div className="px-6 pt-5 pb-3">
            <h3 className="text-base font-black uppercase tracking-wider text-cm-text flex items-center gap-2 mb-1">
              <ArrowLeftRight className="w-5 h-5 text-cm-info" />
              Transferir Mesa
            </h3>
            <p className="text-xs text-cm-text-secondary font-bold">
              #{order.id.slice(-6).toUpperCase()} — {order.customerName || 'Cliente'}
              {order.mesa ? ` · Mesa ${order.mesa}` : ''}
            </p>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-cm-text-secondary uppercase tracking-wider">
                Mesa Destino
              </label>
              {tables ? (
                <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {tables.map(t => (
                    <button
                      key={t} onClick={() => setTarget(String(t))}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                        target === String(t)
                          ? 'bg-cm-info text-white border-cm-info shadow-sm'
                          : 'bg-cm-bg-alt/30 text-cm-text border-cm-border hover:border-cm-info/50 hover:bg-cm-bg-alt/60'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={target} onChange={e => setTarget(e.target.value)}
                  placeholder="N° de mesa"
                  className="w-full px-4 py-2.5 bg-cm-bg-alt/50 border border-cm-border rounded-xl text-sm font-bold text-cm-text focus:outline-none focus:border-cm-info transition-colors font-mono"
                  autoFocus
                />
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-cm-border text-xs font-black text-cm-text-secondary rounded-xl hover:bg-cm-bg-alt/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer} disabled={transferring || !target.trim()}
                className="flex-1 py-2.5 bg-cm-info hover:bg-blue-700 text-white text-xs font-black rounded-xl disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {transferring ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                ) : (
                  <><ArrowLeftRight size={14} /> Transferir</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
