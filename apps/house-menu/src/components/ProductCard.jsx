import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

function ProductCard({ productId, product, onSelect }) {
  const isOutOfStock = !product.available || (product.trackStock && (product.stock ?? 0) <= 0);
  const priceDisplay = (product.base_price ?? product.price ?? 0).toFixed(2);
  const isWizard = product.isWizard || (product.steps && product.steps.length > 0);

  // Dietary tags
  const isVegan = product.vegan || product.isVegan || product.tags?.includes('vegano');
  const isSpicy = product.spicy || product.isSpicy || product.tags?.includes('picante');
  const isGlutenFree = product.glutenFree || product.isGlutenFree || product.tags?.includes('sin_gluten');
  const isRecommended = product.recommended || product.isRecommended || product.tags?.includes('recomendado') || product.featured;
  const isNew = product.isNew || product.tags?.includes('nuevo');
  const promoDiscount = product.promoDiscount;

  const handleOpen = () => {
    if (!isOutOfStock) onSelect(productId, product);
  };

  return (
    <motion.div
      whileTap={isOutOfStock ? {} : { scale: 0.985 }}
      onClick={handleOpen}
      className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-all select-none
        ${isOutOfStock ? 'opacity-50 pointer-events-none' : 'hover:bg-cm-surface/60'}
        ${isRecommended ? 'bg-gradient-to-r from-yellow-500/[0.04] to-transparent' : ''}
      `}
    >
      {/* Separator line (every card except first) */}
      <div className="absolute top-0 left-[88px] right-4 h-px bg-cm-border/30" />

      {/* Image — 80×80 rounded */}
      <div className="relative shrink-0 w-20 h-20">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover rounded-[14px] border border-cm-border/40 ${isOutOfStock ? 'grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full rounded-[14px] bg-cm-surface/80 border border-cm-border/40 flex items-center justify-center">
            <span className="text-[8px] font-black text-cm-muted uppercase tracking-widest text-center leading-tight px-1">
              Sin img
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute -top-1.5 -left-1.5 flex flex-col gap-0.5">
          {isNew && (
            <span className="text-[7px] font-black px-1.5 py-0.5 bg-blue-500 text-white rounded-full uppercase tracking-wider shadow-sm leading-none">
              Nuevo
            </span>
          )}
          {promoDiscount && (
            <span className="text-[7px] font-black px-1.5 py-0.5 bg-red-500 text-white rounded-full uppercase tracking-wider shadow-sm leading-none animate-pulse">
              -{promoDiscount}%
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 rounded-[14px] bg-black/40 flex items-center justify-center">
            <span className="text-[8px] font-black text-white uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-bold text-cm-text leading-tight truncate">
            {product.name}
          </h3>
          {isRecommended && (
            <span className="text-[10px] shrink-0 mt-0.5">👑</span>
          )}
        </div>

        {product.description && (
          <p className="text-xs text-cm-text-secondary/70 leading-tight mt-0.5 line-clamp-1">
            {product.description}
          </p>
        )}

        {/* Dietary badges */}
        {(isVegan || isSpicy || isGlutenFree) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {isVegan && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 leading-none">
                🌱 Vegano
              </span>
            )}
            {isSpicy && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded-full border border-orange-500/20 leading-none">
                🌶️ Picante
              </span>
            )}
            {isGlutenFree && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-sky-500/10 text-sky-600 rounded-full border border-sky-500/20 leading-none">
                🌾 Sin Gluten
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-base font-black text-cm-accent tracking-tight">
            S/ {priceDisplay}
          </span>
          {isWizard && (
            <span className="text-[8px] font-bold text-cm-text-tertiary">desde</span>
          )}
        </div>
      </div>

      {/* + Button */}
      {!isOutOfStock && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); handleOpen(); }}
          className="shrink-0 w-9 h-9 rounded-full bg-cm-accent/10 border border-cm-accent/25 flex items-center justify-center text-cm-accent hover:bg-cm-accent/20 transition-colors"
          aria-label="Personalizar producto"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
}

export default memo(ProductCard);
