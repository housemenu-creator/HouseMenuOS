import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar plato, ingrediente o categoría..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
            whileHover={{ scale: 1.1, backgroundColor: 'var(--cm-accent-light)', color: 'var(--cm-accent)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-cm-text-secondary/50 transition-colors"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

