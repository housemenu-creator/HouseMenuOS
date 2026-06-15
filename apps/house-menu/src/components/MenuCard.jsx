import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlusCircle } from 'lucide-react';

function MenuCard({ productId, product, onSelect, onDirectAdd, featured }) {
  const isOutOfStock = !product.available || (product.trackStock && (product.stock ?? 0) <= 0);
  const showLowStockWarning = product.trackStock && product.available && (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5;
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

  return (
    <motion.div
      whileHover={isOutOfStock ? {} : { scale: 1.015, y: -2 }}
      whileTap={isOutOfStock ? {} : { scale: 0.985 }}
      className={`bg-cm-surface/65 backdrop-blur-md rounded-2xl shadow-cm-sm border border-cm-border/75 p-5 group relative border-l-4 transition-all ${
        featured ? 'flex flex-col sm:flex-row gap-5 items-start sm:items-center' : 'flex justify-between items-center gap-4'
      } ${
        isRecommended ? 'border-l-yellow-500 bg-yellow-500/[0.02]' : 'border-l-cm-accent/80'
      } ${
        isOutOfStock ? 'opacity-50 pointer-events-none select-none' : 'cursor-pointer hover:border-cm-accent/40'
      }`}
      onClick={() => !isOutOfStock && onSelect(productId, product)}
    >
      <div className={`flex-1 flex gap-4 min-w-0 ${featured ? 'w-full flex-col sm:flex-row' : 'items-center pr-2'}`}>
        {product.image ? (
          <div className={`relative shrink-0 overflow-hidden rounded-xl border border-cm-border/80 shadow-cm-sm ${featured ? 'w-full sm:w-36 h-48 sm:h-32' : 'w-20 h-20'}`}>
            <img 
              src={product.image} 
              alt={product.name} 
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${isOutOfStock ? 'grayscale' : ''}`}
            />
            {/* AGOTADO overlay on image */}
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                <span
                  className="text-white font-black text-[9px] tracking-widest uppercase bg-cm-error/95 px-2.5 py-0.5 shadow-md"
                  style={{ transform: 'rotate(-15deg)', whiteSpace: 'nowrap' }}
                >
                  AGOTADO
                </span>
              </div>
            )}
          </div>
        ) : isOutOfStock ? (
          <div className="w-20 h-20 rounded-xl bg-cm-bg-alt border border-cm-border flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-cm-muted uppercase tracking-widest text-center leading-tight">AGOTADO</span>
          </div>
        ) : null}
        
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold tracking-widest text-cm-muted uppercase mb-1 flex items-center gap-2 flex-wrap">
            <span className="opacity-80">{product.category}{product.context ? ` • ${product.context}` : ''}</span>
            {showLowStockWarning && (
              <span className="inline-block text-[9px] font-black text-white bg-cm-accent px-1.5 py-0.5 rounded uppercase tracking-normal animate-pulse shadow-sm">
                ¡Sólo quedan {product.stock}!
              </span>
            )}
          </div>
          <h3 className={`${featured ? 'text-xl font-black' : 'text-base font-bold'} text-cm-text group-hover:text-cm-accent transition-colors leading-tight mb-1 flex items-center gap-2`}>
            <span>{product.name}</span>
            {isRecommended && (
              <span className="text-[9px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-normal flex items-center gap-0.5 shrink-0 border border-yellow-500/20" title="Recomendación del Chef">
                👑 Top
              </span>
            )}
          </h3>
          <p className="text-xs text-cm-muted line-clamp-2 leading-relaxed mb-2.5">
            {product.description}
          </p>
          
          {/* Marketing & Dietary Badges */}
          <div className="flex flex-wrap gap-1.5">
            {isNew && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-full uppercase tracking-wider">
                ✨ Nuevo
              </span>
            )}
            {promoDiscount && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full uppercase tracking-wider animate-pulse">
                🔥 {promoDiscount}% OFF
              </span>
            )}
            {isVegan && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full uppercase">
                🌱 Vegano
              </span>
            )}
            {isSpicy && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-full uppercase">
                🌶️ Picante
              </span>
            )}
            {isGlutenFree && (
              <span className="text-[9px] font-black px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 rounded-full uppercase">
                🌾 Sin Gluten
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className={`flex items-end gap-3 z-10 shrink-0 ${featured ? 'flex-row sm:flex-col w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0 border-t sm:border-t-0 border-cm-border/50 pt-3 sm:pt-0' : 'flex-col justify-between h-full py-1'}`}>
        {isOutOfStock ? (
          <span className="text-[10px] font-black text-cm-muted tracking-wider uppercase bg-cm-bg-alt px-2.5 py-1 rounded-xl border border-cm-border">
            Agotado
          </span>
        ) : (
          <span className="text-base font-black text-cm-accent tracking-tight">
            S/ {priceDisplay}
          </span>
        )}
        <div className="flex items-center gap-2 mt-1">
          {!isOutOfStock && onDirectAdd && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDirectAdd(productId, product); }}
              className="p-1.5 bg-cm-accent/10 text-cm-accent rounded-full hover:bg-cm-accent hover:text-white transition-colors"
              title="Añadir Directo al Carrito"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          )}
          {!isOutOfStock && (
            <div className="px-3 py-1.5 rounded-full bg-cm-accent/10 group-hover:bg-cm-accent text-cm-accent group-hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 shadow-sm shrink-0">
              <span>Pedir</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(MenuCard);
