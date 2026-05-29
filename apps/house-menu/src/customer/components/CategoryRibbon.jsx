export default function CategoryRibbon({ categories, selected, onSelect, categoryImages = {} }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
      {categories.map(cat => {
        const img = categoryImages[cat];
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider border-2 shrink-0 transition-all ${
              selected === cat
                ? 'bg-cm-accent border-cm-accent text-white shadow-cm-md'
                : 'bg-cm-surface text-cm-muted border-cm-border hover:border-cm-accent/30 shadow-cm-md'
            }`}
          >
            {img && (
              <img src={img} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            )}
            {cat === 'todos' ? '✨ Todos' : cat}
          </button>
        );
      })}
    </div>
  );
}
