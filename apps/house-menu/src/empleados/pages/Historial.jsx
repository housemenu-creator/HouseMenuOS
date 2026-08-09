import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import AnimatedCounter from '@house/ui/src/components/AnimatedCounter';
import { subscribeAttendanceHistory } from '../../lib/empleadoService';

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function calcDuration(clockIn, clockOut) {
  if (!clockIn || !clockOut) return '—';
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

export default function Historial({ employee, branchId }) {
  const [records, setRecords] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }
    const unsub = subscribeAttendanceHistory(employee.id, branchId, (data) => {
      setRecords(data);
      setState(data.length === 0 ? 'empty' : 'populated');
    });
    return () => unsub();
  }, [employee.id, branchId]);

  const totalDays = records.length;
  const totalHours = records.reduce((acc, r) => r.clockIn && r.clockOut ? acc + (new Date(r.clockOut) - new Date(r.clockIn)) : acc, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cm-text">Historial de Asistencia</h2>
      <p className="text-xs text-cm-text-secondary mt-0.5">Últimos 30 días</p>

      {state === 'error' && <div className="flex flex-col items-center py-16"><AlertTriangle className="w-10 h-10 text-cm-warning mb-3" /><p className="text-sm font-semibold text-cm-text">Error al cargar</p></div>}
      {state === 'empty' && <div className="flex flex-col items-center py-16"><CalendarDays className="w-10 h-10 text-cm-muted mb-3" /><p className="text-sm font-semibold text-cm-text">Sin registros</p></div>}
      {state === 'loading' && <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-cm-surface border border-cm-border rounded-xl" />)}</div>}

      {state === 'populated' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent"><AnimatedCounter value={totalDays} /></div>
              <div className="text-xs text-cm-text-secondary mt-1">Días</div>
            </div>
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent"><AnimatedCounter value={Math.floor(totalHours / 3600000)} suffix="h" /></div>
              <div className="text-xs text-cm-text-secondary mt-1">Horas totales</div>
            </div>
            <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-cm-accent"><AnimatedCounter value={totalDays > 0 ? Math.floor(totalHours / totalDays / 3600000) : 0} suffix="h" /></div>
              <div className="text-xs text-cm-text-secondary mt-1">Promedio</div>
            </div>
          </div>

          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.date} className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${r.status === 'presente' ? 'bg-cm-success' : 'bg-cm-warning'}`} />
                  <div>
                    <div className="text-sm font-semibold text-cm-text">{new Date(r.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    <div className="text-xs text-cm-text-secondary flex items-center gap-2 mt-0.5"><Clock className="w-3 h-3" />{formatTime(r.clockIn)} — {formatTime(r.clockOut)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-cm-text">{calcDuration(r.clockIn, r.clockOut)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-cm-text-secondary mt-0.5">{r.status || 'completado'}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
