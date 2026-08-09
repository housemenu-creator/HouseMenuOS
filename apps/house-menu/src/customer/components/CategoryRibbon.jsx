import { useRef } from 'react';
import { motion } from 'framer-motion';

const CATEGORY_EMOJIS = {
  'todos': '✨',
  'nuestras experiencias': '🍽️',
  'nuestras expiencias': '🍽️',
  'promos del día': '🔥',
  'pescados': '🐟',
  'mariscos': '🦐',
  'carnes': '🥩',
  'pastas': '🍝',
  'ensaladas': '🥗',
  'sopas': '🍜',
  'bebidas': '🥤',
  'postres': '🍰',
  'desayunos': '☀️',
  'general': '📋',
};

function getEmoji(cat) {
  const key = cat.toLowerCase().trim();
  return CATEGORY_EMOJIS[key] || '•';
}

export default function CategoryRibbon({ categories, selected, onSelect }) {
  const scrollRef = useRef(null);

  return (
    <div className="relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-cm-bg to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-cm-bg to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 pl-8 pr-8 -ml-8 -mr-8 scroll-smooth scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {categories.map(cat => {
          const isSelected = selected === cat;
          return (
            <motion.button
              key={cat}
              onClick={() => onSelect(cat)}
              whileTap={{ scale: 0.93 }}
              className={`relative shrink-0 focus:outline-none px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-cm-accent to-amber-500 text-white shadow-lg shadow-cm-accent/20 scale-105'
                  : 'bg-cm-surface/60 text-cm-text-secondary border border-cm-border/50 hover:border-cm-accent/30 hover:text-cm-text hover:bg-cm-surface'
              }`}
              style={{ scrollSnapAlign: 'center' }}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{getEmoji(cat)}</span>
                <span>{cat === 'todos' ? 'Todos' : cat}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
