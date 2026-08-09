import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@house/store';

export default function SidebarCart({ onCheckout }) {
  const { cart, updateCartItemQty, removeFromCart } = useAppStore();

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-cm-text-tertiary px-4">
        <div className="w-14 h-14 bg-cm-bg rounded-full flex items-center justify-center mb-3">
          <ShoppingCart className="w-7 h-7 opacity-40" />
        </div>
        <p className="text-sm font-bold text-cm-text-secondary">Carrito vacío</p>
        <p className="text-xs mt-1 text-cm-text-tertiary text-center">Agregá productos para armar tu pedido</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-cm-accent" />
          <span className="text-xs font-bold text-cm-text uppercase tracking-wide">
            {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
          </span>
        </div>
        <motion.span key={cartTotal} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-sm font-black text-cm-accent">
          S/ {cartTotal.toFixed(2)}
        </motion.span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        <AnimatePresence initial={false}>
          {cart.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 40, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -40, height: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-cm-bg rounded-xl p-3 border border-cm-border hover:border-cm-accent/40 transition-colors group overflow-hidden"
            >
              {/* Name & Remove */}
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm font-bold text-cm-text leading-tight flex-1 pr-1">
                  {item.name}
                </h4>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Details */}
              {item.details?.length > 0 && (
                <p className="text-[11px] text-cm-text-tertiary mt-1 leading-relaxed">
                  {item.details.join(' · ')}
                </p>
              )}

              {/* Quantity & Price */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-cm-border">
                <div className="flex items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => updateCartItemQty(item.id, (item.quantity || 1) - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-cm-surface border border-cm-border hover:border-cm-accent/50 text-cm-text-secondary hover:text-cm-accent transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </motion.button>
                  <motion.span key={item.quantity} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-7 text-center text-sm font-bold text-cm-text tabular-nums">
                    {item.quantity || 1}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => updateCartItemQty(item.id, (item.quantity || 1) + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-cm-surface border border-cm-border hover:border-cm-accent/50 text-cm-text-secondary hover:text-cm-accent transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </motion.button>
                </div>
                <motion.span key={item.quantity * (item.price || 0)} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-sm font-black text-cm-accent">
                  S/ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </motion.span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Total & Checkout */}
      <div className="pt-3 mt-3 border-t border-cm-border space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-bold text-cm-text-secondary">Total</span>
          <motion.span key={cartTotal} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-lg font-black text-cm-text">
            S/ {cartTotal.toFixed(2)}
          </motion.span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onCheckout}
          className="w-full py-3 bg-cm-accent hover:bg-cm-accent/90 text-white rounded-xl font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2"
        >
          <span>Ver Pedido</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}