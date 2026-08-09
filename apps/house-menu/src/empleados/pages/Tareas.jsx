import { useState, useEffect } from 'react';
import { ListChecks, AlertTriangle, Target, CheckCircle2, Circle } from 'lucide-react';
import AnimatedCounter from '@house/ui/src/components/AnimatedCounter';
import { subscribeGoals } from '../../lib/empleadoService';

export default function Tareas({ employee, branchId }) {
  const [goals, setGoals] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }
    const unsub = subscribeGoals(employee.id, branchId, (data) => {
      setGoals(data);
      setState(data.length === 0 ? 'empty' : 'populated');
    });
    return () => unsub();
  }, [employee.id, branchId]);

  const pending = goals.filter(g => !g.completed).length;
  const completed = goals.filter(g => g.completed).length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cm-text">Tareas</h2>
      <p className="text-xs text-cm-text-secondary mt-0.5">Metas y objetivos</p>

      {state === 'error' && <div className="flex flex-col items-center py-16"><AlertTriangle className="w-10 h-10 text-cm-warning mb-3" /><p className="text-sm">Error al cargar</p></div>}
      {state === 'empty' && <div className="flex flex-col items-center py-16"><ListChecks className="w-10 h-10 text-cm-muted mb-3" /><p className="text-sm">Sin tareas asignadas</p></div>}
      {state === 'loading' && <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-cm-surface border border-cm-border rounded-xl" />)}</div>}

      {state === 'populated' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-warning"><AnimatedCounter value={pending} /></div>
              <div className="text-xs text-cm-text-secondary mt-1">Pendientes</div>
            </div>
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-success"><AnimatedCounter value={completed} /></div>
              <div className="text-xs text-cm-text-secondary mt-1">Completadas</div>
            </div>
          </div>

          <div className="space-y-2">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-3">
                {goal.completed ? <CheckCircle2 className="w-5 h-5 text-cm-success shrink-0" /> : <Circle className="w-5 h-5 text-cm-text-tertiary shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${goal.completed ? 'text-cm-text-tertiary line-through' : 'text-cm-text'}`}>{goal.title}</div>
                  {goal.dueDate && <div className="text-xs text-cm-text-secondary mt-0.5"><Target className="w-3 h-3 inline-block mr-1" />Vence: {new Date(goal.dueDate).toLocaleDateString('es-ES')}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
