import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Sin datos', description = 'No hay información disponible para mostrar.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
      <div className="w-16 h-16 rounded-full bg-cm-border flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-cm-muted" />
      </div>
      <h3 className="text-lg font-bold text-cm-muted">{title}</h3>
      <p className="text-sm text-cm-muted mt-1 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-cm-accent text-white rounded-lg text-sm font-bold hover:bg-cm-accent/80 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
