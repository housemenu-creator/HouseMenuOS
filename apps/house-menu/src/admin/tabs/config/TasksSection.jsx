/**
 * Tasks Section — live list of scheduler tasks with toggle.
 */

import { useState, useEffect } from 'react';
import { Bot, ToggleLeft, ToggleRight, Loader2, AlertTriangle } from 'lucide-react';
import { subscribeTasks, toggleTask } from './configService';

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function TasksSection() {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const unsub = subscribeTasks((data, err) => {
      if (err) { setError(err); return; }
      setTasks(data);
    });
    return unsub;
  }, []);

  const handleToggle = async (id, currentActive) => {
    setToggling(id);
    await toggleTask(id, currentActive);
    setToggling(null);
  };

  // Loading state
  if (!tasks && !error) {
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
        <p className="text-xs text-cm-text-secondary">Error al cargar tareas: {error.message || 'Error desconocido'}</p>
      </div>
    );
  }

  const entries = Object.entries(tasks);

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <Bot className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-cm-text mb-1">Sin tareas configuradas</h3>
        <p className="text-xs text-cm-text-secondary">Las tareas del agente aparecerán aquí cuando el scheduler las cree automáticamente.</p>
      </div>
    );
  }

  const activeCount = entries.filter(([, t]) => t.activa !== false).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider">
          {activeCount} activas de {entries.length} totales
        </span>
      </div>

      <div className="space-y-1.5">
        {entries.map(([id, task]) => {
          const activa = task.activa !== false;
          const isCondition = task.tipo === 'condicion';
          const isProgrammed = task.tipo === 'programada';
          const isToggling = toggling === id;
          const lastResult = task.ultimo_resultado;

          return (
            <div key={id}
              className={`bg-cm-surface border rounded-xl p-3.5 transition-all duration-200 ${
                activa ? 'border-cm-border' : 'border-cm-border/30 opacity-60'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title + badges */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="font-semibold text-xs text-cm-text font-mono">{id}</span>
                    {isCondition && (
                      <span className="text-[0.5rem] font-semibold bg-cm-info/10 text-cm-info px-1.5 py-0.5 rounded uppercase tracking-wider">Condición</span>
                    )}
                    {isProgrammed && (
                      <span className="text-[0.5rem] font-semibold bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded uppercase tracking-wider">Programada</span>
                    )}
                    {task.canal && (
                      <span className="text-[0.5rem] font-semibold bg-cm-bg-alt text-cm-text-secondary px-1.5 py-0.5 rounded uppercase tracking-wider">{task.canal}</span>
                    )}
                    {lastResult && (
                      <span className={`text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full ${
                        lastResult.estado === 'ok' ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'
                      }`}>
                        {lastResult.estado === 'ok' ? '✓ Última: OK' : '✗ Última: Error'}
                      </span>
                    )}
                  </div>

                  {/* Instruction */}
                  <p className="text-[0.6rem] text-cm-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                    {task.instruccion}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[0.5rem] text-cm-text-tertiary font-mono">
                    {task.ultima_ejecucion && (
                      <span>▶ Ejecutada: {fmtTime(task.ultima_ejecucion)}</span>
                    )}
                    {isCondition && task.condicion_tipo && (
                      <span>⚡ {task.condicion_tipo}{task.condicion_params?.minutos ? ` >${task.condicion_params.minutos}min` : ''}</span>
                    )}
                    {isProgrammed && task.cada_minutos && (
                      <span>🔄 Cada {task.cada_minutos}min</span>
                    )}
                    {task.tools_permitidas?.length > 0 && (
                      <span>🔧 {task.tools_permitidas.length} tool(s)</span>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(id, activa)}
                  disabled={isToggling}
                  className={`p-1.5 rounded-lg transition-all shrink-0 ${
                    isToggling ? 'animate-pulse' :
                    activa ? 'text-cm-success hover:bg-cm-success/10' : 'text-cm-text-tertiary hover:bg-cm-bg-alt'
                  }`}
                  title={activa ? 'Desactivar tarea' : 'Activar tarea'}>
                  {activa ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
