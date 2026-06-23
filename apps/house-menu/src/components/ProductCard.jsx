import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

function ProductCard({ productId, product, onSelect, onDirectAdd }) {
  const isOutOfStock = !product.available || (product.trackStock && (product.stock ?? 0) <= 0);
  const priceDisplay = (product.base_price ?? product.price ?? 0).toFixed(2);

  // Smart detection of gourmet tags
  const isVegan = product.vegan || product.isVegan || product.tags?.includes('vegano') ||
    product.description?.toLowerCase().includes('vegano') || product.name?.toLowerCase().includes('vegano');
  const isSpicy = product.spicy || product.isSpicy || product.tags?.includes('picante') ||
    product.description?.toLowerCase().includes('picante') || product.description?.toLowerCase().includes('ají') ||
    product.name?.toLowerCase().includes('picante');
  const isGlutenFree = product.glutenFree || product.isGlutenFree || product.tags?.includes('sin_gluten') ||
    product.description?.toLowerCase().includes('sin gluten') || product.description?.toLowerCase().includes('sin tacc');
  const isRecommended = product.recommended || product.isRecommended || product.tags?.includes('recomendado') || product.featured;
  const isNew = product.isNew || product.tags?.includes('nuevo') || product.name?.toLowerCase().includes('nuevo');
  const promoDiscount = product.promoDiscount;

  const isWizard = product.isWizard || (product.steps && product.steps.length > 0);

  return (
    <motion.div
      whileHover={isOutOfStock ? {} : { scale: 1.02, y: -4 }}
      whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      className={`bg-cm-surface/65 backdrop-blur-md rounded-2xl shadow-cm-sm border border-cm-border overflow-hidden group cursor-pointer hover:border-cm-accent/40 hover:shadow-cm-md transition-all ${
        isOutOfStock ? 'opacity-50 pointer-events-none select-none' : ''
      } ${isRecommended ? 'ring-1 ring-yellow-500/30' : ''}`}
      onClick={() => !isOutOfStock && onSelect(productId, product)}
    >
      {/* Image Section */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-cm-bg-alt flex items-center justify-center">
            <span className="text-xs font-black text-cm-muted uppercase tracking-widest">Sin imagen</span>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && (
            <span className="text-[8px] font-black px-2 py-1 bg-blue-500 text-white rounded-full uppercase tracking-wider shadow-sm">✨ Nuevo</span>
          )}
          {promoDiscount && (
            <span className="text-[8px] font-black px-2 py-1 bg-red-500 text-white rounded-full uppercase tracking-wider shadow-sm animate-pulse">-{promoDiscount}%</span>
          )}
        </div>

        {/* Quick Add Button - Only for simple products (not wizard) */}
        {!isOutOfStock && onDirectAdd && !isWizard && (
          <button
            onClick={(e) => { e.stopPropagation(); onDirectAdd(productId, product); }}
            className="absolute bottom-2 right-2 w-8 h-8 bg-cm-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            title="Añadir al carrito"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-sm font-black text-cm-text group-hover:text-cm-accent transition-colors leading-tight mb-1 truncate line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className={`text-xs text-cm-muted line-clamp-2 leading-relaxed ${isWizard ? 'mb-1' : 'mb-2'}`}>{product.description}</p>
        )}

        {/* Wizard indicator */}
        {isWizard && (
          <div className="text-[10px] font-bold text-cm-accent/80 bg-cm-accent/8 border border-cm-accent/20 rounded-full px-2.5 py-1 mb-2 text-center">
            Personalizable
          </div>
        )}

        {/* Dietary Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {isVegan && (
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">🌱 Vegano</span>
          )}
          {isSpicy && (
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded-full border border-orange-500/20">🌶️ Picante</span>
          )}
          {isGlutenFree && (
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-sky-500/10 text-sky-600 rounded-full border border-sky-500/20">🌾 Sin Gluten</span>
          )}
          {isRecommended && (
            <span className="text-[8px] font-black px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full border border-yellow-500/20">👑 Top</span>
          )}
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-cm-border/30">
          <div className="flex flex-col">
            <span className="text-lg font-black text-cm-accent tracking-tight">
              S/ {priceDisplay}
            </span>
            {isWizard && (
              <span className="text-[9px] text-cm-text-tertiary">desde</span>
            )}
          </div>
          {isWizard ? (
            <span className="text-[10px] font-bold text-cm-accent bg-cm-accent/10 border border-cm-accent/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Personalizar →
            </span>
          ) : (
            <span className="text-[10px] font-bold text-cm-text-secondary bg-cm-bg px-2 py-1 rounded-full">Ver detalles →</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductCard);
