import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import { getSchedule } from '../../lib/empleadoService';

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_LABELS = { lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', domingo: 'Dom' };

function todayDayName() { return ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date().getDay()]; }

export default function Horarios({ employee, branchId }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employee?.id) { setLoading(false); setError('Empleado no disponible'); return; }
    getSchedule(employee.id, branchId)
      .then(d => { setSchedule(d); setLoading(false); })
      .catch(() => { setError('Error al cargar horario'); setLoading(false); });
  }, [employee.id, branchId]);

  if (loading) return <div className="space-y-4"><h2 className="text-xl font-bold text-cm-text">Horarios</h2><div className="animate-pulse space-y-2">{DAYS.map(d => <div key={d} className="h-16 bg-cm-surface border border-cm-border rounded-xl" />)}</div></div>;
  if (error) return <div className="space-y-4"><h2 className="text-xl font-bold text-cm-text">Horarios</h2><div className="flex flex-col items-center py-16"><AlertTriangle className="w-10 h-10 text-cm-warning mb-3" /><p className="text-sm">{error}</p></div></div>;
  if (!schedule) return <div className="space-y-4"><h2 className="text-xl font-bold text-cm-text">Horarios</h2><div className="flex flex-col items-center py-16"><CalendarDays className="w-10 h-10 text-cm-muted mb-3" /><p className="text-sm">Sin horarios asignados</p></div></div>;

  const today = todayDayName();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cm-text">Horarios</h2>
      <p className="text-xs text-cm-text-secondary mt-0.5">Turnos semanales</p>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const ds = schedule?.[day];
          const isToday = day === today;
          return (
            <div key={day} className={`bg-cm-surface border rounded-xl p-4 flex items-center justify-between ${isToday ? 'border-cm-accent' : 'border-cm-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${ds ? 'bg-cm-success' : 'bg-cm-border'}`} />
                <div>
                  <div className="text-sm font-semibold text-cm-text">{DAY_LABELS[day]}{isToday && <span className="ml-2 text-[10px] font-medium text-cm-accent uppercase">Hoy</span>}</div>
                  {ds && <div className="text-xs text-cm-text-secondary mt-0.5">{ds.entry || '—'} — {ds.exit || '—'}</div>}
                </div>
              </div>
              {!ds && <span className="text-xs text-cm-text-tertiary">Libre</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
