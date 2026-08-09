import { useState, useMemo } from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import { ordersService } from '../../lib/ordersService';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { getMethodsForRole } from '../../lib/paymentMethods';
import type { Order } from '../../worker/workerTypes';

interface CobrarModalProps {
  order: Order;
  onClose: () => void;
  onPaid: () => void;
}

const MOZO_METHODS = getMethodsForRole('mozo', false); // sin contraentrega — eso es delivery

export default function CobrarModal({ order, onClose, onPaid }: CobrarModalProps) {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const initialMethod = useMemo(() => {
    // Try to match order.payment_method with a known method label
    const pm = order.payment_method;
    if (!pm) return MOZO_METHODS[0]?.label || 'Efectivo';
    // Check if it matches any method's label
    const match = MOZO_METHODS.find(m => m.label === pm);
    return match?.label || MOZO_METHODS[0]?.label || 'Efectivo';
  }, [order.payment_method]);
  const [method, setMethod] = useState(initialMethod);
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handleCobrar = async () => {
    setLoading(true);
    setPayError(null);
    const result = await ordersService.markAsPaid(activeBranchId, order.id, method, user?.email);
    setLoading(false);
    if (result.success) {
      onPaid();
      onClose();
    } else {
      setPayError('Error al procesar el cobro. Intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-cm-surface rounded-xl shadow-cm-lg w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-lg font-bold text-cm-text mb-2">Cobrar Pedido</h3>
          <p className="text-sm text-cm-text-secondary mb-4">
            #{(order.id || '').slice(-4).toUpperCase()} — S/ {(order.financials?.total || 0).toFixed(2)}
          </p>
          <p className="text-xs font-semibold text-cm-text-secondary mb-3 uppercase tracking-wider">Método de pago</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {MOZO_METHODS.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.label)}
                className={`py-3 rounded-xl text-xs font-semibold border transition-all ${method === m.label ? 'bg-cm-accent border-cm-accent text-white' : 'bg-cm-accent/5 border-cm-border text-cm-text-secondary'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {payError && (
            <p className="text-[0.6rem] font-bold text-cm-error bg-cm-error/10 border border-cm-error/30 rounded-lg px-3 py-2 text-center mb-3">{payError}</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">Cancelar</button>
            <button onClick={handleCobrar} disabled={loading}
              className="flex-1 py-2.5 bg-cm-success text-white rounded-lg text-xs font-bold hover:bg-cm-success/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
              {loading ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
