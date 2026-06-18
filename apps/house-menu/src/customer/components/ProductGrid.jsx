import { motion } from 'framer-motion';
import MenuCard from '../../components/MenuCard';

export default function ProductGrid({ products, onSelectProduct, onDirectAdd, searchQuery }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-cm-muted bg-cm-bg/50 rounded-2xl border-2 border-dashed border-cm-border p-6">
        <p className="text-2xl mb-2">🔍</p>
        <p className="font-bold text-sm uppercase tracking-widest text-cm-muted">No hay platos que coincidan</p>
        <p className="text-xs text-cm-muted mt-1">Intenta ajustando tu búsqueda o filtros.</p>
      </div>
    );
  }

  // Group products by category
  const grouped = products.reduce((acc, [key, prod]) => {
    const cat = prod.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push([key, prod]);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <div
          key={cat}
          id={`cat-section-${cat.toLowerCase().replace(/\s+/g, '-')}`}
          className="scroll-mt-24"
        >
          {/* Category section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-cm-border to-transparent" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cm-accent px-3 py-1.5 bg-cm-accent/10 rounded-full border border-cm-accent/20">
              {cat}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-cm-border to-transparent" />
          </div>

          {/* Products in this category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {grouped[cat].map(([key, prod], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <MenuCard
                  productId={key}
                  product={prod}
                  onSelect={onSelectProduct}
                  onDirectAdd={onDirectAdd}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
