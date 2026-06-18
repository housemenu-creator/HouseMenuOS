import { useAppStore } from '@house/store';
import { ShoppingCart, ChevronRight } from 'lucide-react';

export default function SidebarCart({ onCheckout }) {
  const { cart } = useAppStore();

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-cm-muted">
        <ShoppingCart className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-bold">Tu carrito está vacío</p>
        <p className="text-xs mt-1 opacity-70">Agrega productos para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2">
        {cart.map((item) => (
          <div
            key={item.id}
            className="bg-cm-surface rounded-xl p-3 border border-cm-border/40"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-cm-text leading-tight">{item.name}</h4>
                {item.details?.length > 0 && (
                  <p className="text-[10px] text-cm-muted mt-1">{item.details.join(', ')}</p>
                )}
              </div>
              <span className="text-xs font-bold text-cm-accent">
                S/ {((item.price || 0) * (item.quantity || 1)).toFixed(})}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-cm-border/30">
              <span className="text-xs text-cm-muted">Cant: {item.quantity || 1}</span>
              {(item.price || 0) > 0 && (
                <span className="text-xs text-cm-muted">S/ {item.price.toFixed(2)} c/u</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total & Checkout */}
      <div className="border-t border-cm-border/40 pt-4 mt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-cm-text-secondary">Total</span>
          <span className="text-lg font-black text-cm-text">S/ {cartTotal.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3.5 bg-gradient-to-r from-cm-accent to-amber-500 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-cm-md hover:shadow-cm-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          <span>Ver Pedido</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
