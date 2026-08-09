import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, UtensilsCrossed, Star } from 'lucide-react';

function ProductCard({ productId, product, onSelect }) {
  const isOutOfStock = !product.available || (product.trackStock && (product.stock ?? 0) <= 0);
  const showLowStockWarning = !isOutOfStock && product.trackStock && (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5;
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
      whileHover={isOutOfStock ? {} : { y: -4 }}
      whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      onClick={handleOpen}
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group border ${
        isOutOfStock ? 'opacity-50 border-cm-border/30' :
        isRecommended ? 'border-cm-accent/20 bg-gradient-to-b from-cm-accent/[0.02] to-transparent' :
        'border-cm-border/40 bg-cm-surface/60 hover:border-cm-accent/25 hover:shadow-lg hover:shadow-cm-accent/5'
      }`}
    >
      {/* Image — 4:3 aspect */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-cm-bg-alt">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isOutOfStock ? 'grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cm-accent/5 to-cm-bg-alt">
            <UtensilsCrossed className="w-8 h-8 text-cm-muted/20" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-cm-bg/60 to-transparent pointer-events-none" />

        {/* Badges — top left */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {isNew && (
            <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              className="text-[8px] font-black px-2 py-1 bg-blue-500 text-white rounded-full uppercase tracking-wider shadow-lg leading-none"
            >
              Nuevo
            </motion.span>
          )}
          {promoDiscount && (
            <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 }}
              className="text-[8px] font-black px-2 py-1 bg-red-500 text-white rounded-full uppercase tracking-wider shadow-lg leading-none animate-pulse"
            >
              -{promoDiscount}%
            </motion.span>
          )}
          {showLowStockWarning && (
            <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="text-[8px] font-black px-2 py-1 bg-cm-accent text-white rounded-full uppercase tracking-wider shadow-lg leading-none animate-pulse"
            >
              ¡Solo quedan {product.stock}!
            </motion.span>
          )}
        </div>

        {/* Recommended crown */}
        {isRecommended && (
          <div className="absolute top-3 right-3 z-10">
            <Star className="w-5 h-5 text-cm-accent fill-cm-accent drop-shadow-lg" />
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-[10px] font-black text-white uppercase tracking-wider bg-black/60 px-3 py-1.5 rounded-full shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="text-sm font-bold text-cm-text leading-tight line-clamp-2 group-hover:text-cm-accent transition-colors">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[11px] text-cm-text-secondary/70 leading-relaxed mt-1 line-clamp-1">
            {product.description}
          </p>
        )}

        {/* Dietary badges */}
        {(isVegan || isSpicy || isGlutenFree) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {isVegan && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 leading-none">
                🌱 Vegano
              </span>
            )}
            {isSpicy && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 leading-none">
                🌶️ Picante
              </span>
            )}
            {isGlutenFree && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20 leading-none">
                🌾 Sin Gluten
              </span>
            )}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cm-border/20">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-cm-accent tracking-tight">
              S/ {priceDisplay}
            </span>
            {isWizard && (
              <span className="text-[8px] font-bold text-cm-text-tertiary">desde</span>
            )}
          </div>
          {!isOutOfStock && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handleOpen(); }}
              className="w-8 h-8 rounded-xl bg-cm-accent/10 border border-cm-accent/20 flex items-center justify-center text-cm-accent hover:bg-cm-accent hover:text-white transition-all group/btn"
              aria-label="Personalizar producto"
            >
              <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductCard);
