import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer, TimerOff, RefreshCw, CalendarDays, AlertCircle } from 'lucide-react';
import AnimatedCounter from '@house/ui/src/components/AnimatedCounter';
import { clockIn, clockOut, subscribeAttendance } from '../../lib/empleadoService';

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

export default function Fichado({ employee, branchId }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeAttendance(employee.id, branchId, setAttendance);
    return () => unsub();
  }, [employee.id, branchId]);

  useEffect(() => {
    if (attendance?.clockIn && !attendance.clockOut) {
      const update = () => setElapsed(Date.now() - new Date(attendance.clockIn).getTime());
      update();
      timerRef.current = setInterval(update, 10000);
    } else { setElapsed(0); }
    return () => clearInterval(timerRef.current);
  }, [attendance?.clockIn, attendance?.clockOut]);

  const isClockedIn = !!attendance?.clockIn && !attendance?.clockOut;

  const handleAction = useCallback(async (action) => {
    setLoading(true); setError('');
    try {
      if (action === 'in') await clockIn(employee.id, branchId);
      else await clockOut(employee.id, branchId);
    } catch { setError(`Error al fichar ${action === 'in' ? 'entrada' : 'salida'}`); }
    finally { setLoading(false); }
  }, [employee.id, branchId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cm-text">Fichado</h2>
          <p className="text-xs text-cm-text-secondary mt-0.5">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-cm-muted"><RefreshCw className="w-3 h-3" />Tiempo real</div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-2xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isClockedIn ? 'bg-cm-success-soft' : 'bg-cm-accent-surface'}`}>
            {isClockedIn ? <Timer className="w-10 h-10 text-cm-success" /> : <TimerOff className="w-10 h-10 text-cm-accent" />}
          </div>
        </div>
        <div>
          <div className="text-3xl font-black text-cm-text">
            {attendance?.clockIn ? new Date(attendance.clockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
          <div className="text-xs text-cm-text-secondary mt-1">
            {isClockedIn ? `Llevás ${formatDuration(elapsed)}` : attendance?.clockOut ? `Saliste a las ${new Date(attendance.clockOut).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'No fichaste hoy'}
          </div>
        </div>
        {error && <div className="flex items-center justify-center gap-1.5 text-xs text-cm-error bg-cm-error-soft rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
        <div className="flex justify-center gap-3">
          {!attendance?.clockIn ? (
            <button onClick={() => handleAction('in')} disabled={loading} className="px-8 py-3 bg-cm-accent text-white font-bold rounded-xl hover:bg-cm-accent-hover transition-all active:scale-95 disabled:opacity-50">
              {loading ? 'Fichando...' : 'Fichar Entrada'}
            </button>
          ) : !attendance?.clockOut ? (
            <button onClick={() => handleAction('out')} disabled={loading} className="px-8 py-3 bg-cm-error text-white font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
              {loading ? 'Fichando...' : 'Fichar Salida'}
            </button>
          ) : <div className="text-sm text-cm-text-secondary">Jornada completada</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-cm-accent"><AnimatedCounter value={elapsed > 0 ? Math.floor(elapsed / 3600000) : 0} suffix="h" /></div>
          <div className="text-xs text-cm-text-secondary mt-1">Horas hoy</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-cm-accent"><AnimatedCounter value={attendance ? 1 : 0} /></div>
          <div className="text-xs text-cm-text-secondary mt-1">Fichadas</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-cm-text-tertiary"><AnimatedCounter value={0} /></div>
          <div className="text-xs text-cm-text-secondary mt-1">Atrasos</div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-cm-text-secondary"><CalendarDays className="w-3 h-3 inline-block mr-1" />{attendance?.status === 'presente' ? 'Presente ✅' : 'Sin fichar'}</p>
      </div>
    </div>
  );
}
