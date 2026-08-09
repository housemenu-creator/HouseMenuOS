import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Printer, X } from 'lucide-react';
import type { Order } from '../../types';
import { printReceipt } from '../../../lib/printTicket';

interface ReceiptModalProps {
  order: Order;
  branchName?: string;
  onClose: () => void;
}

export function ReceiptModal({ order, branchName, onClose }: ReceiptModalProps) {
  const handlePrint = () => {
    printReceipt(order, branchName || '').then(r => {
      if (!r?.engine) window.print(); // fallback
    });
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

          <div className="no-print px-6 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black uppercase tracking-wider text-cm-text flex items-center gap-2">
                <FileText className="w-5 h-5 text-cm-text-secondary" />
                Comprobante de Pago
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-cm-bg-alt/70 border border-transparent hover:border-cm-border transition-colors">
                <X className="w-5 h-5 text-cm-text-secondary" />
              </button>
            </div>

            {/* Receipt content */}
            <div id="receipt-print-area" className="bg-white text-black p-5 font-mono text-[11px] space-y-2.5 border border-gray-300 rounded-xl shadow-inner">
              <div className="text-center border-b border-gray-300 pb-3.5 mb-1.5">
                <p className="text-[13px] font-black uppercase tracking-widest">
                  {order.mesa ? `MESA ${order.mesa}` : 'DETALLE COMEDOR'}
                </p>
                <p className="text-[10px] text-gray-500 font-bold mt-1">
                  Cliente: {order.customerName || 'Cliente General'}
                </p>
                <p className="text-[9px] text-gray-400 font-semibold mt-0.5">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString('es-PE') : ''}
                </p>
              </div>

              <div className="space-y-1">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between gap-2 text-gray-800">
                    <span className="flex-1 truncate">
                      {item.quantity}x {item.name || item.productName || item.productId}
                    </span>
                    <span className="font-bold shrink-0 ml-2 font-mono">
                      S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-2.5 mt-2">
                <div className="flex justify-between font-black text-xs text-black">
                  <span>TOTAL COBRADO</span>
                  <span className="font-mono">S/ {(order.financials?.total || order.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 font-bold mt-1">
                  <span>MÉTODO: {order.payment_method?.toUpperCase()}</span>
                  <span className="text-emerald-600">✓ PAGADO</span>
                </div>
              </div>

              <div className="text-center text-[8px] text-gray-400 border-t border-gray-300 pt-2 mt-2 leading-relaxed">
                <p className="truncate font-semibold">Cod: #{order.id}</p>
                <p className="uppercase font-black mt-0.5">{branchName || ''}</p>
              </div>
            </div>

            <div className="no-print flex gap-3 mt-5">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 border border-cm-border text-xs font-black text-cm-text rounded-xl hover:bg-cm-bg-alt/50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={14} /> Imprimir Ticket
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 bg-cm-accent hover:bg-cm-accent-hover text-white text-xs font-black rounded-xl transition-all shadow-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
