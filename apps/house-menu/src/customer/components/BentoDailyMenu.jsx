import { motion } from 'framer-motion';
import { ChefHat, ArrowRight } from 'lucide-react';

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
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="bg-cm-surface rounded-2xl border-2 border-cm-border p-5 shadow-cm-md hover:shadow-cm-lg transition-all relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cm-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

      <div className="relative z-10 flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[0.65rem] font-black bg-cm-accent text-white px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <ChefHat className="w-3 h-3" />
              Menú del Día
            </span>
          </div>
          <h3 className="text-2xl font-black text-cm-text leading-tight">{menu.name}</h3>
          {menu.description && (
            <p className="text-sm text-cm-muted mt-1 leading-relaxed max-w-[85%]">{menu.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-cm-accent">S/ {Number(menu.base_price ?? menu.basePrice ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className={`grid gap-3 ${sideProducts.length > 0 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Main Product */}
        <div 
          onClick={() => onSelectProduct(mainProduct.id, mainProduct)}
          className={`cursor-pointer group relative overflow-hidden bg-cm-bg rounded-xl border border-cm-border hover:border-cm-accent p-4 transition-all ${sideProducts.length > 0 ? 'sm:col-span-2' : ''}`}
        >
          <div className="flex justify-between items-start h-full flex-col">
            <div>
              <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-widest mb-1">Principal</p>
              <h4 className="font-bold text-cm-text text-lg group-hover:text-cm-accent transition-colors">{mainProduct.name}</h4>
              <p className="text-xs text-cm-muted line-clamp-2 mt-1">{mainProduct.description}</p>
            </div>
            <div className="mt-4 w-full flex justify-end">
              <span className="w-8 h-8 rounded-full bg-cm-accent/10 text-cm-accent flex items-center justify-center group-hover:bg-cm-accent group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Side Products */}
        {sideProducts.length > 0 && (
          <div className="flex flex-col gap-3">
            {sideProducts.map((prod, idx) => (
              <div 
                key={prod.id}
                onClick={() => onSelectProduct(prod.id, prod)}
                className="cursor-pointer group bg-cm-bg rounded-xl border border-cm-border hover:border-cm-accent p-3 flex-1 flex flex-col justify-center transition-all"
              >
                <p className="text-[0.65rem] font-bold text-cm-muted uppercase tracking-widest mb-1">
                  {idx === 0 ? 'Opción 2' : 'Opción 3'}
                </p>
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-cm-text group-hover:text-cm-accent transition-colors line-clamp-1">{prod.name}</h4>
                  <ArrowRight className="w-3 h-3 text-cm-muted group-hover:text-cm-accent transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
