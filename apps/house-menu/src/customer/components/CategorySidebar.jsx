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

export default function CategorySidebar({ categories, selected, onSelect }) {
  return (
    <nav className="space-y-1">
      {categories.map((cat) => {
        const isSelected = selected === cat;
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(cat)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              isSelected
                ? 'bg-cm-accent text-white shadow-cm-sm'
                : 'text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-base">{getEmoji(cat)}</span>
              <span>{cat === 'todos' ? 'Todos' : cat}</span>
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
