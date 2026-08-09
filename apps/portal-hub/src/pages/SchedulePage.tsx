import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import { getSchedule } from '../lib/employeeService';
import type { Employee } from '../types';

interface SchedulePageProps {
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

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_LABELS: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', domingo: 'Dom' };

function todayDayName() {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days[new Date().getDay()];
}

type ScheduleData = Record<string, { entry?: string; exit?: string }>;

export default function SchedulePage({ employee, branchId }: SchedulePageProps) {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employee?.id) { setLoading(false); setError('Empleado no disponible'); return; }
    getSchedule(employee.id, branchId)
      .then((data) => {
        setSchedule(data as ScheduleData);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar horario');
        setLoading(false);
      });
  }, [employee.id, branchId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-cm-text">Horarios</h2>
        <div className="animate-pulse space-y-2">
          {DAYS.map(d => (
            <div key={d} className="h-16 bg-cm-surface border border-cm-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-cm-text">Horarios</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-cm-warning mb-3" />
          <p className="text-sm font-semibold text-cm-text">Error</p>
          <p className="text-xs text-cm-text-secondary mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-cm-text">Horarios</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="w-10 h-10 text-cm-muted mb-3" />
          <p className="text-sm font-semibold text-cm-text">Sin horarios</p>
          <p className="text-xs text-cm-text-secondary mt-1">No hay horarios asignados para este empleado.</p>
        </div>
      </div>
    );
  }

  const today = todayDayName();

  return (
    <div className="space-y-4">
      <motion.div variants={iv} initial="hidden" animate="show">
        <h2 className="text-xl font-bold text-cm-text">Horarios</h2>
        <p className="text-xs text-cm-text-secondary mt-0.5">Turnos semanales</p>
      </motion.div>

      <motion.div variants={cv} initial="hidden" animate="show" className="space-y-2">
        {DAYS.map((day) => {
          const daySchedule = schedule?.[day];
          const isToday = day === today;
          return (
            <motion.div
              key={day}
              variants={iv}
              className={`bg-cm-surface border rounded-xl p-4 flex items-center justify-between ${
                isToday ? 'border-cm-accent' : 'border-cm-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${daySchedule ? 'bg-cm-success' : 'bg-cm-border'}`} />
                <div>
                  <div className="text-sm font-semibold text-cm-text">
                    {DAY_LABELS[day]}
                    {isToday && <span className="ml-2 text-[10px] font-medium text-cm-accent uppercase">Hoy</span>}
                  </div>
                  {daySchedule && (
                    <div className="text-xs text-cm-text-secondary mt-0.5">
                      {daySchedule.entry || '—'} — {daySchedule.exit || '—'}
                    </div>
                  )}
                </div>
              </div>
              {!daySchedule && (
                <span className="text-xs text-cm-text-tertiary">Libre</span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
