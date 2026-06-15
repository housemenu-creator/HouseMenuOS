import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, AlertTriangle, Target, CheckCircle2, Circle } from 'lucide-react';
import { subscribeGoals } from '../lib/employeeService';

export default function TasksPage({ employee, branchId }) {
  const [state, setState] = useState('loading'); // loading | empty | error | populated
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }

    const unsub = subscribeGoals(employee.id, branchId, (data) => {
      setGoals(data || []);
      setState(data && data.length > 0 ? 'populated' : 'empty');
    });

    return unsub;
  }, [employee?.id, branchId]);

  const pending = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin tareas asignadas</h2>
        <p className="text-sm text-cm-text-secondary mt-1 max-w-sm">Las tareas y objetivos aparecen acá cuando el administrador las asigne.</p>
      </div>
    );
  }

  // ── Error ──
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error-soft flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se pudieron obtener las tareas.</p>
      </div>
    );
  }

  // ── Populated ──
  return (
    <div className="space-y-8">
      {/* Pending */}
      <div>
        <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-3">
          Pendientes ({pending.length})
        </h2>
        <div className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-cm-text-tertiary text-center py-6">Todo al día 🎉</p>
          ) : (
            pending.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4 flex items-start gap-3"
              >
                <Circle className="w-5 h-5 text-cm-text-tertiary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-cm-text">{goal.title || 'Sin título'}</div>
                  {goal.description && (
                    <div className="text-xs text-cm-text-secondary mt-0.5">{goal.description}</div>
                  )}
                  {goal.dueDate && (
                    <div className="text-[0.65rem] text-cm-warning mt-1 font-medium">
                      Vence: {new Date(goal.dueDate).toLocaleDateString('es-PE')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-cm-text-secondary uppercase tracking-wider mb-3">
            Completadas ({completed.length})
          </h2>
          <div className="space-y-1.5">
            {completed.map((goal) => (
              <div
                key={goal.id}
                className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-3 flex items-start gap-3 opacity-60"
              >
                <CheckCircle2 className="w-4 h-4 text-cm-success shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm text-cm-text line-through">{goal.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
