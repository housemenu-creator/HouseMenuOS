import { motion } from 'framer-motion';

export default function CategoryRibbon({ categories, selected, onSelect, categoryImages = {} }) {
  return (
    <div className="relative -mx-6 px-6">
      {/* Subtle fading edges for scroll indicator */}
      <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-cm-bg to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-cm-bg to-transparent pointer-events-none z-10" />

      <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide">
        {categories.map(cat => {
          const img = categoryImages[cat];
          const isSelected = selected === cat;
          
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className="relative flex items-center gap-2 px-4.5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 transition-transform duration-150 focus:outline-none active:scale-95 hover:scale-[1.02]"
            >
              {/* Animated background selection pill using Framer Motion */}
              {isSelected && (
                <motion.div
                  layoutId="selectedCategoryPill"
                  className="absolute inset-0 bg-gradient-to-r from-cm-accent to-amber-500 rounded-full shadow-cm-md z-0"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                />
              )}

              {/* Inactive border / background */}
              {!isSelected && (
                <div className="absolute inset-0 bg-cm-surface/80 text-cm-muted border border-cm-border/80 hover:border-cm-accent/30 rounded-full transition-all z-0 shadow-sm" />
              )}

              {/* Content must be relative and placed above the absolute background */}
              <span className="relative z-10 flex items-center gap-2">
                {img && (
                  <img 
                    src={img} 
                    alt={cat} 
                    className={`w-5 h-5 rounded-full object-cover shrink-0 border ${
                      isSelected ? 'border-white/20' : 'border-cm-border/80'
                    }`} 
                  />
                )}
                <span className={isSelected ? 'text-white' : 'text-cm-muted hover:text-cm-text transition-colors'}>
                  {cat === 'todos' ? '✨ Todos' : cat}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
