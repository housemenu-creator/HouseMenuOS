import React from 'react';

export default function CategorySidebar({ categories, selected, onSelect }) {
  return (
    <nav className="space-y-1">
      {categories.map((cat) => {
        const isSelected = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              isSelected
                ? 'bg-cm-accent text-white shadow-cm-sm'
                : 'text-cm-text-secondary hover:bg-cm-surface hover:text-cm-text'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cm-surface' : 'bg-cm-border'}`} />
              {cat === 'todos' ? '✨ Todos' : cat}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
