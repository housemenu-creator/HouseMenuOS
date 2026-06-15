/**
 * Audit Section — agent execution history with search.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { History, Search, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribeAudit } from './configService';

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditSection() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsub = subscribeAudit((data, err) => {
      if (err) { setError(err); return; }
      setLogs(data);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim() || !logs) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      (l.task_id || '').toLowerCase().includes(q) ||
      (l.resumen || '').toLowerCase().includes(q) ||
      (l.instruccion || '').toLowerCase().includes(q) ||
      (l.canal || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Loading state
  if (!logs && !error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-cm-error mx-auto mb-3" />
        <p className="text-xs text-cm-text-secondary">Error al cargar auditoría: {error.message || 'Error desconocido'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-text-tertiary pointer-events-none" />
        <input type="text" placeholder="Buscar por tarea, resultado, instrucción..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-cm-bg-alt border border-cm-border rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent focus:ring-1 focus:ring-cm-accent/30 text-cm-text placeholder:text-cm-text-tertiary transition-colors" />
      </div>

      {/* Empty states */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-cm-text mb-1">
            {logs.length === 0 ? 'Sin actividad aún' : 'Sin resultados'}
          </h3>
          <p className="text-xs text-cm-text-secondary">
            {logs.length === 0
              ? 'Las ejecuciones del agente aparecerán aquí cuando el scheduler se active.'
              : `No hay registros que coincidan con "${search}".`}
          </p>
        </div>
      ) : (
        /* Log list */
        <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1 -mr-1">
          {filtered.map((log) => {
            const isExpanded = expandedId === log.id;
            const success = log.resultado === 'ok';

            return (
              <div key={log.id}
                className={`bg-cm-surface border rounded-lg transition-all duration-150 ${
                  isExpanded ? 'border-cm-accent/30 shadow-cm-sm' : 'border-cm-border'
                }`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-cm-bg-alt/30 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${success ? 'bg-cm-success' : 'bg-cm-error'}`} />
                      <span className="font-semibold text-xs text-cm-text font-mono">{log.task_id || '—'}</span>
                      <span className="text-[0.5rem] text-cm-text-tertiary">{log.tipo || ''}</span>
                      {log.canal && (
                        <span className="text-[0.5rem] bg-cm-bg-alt text-cm-text-secondary px-1.5 py-0.5 rounded">{log.canal}</span>
                      )}
                      <span className={`text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full ${
                        success ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'
                      }`}>
                        {success ? 'Éxito' : 'Error'}
                      </span>
                    </div>
                    <p className="text-[0.55rem] text-cm-text-secondary mt-1 line-clamp-1">{log.resumen || log.instruccion || ''}</p>
                    <span className="text-[0.5rem] text-cm-text-tertiary font-mono mt-1 inline-block">
                      {fmtTime(log.ejecucion)}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cm-text-tertiary shrink-0 mt-1" /> : <ChevronDown className="w-3.5 h-3.5 text-cm-text-tertiary shrink-0 mt-1" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-cm-border/30 mt-0">
                    {/* Instruction */}
                    {log.instruccion && (
                      <div className="mt-2">
                        <span className="text-[0.5rem] font-semibold text-cm-text-secondary uppercase tracking-wider">Instrucción</span>
                        <p className="text-[0.55rem] text-cm-text mt-1 bg-cm-bg-alt rounded-lg p-2 leading-relaxed font-mono">{log.instruccion}</p>
                      </div>
                    )}

                    {/* Tool calls */}
                    {log.herramientas?.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[0.5rem] font-semibold text-cm-text-secondary uppercase tracking-wider">
                          Herramientas ({log.herramientas.length})
                        </span>
                        <div className="mt-1 space-y-1">
                          {log.herramientas.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-[0.55rem] bg-cm-bg-alt rounded-lg px-2.5 py-1.5">
                              <span className={`w-1 h-1 rounded-full shrink-0 ${h.success ? 'bg-cm-success' : 'bg-cm-error'}`} />
                              <span className="font-mono font-medium text-cm-text">{h.herramienta}</span>
                              <span className="text-cm-text-tertiary">{h.duracion_ms ? `${h.duracion_ms}ms` : ''}</span>
                              {h.resultado && (
                                <span className="text-cm-text-secondary truncate max-w-[200px]">
                                  → {typeof h.resultado === 'string' ? h.resultado.slice(0, 80) : JSON.stringify(h.resultado).slice(0, 80)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
