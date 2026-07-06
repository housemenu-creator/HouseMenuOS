import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ImageIcon } from 'lucide-react';

export default function CategoryRibbon({ categories, selected, onSelect, categoryImages = {} }) {
  const scrollRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState(new Set());

  const handleImageLoad = (cat) => {
    setLoadedImages(prev => new Set(prev).add(cat));
  };

  return (
    <div className="relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-1 w-8 bg-gradient-to-r from-cm-bg to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-cm-bg to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 pl-8 pr-8 -ml-8 -mr-8 scroll-smooth scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {categories.map(cat => {
          const isSelected = selected === cat;
          const img = cat === 'todos' ? null : categoryImages[cat];
          const isLoaded = loadedImages.has(cat);

          return (
            <motion.button
              key={cat}
              onClick={() => onSelect(cat)}
              whileTap={{ scale: 0.93 }}
              className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none group"
              style={{ scrollSnapAlign: 'center' }}
            >
              {/* Circular thumbnail — 56px */}
              <div
                className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200
                  ${isSelected
                    ? 'ring-2 ring-cm-accent ring-offset-2 ring-offset-cm-bg scale-105'
                    : 'ring-1 ring-cm-border/50 group-hover:ring-cm-border'
                  }
                `}
              >
                {cat === 'todos' ? (
                  <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-gradient-to-br from-cm-accent to-amber-500' : 'bg-cm-surface/80 border border-cm-border/60'
                  }`}>
                    <Star className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-cm-accent'}`} />
                  </div>
                ) : img ? (
                  <>
                    {/* Skeleton while loading */}
                    {!isLoaded && (
                      <div className="absolute inset-0 rounded-full bg-cm-border/15 animate-pulse" />
                    )}
                    <img
                      src={img}
                      alt={cat}
                      onLoad={() => handleImageLoad(cat)}
                      className={`w-full h-full rounded-full object-cover transition-opacity duration-300 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                      } ${isSelected ? 'ring-1 ring-white/20' : ''}`}
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-white/10" />
                    )}
                  </>
                ) : (
                  <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-cm-accent/20' : 'bg-cm-surface/60 border border-cm-border/50'
                  }`}>
                    <ImageIcon className={`w-4 h-4 ${isSelected ? 'text-cm-accent' : 'text-cm-text-tertiary'}`} />
                  </div>
                )}
              </div>

              {/* Label */}
              <span className={`text-[9px] font-bold leading-tight text-center max-w-[64px] truncate transition-colors ${
                isSelected ? 'text-cm-accent' : 'text-cm-text-secondary/70 group-hover:text-cm-text'
              }`}>
                {cat === 'todos' ? 'Todos' : cat}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
