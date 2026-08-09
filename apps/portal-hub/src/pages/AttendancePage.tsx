import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, Timer, TimerOff, AlertTriangle } from 'lucide-react';
import AnimatedCounter from '@house/ui/src/components/AnimatedCounter';
import { subscribeAttendanceHistory } from '../lib/employeeService';
import type { Employee, Attendance } from '../types';

interface AttendancePageProps {
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

function formatTime(iso?: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function calcDuration(clockIn?: string, clockOut?: string) {
  if (!clockIn || !clockOut) return '—';
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function AttendancePage({ employee, branchId }: AttendancePageProps) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [state, setState] = useState<'loading' | 'populated' | 'empty' | 'error'>('loading');

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }
    const unsub = subscribeAttendanceHistory(employee.id, branchId, (data) => {
      if (data.length === 0) {
        setState('empty');
      } else {
        setRecords(data);
        setState('populated');
      }
    });
    return unsub;
  }, [employee.id, branchId]);

  const totalDays = records.length;
  const totalHours = records.reduce((acc, r) => {
    if (r.clockIn && r.clockOut) {
      return acc + (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime());
    }
    return acc;
  }, 0);
  const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div variants={iv} initial="hidden" animate="show">
        <h2 className="text-xl font-bold text-cm-text">Historial de Asistencia</h2>
        <p className="text-xs text-cm-text-secondary mt-0.5">Últimos 30 días</p>
      </motion.div>

      {/* State: error */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-cm-warning mb-3" />
          <p className="text-sm font-semibold text-cm-text">Error al cargar</p>
          <p className="text-xs text-cm-text-secondary mt-1">No se pudo obtener el historial</p>
        </div>
      )}

      {/* State: empty */}
      {state === 'empty' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="w-10 h-10 text-cm-muted mb-3" />
          <p className="text-sm font-semibold text-cm-text">Sin registros</p>
          <p className="text-xs text-cm-text-secondary mt-1">No hay fichadas en los últimos 30 días</p>
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

      {/* Stats */}
      {state === 'populated' && (
        <>
          <motion.div
            variants={cv}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3"
          >
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent">
                <AnimatedCounter value={totalDays} />
              </div>
              <div className="text-xs text-cm-text-secondary mt-1">Días</div>
            </motion.div>
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent">
                <AnimatedCounter value={Math.floor(totalHours / 3600000)} suffix="h" />
              </div>
              <div className="text-xs text-cm-text-secondary mt-1">Horas totales</div>
            </motion.div>
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent">
                <AnimatedCounter value={Math.floor(avgHours / 3600000)} suffix="h" />
              </div>
              <div className="text-xs text-cm-text-secondary mt-1">Promedio</div>
            </motion.div>
          </motion.div>

          {/* Records list */}
          <AnimatePresence mode="popLayout">
            <motion.div
              variants={cv}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {records.map((r) => (
                <motion.div
                  key={r.date}
                  layout
                  variants={iv}
                  className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${r.status === 'presente' ? 'bg-cm-success' : 'bg-cm-warning'}`} />
                    <div>
                      <div className="text-sm font-semibold text-cm-text">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-xs text-cm-text-secondary flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(r.clockIn)} — {formatTime(r.clockOut)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-cm-text">
                      {calcDuration(r.clockIn, r.clockOut)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-cm-text-secondary mt-0.5">
                      {r.status || 'completado'}
                    </div>
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
