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

  return (
    <motion.div
      whileHover={isOutOfStock ? {} : { scale: 1.015, y: -2 }}
      whileTap={isOutOfStock ? {} : { scale: 0.985 }}
      className={`bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-6 group relative border-l-4 transition-all ${
        featured ? 'flex flex-col sm:flex-row gap-6 items-start sm:items-center' : 'flex justify-between items-center'
      } ${
        isRecommended ? 'border-l-yellow-500 bg-yellow-50/10' : 'border-l-cm-accent'
      } ${
        isOutOfStock ? 'opacity-60 pointer-events-none select-none' : 'cursor-pointer'
      }`}
      onClick={() => !isOutOfStock && onSelect(productId, product)}
    >
      <div className={`flex-1 flex gap-4 min-w-0 ${featured ? 'w-full flex-col sm:flex-row' : 'items-center pr-4'}`}>
        {product.image ? (
          <div className={`relative shrink-0 ${featured ? 'w-full sm:w-32 h-40 sm:h-32' : 'w-20 h-20'}`}>
            <img 
              src={product.image} 
              alt={product.name} 
              className={`w-full h-full rounded-xl object-cover border border-cm-border shadow-sm group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale' : ''}`}
            />
            {/* AGOTADO overlay on image */}
            {isOutOfStock && (
              <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center bg-black/50">
                <span
                  className="text-white font-black text-[10px] tracking-widest uppercase bg-red-600/90 px-3 py-0.5 shadow-lg"
                  style={{ transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}
                >
                  AGOTADO
                </span>
              </div>
            )}
          </div>
        ) : isOutOfStock ? (
          <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center leading-tight">AGOTADO</span>
          </div>
        ) : null}
        
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-pixel tracking-widest text-cm-muted uppercase mb-1 flex items-center gap-2 flex-wrap">
            <span>{product.category}{product.context ? ` • ${product.context}` : ''}</span>
            {showLowStockWarning && (
              <span className="inline-block text-[9px] font-black text-white bg-cm-accent px-1.5 py-0.5 rounded uppercase tracking-normal animate-pulse">
                ¡Sólo quedan {product.stock}!
              </span>
            )}
          </span>
          <h3 className={`${featured ? 'text-2xl' : 'text-xl'} text-cm-text group-hover:text-cm-accent transition-colors leading-tight mb-1 flex items-center gap-2`}>
            <span>{product.name}</span>
            {isRecommended && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-normal flex items-center gap-0.5 shrink-0" title="Recomendación del Chef">
                👑 Top
              </span>
            )}
          </h3>
          <p className="text-xs text-cm-muted line-clamp-2 leading-relaxed mb-2">
            {product.description}
          </p>
          
          {/* Gourmet Badges */}
          <div className="flex flex-wrap gap-1.5">
            {isVegan && (
              <span className="text-[9px] font-bold px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full uppercase">
                🌱 Vegano
              </span>
            )}
            {isSpicy && (
              <span className="text-[9px] font-bold px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded-full uppercase">
                🌶️ Picante
              </span>
            )}
            {isGlutenFree && (
              <span className="text-[9px] font-bold px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-full uppercase">
                🌾 Sin TACC
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className={`flex items-end gap-2 z-10 shrink-0 ${featured ? 'flex-row sm:flex-col w-full sm:w-auto justify-between sm:justify-end mt-4 sm:mt-0 border-t sm:border-t-0 border-cm-border pt-4 sm:pt-0' : 'flex-col'}`}>
        {isOutOfStock ? (
          <span className="text-xs font-black text-gray-400 tracking-wider uppercase bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
            AGOTADO
          </span>
        ) : (
          <span className="text-lg font-black text-cm-accent">
            S/ {priceDisplay}
          </span>
        )}
        <div className="flex items-center gap-2 mt-2">
          {!isOutOfStock && onDirectAdd && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDirectAdd(productId, product); }}
              className="p-1.5 bg-cm-accent/20 text-cm-accent rounded-full hover:bg-cm-accent hover:text-white transition-colors"
              title="Añadir Directo al Carrito"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          )}
          {!isOutOfStock && (
            <ArrowRight 
              className="text-cm-muted w-5 h-5 group-hover:text-cm-accent group-hover:translate-x-1 transition-all" 
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(MenuCard);
