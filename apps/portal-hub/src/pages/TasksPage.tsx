import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, AlertTriangle, Target, CheckCircle2, Circle } from 'lucide-react';
import AnimatedCounter from '@house/ui/src/components/AnimatedCounter';
import { subscribeGoals } from '../lib/employeeService';
import type { Employee, Goal } from '../types';

interface TasksPageProps {
  employee: Employee;
  branchId: string;
}

const cv = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};
const iv = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

export default function TasksPage({ employee, branchId }: TasksPageProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [state, setState] = useState<'loading' | 'populated' | 'empty' | 'error'>('loading');

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }
    const unsub = subscribeGoals(employee.id, branchId, (data) => {
      if (data.length === 0) {
        setState('empty');
      } else {
        setGoals(data);
        setState('populated');
      }
    });
    return unsub;
  }, [employee.id, branchId]);

  const pending = goals.filter(g => !g.completed).length;
  const completed = goals.filter(g => g.completed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div variants={iv} initial="hidden" animate="show">
        <h2 className="text-xl font-bold text-cm-text">Tareas</h2>
        <p className="text-xs text-cm-text-secondary mt-0.5">Metas y objetivos</p>
      </motion.div>

      {/* State: error */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-cm-warning mb-3" />
          <p className="text-sm font-semibold text-cm-text">Error al cargar</p>
          <p className="text-xs text-cm-text-secondary mt-1">No se pudieron obtener las tareas</p>
        </div>
      )}

      {/* State: empty */}
      {state === 'empty' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="w-10 h-10 text-cm-muted mb-3" />
          <p className="text-sm font-semibold text-cm-text">Sin tareas</p>
          <p className="text-xs text-cm-text-secondary mt-1">No tenés tareas asignadas por ahora</p>
        </div>
      )}

      {/* State: loading */}
      {state === 'loading' && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-cm-surface border border-cm-border rounded-xl" />
          ))}
        </div>
      )}

      {/* Stats + List */}
      {state === 'populated' && (
        <>
          <motion.div
            variants={cv}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3"
          >
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-warning">
                <AnimatedCounter value={pending} />
              </div>
              <div className="text-xs text-cm-text-secondary mt-1">Pendientes</div>
            </motion.div>
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-success">
                <AnimatedCounter value={completed} />
              </div>
              <div className="text-xs text-cm-text-secondary mt-1">Completadas</div>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="popLayout">
            <motion.div
              variants={cv}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {goals.map((goal) => (
                <motion.div
                  key={goal.id}
                  layout
                  variants={iv}
                  className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-3"
                >
                  {goal.completed
                    ? <CheckCircle2 className="w-5 h-5 text-cm-success shrink-0" />
                    : <Circle className="w-5 h-5 text-cm-text-tertiary shrink-0" />
                  }
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${goal.completed ? 'text-cm-text-tertiary line-through' : 'text-cm-text'}`}>
                      {goal.title}
                    </div>
                    {goal.dueDate && (
                      <div className="text-xs text-cm-text-secondary mt-0.5">
                        <Target className="w-3 h-3 inline-block mr-1" />
                        Vence: {new Date(goal.dueDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
