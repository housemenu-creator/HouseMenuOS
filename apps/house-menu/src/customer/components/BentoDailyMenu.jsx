import { motion } from 'framer-motion';
import { ChefHat, ArrowRight, Flame, Sparkles } from 'lucide-react';

export default function BentoDailyMenu({ menu, catalog, onSelectProduct }) {
  if (!menu || menu.active === false) return null;

  const products = (menu.productIds || [])
    .map(pid => ({ id: pid, ...catalog.products?.[pid] }))
    .filter(p => p.name);

  if (products.length === 0) return null;

  const mainProduct = products[0];
  const sideProducts = products.slice(1, 3); // Max 2 sides for the bento

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, type: 'spring', damping: 25 }}
      className="relative overflow-hidden rounded-3xl border-2 border-cm-accent/25 bg-gradient-to-br from-cm-surface via-cm-bg-alt to-cm-surface/80 p-6 shadow-cm-lg hover:border-cm-accent/40 transition-all duration-300"
    >
      {/* Premium background ambient light */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cm-accent/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-white bg-gradient-to-r from-cm-accent to-amber-500 rounded-full shadow-lg shadow-cm-accent/20">
              <ChefHat className="w-3.5 h-3.5" />
              Menú Recomendado del Día
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Flame className="w-3 h-3 animate-pulse" />
              Popular
            </span>
          </div>
          <h3 className="text-3xl font-black text-cm-text leading-tight tracking-tight">{menu.name}</h3>
          {menu.description && (
            <p className="text-sm text-cm-text-secondary mt-1.5 leading-relaxed max-w-xl">{menu.description}</p>
          )}
        </div>
        <div className="text-left sm:text-right shrink-0 p-3 sm:p-0 rounded-2xl bg-cm-surface/50 sm:bg-transparent border border-cm-border/40 sm:border-0">
          <p className="text-xs text-cm-text-secondary uppercase tracking-widest font-black">Precio del Menú</p>
          <p className="text-3xl font-black text-cm-accent tracking-tight">S/ {Number(menu.base_price ?? menu.basePrice ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${sideProducts.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Main Product Card */}
        <motion.div 
          onClick={() => onSelectProduct(mainProduct.id, mainProduct)}
          whileHover={{ scale: 1.015, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className={`cursor-pointer group relative overflow-hidden bg-cm-surface/40 hover:bg-cm-surface/70 rounded-2xl border border-cm-border/50 hover:border-cm-accent/40 p-5 transition-all flex flex-col md:flex-row gap-5 ${sideProducts.length > 0 ? 'sm:col-span-2' : ''}`}
        >
          {mainProduct.image && (
            <div className="w-full md:w-40 h-32 md:h-full min-h-[120px] rounded-xl overflow-hidden shrink-0 relative border border-cm-border/40">
              <img 
                src={mainProduct.image} 
                alt={mainProduct.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-cm-bg/70 backdrop-blur-md rounded-md text-[9px] font-black text-cm-text uppercase tracking-widest border border-cm-border/40">
                Plato Principal
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] font-bold text-cm-text-secondary uppercase tracking-wider">{mainProduct.category}</span>
                {mainProduct.spicy && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded">🌶️ Picante</span>}
                {mainProduct.vegan && <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20 rounded">🌱 Vegano</span>}
              </div>
              <h4 className="font-bold text-cm-text text-xl group-hover:text-cm-accent transition-colors leading-tight">{mainProduct.name}</h4>
              <p className="text-xs text-cm-text-secondary line-clamp-3 mt-1 leading-relaxed">{mainProduct.description}</p>
            </div>
            
            <div className="mt-4 w-full flex items-center justify-between border-t border-cm-border/30 pt-3">
              <span className="text-[10px] text-cm-text-secondary font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cm-accent" /> Click para personalizar plato
              </span>
              <span className="w-9 h-9 rounded-xl bg-cm-accent/10 text-cm-accent flex items-center justify-center group-hover:bg-cm-accent group-hover:text-white transition-all shadow-sm">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </motion.div>

        {/* Side Products Column */}
        {sideProducts.length > 0 && (
          <div className="flex flex-col gap-4">
            {sideProducts.map((prod, idx) => (
              <motion.div 
                key={prod.id}
                onClick={() => onSelectProduct(prod.id, prod)}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer group bg-cm-surface/30 hover:bg-cm-surface/60 rounded-2xl border border-cm-border/50 hover:border-cm-accent/40 p-4 flex flex-row items-center gap-3 transition-all flex-1"
              >
                {prod.image && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-cm-border/40">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6rem] font-black text-cm-accent uppercase tracking-widest mb-0.5">
                    {idx === 0 ? 'Segunda Opción' : 'Tercera Opción'}
                  </p>
                  <h4 className="font-bold text-sm text-cm-text group-hover:text-cm-accent transition-colors line-clamp-1 leading-snug">{prod.name}</h4>
                  <p className="text-[10px] text-cm-text-secondary/60 font-semibold line-clamp-1">{prod.category}</p>
                </div>
                
                <span className="w-7 h-7 rounded-lg bg-cm-surface/50 text-cm-text-secondary flex items-center justify-center group-hover:bg-cm-accent group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
