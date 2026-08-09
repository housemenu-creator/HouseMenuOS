import { motion } from 'framer-motion';
import { ChefHat, ArrowRight, Flame, Clock } from 'lucide-react';

export default function BentoDailyMenu({ menu, catalog, onSelectProduct }) {
  if (!menu || menu.active === false) return null;

  const products = (menu.productIds || [])
    .map(pid => ({ id: pid, ...catalog.products?.[pid] }))
    .filter(p => p.name);

  if (products.length === 0) return null;

  const mainProduct = products[0];
  const sideProducts = products.slice(1, 3);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, type: 'spring', damping: 25 }}
      className="relative overflow-hidden rounded-3xl border-2 border-cm-accent/25 bg-gradient-to-br from-cm-surface via-cm-bg-alt to-cm-surface/80 p-5 sm:p-6 shadow-cm-lg hover:border-cm-accent/40 transition-all duration-300"
    >
      {/* Ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cm-accent/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.6rem] font-black uppercase tracking-widest text-white bg-gradient-to-r from-cm-accent to-amber-500 rounded-full shadow-lg shadow-cm-accent/20">
              <ChefHat className="w-3 h-3" />
              Menú del Día
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.55rem] font-bold text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Flame className="w-2.5 h-2.5 animate-pulse" />
              Popular
            </span>
            {menu.available_until && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.55rem] font-bold text-cm-text-secondary bg-cm-surface/50 rounded-full border border-cm-border/40">
                <Clock className="w-2.5 h-2.5" />
                Hasta agotar
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-cm-text leading-tight tracking-tight">{menu.name}</h3>
            {menu.description && (
              <p className="text-xs sm:text-sm text-cm-text-secondary mt-1 leading-relaxed max-w-xl">{menu.description}</p>
            )}
          </div>
        </div>
        {/* Price pill */}
        <div className="shrink-0 self-start sm:self-end px-4 py-2 rounded-2xl bg-gradient-to-br from-cm-accent/15 to-amber-500/10 border border-cm-accent/20 shadow-sm">
          <p className="text-[0.55rem] text-cm-accent uppercase tracking-widest font-black leading-tight">Desde</p>
          <p className="text-2xl sm:text-3xl font-black text-cm-accent tracking-tight leading-none">S/ {Number(menu.base_price ?? menu.basePrice ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className={`relative z-10 grid gap-3 sm:gap-4 ${sideProducts.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
        {/* ── Main Product (col-span-2) ── */}
        <motion.div 
          onClick={() => onSelectProduct(mainProduct.id, mainProduct)}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl border border-cm-border/50 hover:border-cm-accent/40 bg-cm-surface/40 hover:bg-cm-surface/70 transition-all ${sideProducts.length > 0 ? 'sm:col-span-2' : ''}`}
        >
          <div className="flex flex-col sm:flex-row">
            {mainProduct.image && (
              <div className="relative w-full sm:w-44 h-40 sm:h-full min-h-[140px] overflow-hidden shrink-0">
                <img 
                  src={mainProduct.image} 
                  alt={mainProduct.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Gradient overlay on right edge for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-cm-bg/60 via-cm-bg/10 to-transparent" />
                <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[8px] font-black text-white/90 uppercase tracking-widest border border-white/10">
                  Principal
                </div>
              </div>
            )}
            
            <div className="flex-1 flex flex-col justify-between p-4 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.55rem] font-bold text-cm-text-secondary uppercase tracking-wider">{mainProduct.category}</span>
                  {mainProduct.spicy && <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">🌶️ Picante</span>}
                  {mainProduct.vegan && <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">🌱 Vegano</span>}
                </div>
                <h4 className="font-bold text-lg sm:text-xl text-cm-text group-hover:text-cm-accent transition-colors leading-tight">{mainProduct.name}</h4>
                <p className="text-xs text-cm-text-secondary line-clamp-2 leading-relaxed">{mainProduct.description}</p>
              </div>
              
              <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-cm-border/30 pt-3">
                <span className="text-[9px] sm:text-[10px] text-cm-accent font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cm-accent animate-pulse" />
                  Personalizar y pedir
                </span>
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cm-accent text-white flex items-center justify-center group-hover:bg-cm-accent/90 transition-all shadow-sm shadow-cm-accent/20 group-hover:shadow-cm-accent/40 group-hover:translate-x-0.5">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Side Products ── */}
        {sideProducts.length > 0 && (
          <div className="flex flex-col gap-3 sm:gap-4">
            {sideProducts.map((prod, idx) => (
              <motion.div 
                key={prod.id}
                onClick={() => onSelectProduct(prod.id, prod)}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer group bg-cm-surface/30 hover:bg-cm-surface/60 rounded-2xl border border-cm-border/50 hover:border-cm-accent/40 overflow-hidden transition-all flex-1 flex sm:flex-col"
              >
                {prod.image && (
                  <div className="relative w-28 sm:w-full h-24 sm:h-28 shrink-0 overflow-hidden">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r sm:bg-gradient-to-t from-cm-bg/40 to-transparent" />
                    {/* Tag overlay */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/30 backdrop-blur-sm rounded-md text-[7px] font-black text-white/80 uppercase tracking-widest">
                      {idx === 0 ? '2°' : '3°'}
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between p-3 sm:p-3.5 min-w-0">
                  <div>
                    <span className="text-[0.5rem] font-black text-cm-accent uppercase tracking-widest">{prod.category}</span>
                    <h4 className="font-bold text-sm text-cm-text group-hover:text-cm-accent transition-colors leading-snug mt-0.5">{prod.name}</h4>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-black text-cm-accent">
                      S/ {Number(prod.base_price ?? prod.price ?? 0).toFixed(2)}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-cm-accent/10 text-cm-accent flex items-center justify-center group-hover:bg-cm-accent group-hover:text-white transition-all">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
