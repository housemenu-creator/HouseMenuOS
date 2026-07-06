import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, UtensilsCrossed } from 'lucide-react';

export default function SearchBar({ value, onChange, results = [], onSelectProduct }) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isFocused && inputRef.current) {
      // Small delay to let the animation start
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isFocused]);

  // Close overlay on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsFocused(false);
        onChange('');
      }
    };
    if (isFocused) {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [isFocused, onChange]);

  // Close overlay on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      setIsFocused(false);
      onChange('');
    }
  };

  const hasResults = results.length > 0;
  const showOverlay = isFocused;

  return (
    <>
      {/* Search input — always visible */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar plato, ingrediente o categoría..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={`w-full bg-cm-surface/60 backdrop-blur-md border rounded-2xl p-4 pl-12 pr-12 text-sm font-bold text-cm-text placeholder:text-cm-text-secondary/50 shadow-cm-sm transition-all duration-300 focus:outline-none ${
            isFocused 
              ? 'border-cm-accent/80 ring-4 ring-cm-accent/10 shadow-cm-md bg-cm-surface/85' 
              : 'border-cm-border/80 hover:border-cm-border'
          }`}
        />
        <SearchIcon 
          className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
            isFocused ? 'text-cm-accent' : 'text-cm-text-secondary/40'
          }`} 
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-cm-text-secondary/50 hover:text-cm-text-secondary transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fullscreen overlay ── */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            ref={overlayRef}
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-cm-bg/95 backdrop-blur-sm flex flex-col"
          >
            {/* Overlay header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-cm-border/30">
              <div className="relative flex-1">
                <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cm-accent" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full bg-cm-surface/80 border border-cm-border/60 rounded-2xl p-3.5 pl-12 pr-12 text-sm font-bold text-cm-text placeholder:text-cm-text-secondary/40 focus:outline-none focus:border-cm-accent/60 transition-colors"
                  autoFocus
                />
                {value && (
                  <button
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-cm-text-secondary/50 hover:text-cm-text-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setIsFocused(false); onChange(''); }}
                className="text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors shrink-0 px-2"
              >
                Cancelar
              </button>
            </div>

            {/* Results area */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-8">
              {!value ? (
                /* Prompt state — no query yet */
                <div className="flex flex-col items-center justify-center pt-16 text-center">
                  <SearchIcon className="w-10 h-10 text-cm-text-tertiary/40 mb-3" />
                  <p className="text-sm font-bold text-cm-text-secondary/60">
                    Escribe para buscar platos
                  </p>
                  <p className="text-xs text-cm-text-tertiary/40 mt-1">
                    Busca por nombre, ingrediente o categoría
                  </p>
                </div>
              ) : hasResults ? (
                /* Results list */
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cm-text-tertiary/50 pb-2 px-1">
                    {results.length} resultado{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map(([key, prod]) => (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectProduct?.(key, prod);
                        setIsFocused(false);
                        onChange('');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cm-surface/80 transition-colors text-left"
                    >
                      {/* Mini thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-cm-surface border border-cm-border/40">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-cm-text-tertiary/40" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-cm-text truncate">{prod.name}</p>
                        <p className="text-xs text-cm-text-secondary/60 truncate">{prod.category}</p>
                      </div>
                      <span className="text-sm font-black text-cm-accent shrink-0">
                        S/ {(prod.base_price ?? prod.price ?? 0).toFixed(2)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                /* Empty state — query but no results */
                <div className="flex flex-col items-center justify-center pt-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-cm-surface/80 border border-cm-border/40 flex items-center justify-center mb-4">
                    <SearchIcon className="w-6 h-6 text-cm-text-tertiary/40" />
                  </div>
                  <p className="text-sm font-bold text-cm-text-secondary">
                    No encontramos resultados para "{value}"
                  </p>
                  <p className="text-xs text-cm-text-tertiary/50 mt-1.5 max-w-xs">
                    Revisá la ortografía o probá con términos más generales
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
