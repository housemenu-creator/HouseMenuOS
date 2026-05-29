import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { STATUS_WORKFLOW } from '../kdsTypes';
import { cn } from '../../lib/utils';

const STATUS_LABELS = {
  recibido: 'Nuevos',
  preparando: 'Preparando',
  listo: 'Listos',
  entregado: 'Entregados',
};

export default function WorkflowSettings({ visibleColumns, onToggleColumn, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors bg-cm-muted/10 text-cm-muted/50 hover:bg-cm-muted/20 hover:text-cm-muted/70 border border-cm-border/10"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Columnas
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-cm-surface rounded-xl border border-cm-border shadow-cm-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-cm-border">
            <span className="text-xs font-bold text-cm-muted/60 uppercase tracking-wider">Columnas visibles</span>
          </div>
          <div className="p-2 space-y-1">
            {STATUS_WORKFLOW.slice(0, 3).map((status) => (
              <button
                key={status}
                onClick={() => { onToggleColumn(status); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-cm-muted/10 text-left"
              >
                <GripVertical className="w-3 h-3 text-cm-muted/20 flex-shrink-0" />
                {visibleColumns[status] !== false ? (
                  <Eye className="w-3.5 h-3.5 text-cm-accent" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-cm-muted/30" />
                )}
                <span className={cn(
                  'text-xs',
                  visibleColumns[status] !== false ? 'text-cm-text' : 'text-cm-muted/40'
                )}>
                  {STATUS_LABELS[status] || status}
                </span>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-cm-border">
            <p className="text-[0.55rem] text-cm-muted/30 leading-relaxed">
              Personaliza qué columnas del tablero Kanban se muestran.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
