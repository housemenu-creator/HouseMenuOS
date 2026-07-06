import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Copy, Search as SearchIcon, Navigation, FileDown } from 'lucide-react';

function formatCurrency(n) { return 'S/ ' + (n ?? 0).toFixed(2); }

function ReceiptContent({ orderId, cartItems, branchName, mesa }) {
  const subtotal = cartItems.reduce((s, i) => s + (i.price || 0), 0);
  const date = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <div id="receipt-content" className="bg-cm-surface text-black p-6 text-xs leading-relaxed font-sans" style={{ width: '320px' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-cm-border pb-4 mb-4">
        <p className="text-sm font-bold tracking-wider">{branchName || 'House Portal'}</p>
        <p className="text-[10px] text-cm-muted mt-1">COMPROBANTE DE PEDIDO</p>
        <p className="text-[10px] text-cm-muted">#{orderId?.slice(-8).toUpperCase()}</p>
        <p className="text-[10px] text-cm-text-secondary">{date}</p>
        {mesa && <p className="text-[10px] text-cm-muted mt-1">Mesa: {mesa}</p>}
      </div>

      {/* Items */}
      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-cm-border text-[9px] text-cm-muted uppercase tracking-wider">
            <th className="text-left pb-1">Item</th>
            <th className="text-right pb-1">Precio</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, i) => (
            <tr key={item.productId || i}>
              <td className="py-1">
                <span className="font-semibold">{item.name}</span>
                {item.details?.length > 0 && (
                  <div className="text-[9px] text-cm-text-secondary">{item.details.join(', ')}</div>
                )}
              </td>
              <td className="text-right py-1">{formatCurrency(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="border-t-2 border-dashed border-cm-border pt-3 flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-[9px] text-cm-text-secondary border-t border-dashed border-cm-border pt-4">
        <p>Gracias por tu pedido</p>
        <p className="mt-1">Rastrea tu pedido con el código: {orderId?.slice(-4).toUpperCase()}</p>
      </div>
    </div>
  );
}

export default function OrderConfirmation({ open, orderId, cartItems, branchId, branchName, mesa, paymentMethod, onTrackOrder, onNewOrder }) {
  const printingRef = useRef(false);

  const handleDownloadPDF = useCallback(async () => {
    if (printingRef.current) return;
    printingRef.current = true;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = document.getElementById('receipt-content');
      if (!el) return;
      await html2pdf().set({
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `comprobante-${orderId?.slice(-8).toUpperCase() || 'pedido'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' },
      }).from(el).save();
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      printingRef.current = false;
    }
  }, [orderId]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-cm-bg overflow-y-auto"
        >
          <div className="shrink-0 py-10 px-6 flex flex-col items-center text-center bg-cm-accent"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 border-4 border-white/40"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-white/70 text-xs font-bold tracking-[0.25em] uppercase mb-1">Pedido confirmado</p>
              <h1 className="text-4xl text-white">¡LISTO!</h1>
              <p className="text-white/80 text-sm mt-2">
                {paymentMethod === 'yape_plin'
                  ? 'Estamos esperando la confirmación de tu pago 💳'
                  : 'Tu pedido está en camino a la cocina 🍳'}
              </p>
            </motion.div>
          </div>

          <div className="flex-1 max-w-sm mx-auto w-full px-6 py-8 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5 text-center"
            >
              <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-2">Tu código de seguimiento</p>
              <p className="font-mono text-3xl font-black text-cm-accent tracking-widest">
                #{orderId?.slice(-4).toUpperCase()}
              </p>
              <p className="text-[0.6rem] text-cm-muted font-bold mt-1 break-all">{orderId}</p>
              <button
                onClick={() => { try { navigator.clipboard?.writeText(orderId); } catch (e) { console.warn('Clipboard error:', e); } }}
                className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-bold text-cm-accent/60 hover:text-cm-accent transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar ID completo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-5"
            >
              <p className="text-[0.6rem] font-bold text-cm-muted uppercase tracking-widest mb-3">Resumen del pedido</p>
              <ul className="space-y-2">
                {cartItems.map((item, i) => (
                  <li key={item.productId || i} className="flex justify-between items-start text-sm">
                    <div>
                      <span className="font-bold text-cm-text">{item.name}</span>
                      {item.details?.length > 0 && (
                        <span className="block text-xs text-cm-muted">{item.details.join(', ')}</span>
                      )}
                    </div>
                    <span className="font-bold text-cm-accent shrink-0 ml-3">S/ {item.price?.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-start gap-3 bg-cm-info/10 border border-cm-info/30 rounded-xl p-4"
            >
              <SearchIcon className="w-4 h-4 text-cm-info shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-cm-info leading-snug">
                Usa el código de seguimiento para rastrear tu pedido en tiempo real desde la pantalla de Rastreo.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="space-y-3 pt-2"
            >
              <button
                onClick={() => onTrackOrder(orderId)}
                className="w-full py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-cm-accent text-white shadow-cm-md hover:brightness-110"
              >
                <Navigation className="w-5 h-5" />
                RASTREAR MI PEDIDO EN VIVO
              </button>
              <button
                onClick={onNewOrder}
                className="w-full py-3 border-2 border-cm-border rounded-xl font-bold text-cm-muted hover:border-cm-accent/40 hover:text-cm-accent transition-all text-sm"
              >
                + Hacer otro pedido
              </button>
              <button
                onClick={handleDownloadPDF}
                className="w-full py-3 border border-cm-border rounded-xl font-bold text-xs text-cm-text-secondary hover:bg-cm-surface hover:border-cm-accent/30 transition-all flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Descargar Comprobante (PDF)
              </button>
            </motion.div>
          </div>

          {/* Hidden receipt for PDF generation */}
          <div className="absolute -left-[9999px]">
            <ReceiptContent orderId={orderId} cartItems={cartItems} branchName={branchName} mesa={mesa} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
