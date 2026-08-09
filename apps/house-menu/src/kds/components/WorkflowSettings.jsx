import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Eye, EyeOff, GripVertical, Type, Grid, ClipboardList } from 'lucide-react';
import { STATUS_WORKFLOW } from '../kdsTypes';
import { cn } from '../../lib/utils';

const STATUS_LABELS = {
  recibido: 'Nuevos',
  preparando: 'Preparando',
  listo: 'Listos',
  entregado: 'Entregados',
};

export default function WorkflowSettings({
  visibleColumns,
  onToggleColumn,
  fontSize,
  onFontSizeChange,
  density,
  onDensityChange,
  showConsolidated,
  onToggleConsolidated,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors bg-cm-muted/10 text-cm-muted/50 hover:bg-cm-muted/20 hover:text-cm-muted/70 border border-cm-border/10 animate-[fadeIn_0.3s_ease]"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Configuración
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-cm-surface rounded-xl border border-cm-border shadow-cm-lg z-50 overflow-hidden divide-y divide-cm-border animate-[fadeIn_0.2s_ease-out]">
          {/* Columnas */}
          <div className="p-3">
            <span className="text-[0.65rem] font-bold text-cm-muted/60 uppercase tracking-wider block mb-2">Columnas</span>
            <div className="space-y-1">
              {STATUS_WORKFLOW.slice(0, 3).map((status) => (
                <button
                  key={status}
                  onClick={() => onToggleColumn(status)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-cm-muted/5"
                >
                  <span className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-cm-muted/20 flex-shrink-0" />
                    <span className={visibleColumns[status] !== false ? 'text-cm-text' : 'text-cm-muted/40'}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </span>
                  {visibleColumns[status] !== false ? (
                    <Eye className="w-3.5 h-3.5 text-cm-accent" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-cm-muted/30" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño Letra */}
          <div className="p-3">
            <span className="text-[0.65rem] font-bold text-cm-muted/60 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <Type className="w-3 h-3 text-cm-muted/40" /> Tamaño de Letra
            </span>
            <div className="grid grid-cols-3 gap-1 bg-cm-bg-alt/50 p-0.5 rounded-lg border border-cm-border/10">
              {['normal', 'large', 'huge'].map((sz) => (
                <button
                  key={sz}
                  onClick={() => onFontSizeChange(sz)}
                  className={cn(
                    'py-1 rounded text-[10px] font-bold capitalize transition-all',
                    fontSize === sz ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border' : 'text-cm-muted/60 hover:text-cm-muted'
                  )}
                >
                  {sz === 'normal' ? 'Normal' : sz === 'large' ? 'Grande' : 'Gigante'}
                </button>
              ))}
            </div>
          </div>

          {/* Densidad */}
          <div className="p-3">
            <span className="text-[0.65rem] font-bold text-cm-muted/60 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <Grid className="w-3 h-3 text-cm-muted/40" /> Densidad de Tarjeta
            </span>
            <div className="grid grid-cols-2 gap-1 bg-cm-bg-alt/50 p-0.5 rounded-lg border border-cm-border/10">
              {[
                { key: 'cozy', label: 'Espacioso' },
                { key: 'compact', label: 'Compacto' }
              ].map((d) => (
                <button
                  key={d.key}
                  onClick={() => onDensityChange(d.key)}
                  className={cn(
                    'py-1 rounded text-[10px] font-bold transition-all',
                    density === d.key ? 'bg-cm-surface text-cm-accent shadow-cm-sm border border-cm-border' : 'text-cm-muted/60 hover:text-cm-muted'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Consolidado */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-cm-text flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-cm-accent" /> Panel Consolidado
            </span>
            <button
              onClick={() => onToggleConsolidated(!showConsolidated)}
              className={cn(
                'toggle-cm',
                showConsolidated ? 'active' : ''
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
