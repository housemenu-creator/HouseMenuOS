import { Search as SearchIcon } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar plato, ingrediente o categoría..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-cm-surface border-2 border-cm-border rounded-xl p-4 pl-12 text-sm font-bold text-cm-text placeholder:text-cm-muted shadow-cm-md focus:outline-none focus:border-cm-accent transition-all"
      />
      <SearchIcon className="w-5 h-5 text-cm-muted absolute left-4 top-1/2 -translate-y-1/2" />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cm-accent hover:text-cm-accent transition-colors"
        >
          LIMPIAR
        </button>
      )}
    </div>
  );
}
