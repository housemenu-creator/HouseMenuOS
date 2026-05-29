import React from 'react';
import { CheckCheck, X, ChefHat, UtensilsCrossed, Zap } from 'lucide-react';

const ACTIONS = [
  { key: 'preparando', label: 'Iniciar Preparación', icon: ChefHat, color: 'bg-cm-accent hover:bg-cm-accent/80' },
  { key: 'listo', label: 'Marcar Listos', icon: CheckCheck, color: 'bg-cm-accent hover:bg-cm-accent/80' },
  { key: 'rush', label: 'Prioridad', icon: Zap, color: 'bg-cm-error hover:bg-cm-error/80' },
];

export default function BulkActionBar({ selectedCount, onBulkAction, onClearSelection, className = '' }) {
  if (selectedCount === 0) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-cm-surface text-cm-text px-5 py-3 rounded-2xl shadow-cm-lg border border-cm-border ${className}`}>
      <span className="text-sm font-bold whitespace-nowrap">
        {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
      </span>

      <div className="h-6 w-px bg-cm-border" />

      {ACTIONS.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onBulkAction(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${color} text-white`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}

      <div className="h-6 w-px bg-cm-border" />

      <button
        onClick={onClearSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-cm-muted/10 text-cm-muted"
      >
        <X className="w-3.5 h-3.5" />
        Cancelar
      </button>
    </div>
  );
}
