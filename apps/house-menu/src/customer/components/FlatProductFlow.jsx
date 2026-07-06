import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag } from 'lucide-react';

export default function FlatProductFlow({
  product,
  variationsList,
  modifiersList,
  selectedVariation,
  selectedModifiers,
  onSelectVariation,
  onToggleModifier,
  onAddToCart,
  isOutOfStock,
  qtyInCart = 0,
}) {
  const [quantity, setQuantity] = useState(1);

  const unitTotal = (product?.base_price || 0) +
    (selectedVariation && variationsList.find(v => v.id === selectedVariation)?.adjustPrice || 0) +
    selectedModifiers.reduce((acc, mId) => acc + (modifiersList.find(m => m.id === mId)?.price || 0), 0);

  const itemTotal = unitTotal * quantity;

  const incrementQty = () => {
    const stockLimit = product.stock ?? 99;
    if (quantity < stockLimit) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-5 pb-4">
        {/* Product Hero Image */}
        {product?.image && (
          <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-cm-border/60 shadow-cm-md">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cm-bg/60 via-transparent to-transparent" />
            {product?.category && (
              <span className="absolute bottom-3 left-3 text-[0.6rem] font-black uppercase tracking-widest text-cm-text bg-cm-surface/70 backdrop-blur px-2.5 py-1 rounded-full border border-cm-border/50">
                {product.category}
              </span>
            )}
          </div>
        )}

        {/* Product name + description (only if no image to avoid redundancy) */}
        {!product?.image && (
          <div>
            <h3 className="text-lg font-bold text-cm-text">{product?.name}</h3>
            {product?.description && (
              <p className="text-xs text-cm-text-secondary mt-1 leading-relaxed">{product.description}</p>
            )}
          </div>
        )}

        {/* Stock Banner */}
        {product?.trackStock && (
          <div className={`p-3.5 rounded-2xl border text-center font-bold text-xs ${
            (product.stock ?? 0) > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
          }`}>
            {(product.stock ?? 0) > 0
              ? `✅ Unidades disponibles en stock: ${product.stock}`
              : '❌ Este plato se encuentra agotado (Sin Stock)'}
          </div>
        )}

        {/* Special Category Suggestion */}
        {product?.category === 'Pas Tas' && (
          <div className="bg-cm-accent/10 border border-cm-accent/30 p-4 rounded-2xl text-center shadow-cm-sm">
            <p className="text-xs font-bold text-cm-accent flex items-center justify-center gap-1.5">
              💡 Para potenciar el sabor de tu pasta, ¿le agregamos un Huevo Frito o Queso?
            </p>
          </div>
        )}

        {/* Variations Selector */}
        {product?.name.includes('Tallarín') && !product?.name.includes('Saltado de Pollo') && (
          <div className="space-y-3">
            <h3 className="font-black tracking-widest text-cm-text-secondary/60 uppercase text-[10px] pl-1">Elige tu Proteína</h3>
            <div className="grid grid-cols-2 gap-3">
              {variationsList.map(v => (
                <motion.button
                  key={v.id}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onSelectVariation(v.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all shadow-cm-sm flex flex-col justify-between h-20 ${
                    selectedVariation === v.id
                      ? 'bg-cm-accent/10 border-cm-accent text-cm-text shadow-cm-md'
                      : 'bg-cm-surface/40 border-cm-border/60 text-cm-text-secondary hover:border-cm-border'
                  }`}
                >
                  <div className="font-bold text-sm text-cm-text">{v.name}</div>
                  {v.adjustPrice > 0 && <div className="text-[11px] font-black text-cm-accent">+ S/ {v.adjustPrice.toFixed(2)}</div>}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers List */}
        <div className="space-y-3">
          <h3 className="font-black tracking-widest text-cm-text-secondary/60 uppercase text-[10px] pl-1">Adicionales a tu gusto</h3>
          <div className="grid grid-cols-2 gap-3">
            {modifiersList.map(mod => (
              <motion.button
                key={mod.id}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onToggleModifier(mod.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all shadow-cm-sm flex flex-col justify-between h-20 ${
                  selectedModifiers.includes(mod.id)
                    ? 'bg-cm-accent/10 border-cm-accent text-cm-text shadow-cm-md'
                    : 'bg-cm-surface/40 border-cm-border/60 text-cm-text-secondary hover:border-cm-border'
                }`}
              >
                <div className="font-bold text-sm text-cm-text">{mod.name}</div>
                <div className="text-[11px] font-black text-cm-accent">+ S/ {mod.price.toFixed(2)}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar — inside flex layout */}
      <div className="shrink-0 bg-cm-bg/95 backdrop-blur-xl border-t border-cm-border/40 rounded-t-3xl shadow-cm-lg -mx-5 px-5 pt-3 pb-5">
        {/* Subtotal Row */}
        {!isOutOfStock && quantity > 1 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.65rem] text-cm-text-secondary font-bold uppercase tracking-wider">
              {quantity} × S/ {unitTotal.toFixed(2)}
            </span>
            <span className="text-[0.65rem] text-cm-accent font-black">
              Total: S/ {itemTotal.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-1 bg-cm-surface/60 border border-cm-border/50 rounded-2xl p-1.5 shrink-0">
              <button
                onClick={decrementQty}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center text-base font-black text-cm-text tabular-nums select-none">
                {quantity}
              </span>
              <button
                onClick={incrementQty}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 transition-all active:scale-90"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => onAddToCart(quantity)}
            disabled={isOutOfStock}
            className={`flex-1 py-4 text-xs font-black tracking-wider uppercase transition-all rounded-2xl flex items-center justify-center gap-2 ${
              isOutOfStock
                ? 'bg-cm-surface/50 text-cm-text-secondary/30 border border-cm-border cursor-not-allowed'
                : 'bg-gradient-to-r from-cm-accent to-amber-500 text-white shadow-lg shadow-cm-accent/30 hover:shadow-xl hover:shadow-cm-accent/40 active:scale-[0.98]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {isOutOfStock 
              ? (qtyInCart >= (product?.stock ?? 0) ? 'MÁXIMO EN CARRITO' : 'SIN STOCK') 
              : `AÑADIR • S/ ${itemTotal.toFixed(2)}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
