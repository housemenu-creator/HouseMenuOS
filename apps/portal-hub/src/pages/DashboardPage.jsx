import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, TimerOff, RefreshCw, Inbox, CalendarDays, AlertCircle } from 'lucide-react';
import { clockIn, clockOut, subscribeAttendance } from '../lib/employeeService';

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function DashboardPage({ employee, branchId }) {
  const [state, setState] = useState('loading'); // loading | empty | error | populated
  const [attendance, setAttendance] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(null);

  // Subscribe to real-time attendance
  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }

    const unsub = subscribeAttendance(employee.id, branchId, (data) => {
      setAttendance(data);
      setState(data ? 'populated' : 'empty');
      setError('');
    });

    return unsub;
  }, [employee?.id, branchId]);

  // Tick elapsed timer every second when clocked in
  useEffect(() => {
    if (attendance?.clockIn && !attendance?.clockOut) {
      const updateElapsed = () => {
        setElapsed(Date.now() - new Date(attendance.clockIn).getTime());
      };
      updateElapsed();
      elapsedRef.current = setInterval(updateElapsed, 1000);
      return () => clearInterval(elapsedRef.current);
    } else {
      clearInterval(elapsedRef.current);
      if (attendance?.clockIn && attendance?.clockOut) {
        setElapsed(new Date(attendance.clockOut).getTime() - new Date(attendance.clockIn).getTime());
      }
    }
  }, [attendance?.clockIn, attendance?.clockOut]);

  const handleClockIn = useCallback(async () => {
    setActionLoading(true);
    setError('');
    try {
      await clockIn(employee.id, branchId);
    } catch (e) {
      console.error('clockIn error:', e);
      setError('No se pudo fichar entrada. Verificá la conexión.');
    } finally {
      setActionLoading(false);
    }
  }, [employee?.id, branchId]);

  const handleClockOut = useCallback(async () => {
    setActionLoading(true);
    setError('');
    try {
      await clockOut(employee.id, branchId);
    } catch (e) {
      console.error('clockOut error:', e);
      setError('No se pudo fichar salida. Verificá la conexión.');
    } finally {
      setActionLoading(false);
    }
  }, [employee?.id, branchId]);

  const isClockedIn = attendance?.clockIn && !attendance?.clockOut;
  const isComplete = attendance?.clockIn && attendance?.clockOut;

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5 animate-pulse">
              <div className="h-3 w-16 bg-cm-border rounded mb-3" />
              <div className="h-8 w-24 bg-cm-border rounded" />
            </div>
          ))}
        </div>
        <div className="h-48 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] animate-pulse" />
      </div>
    );
  }

  // ── Error ──
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error-soft flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se pudieron obtener los datos.</p>
        <button onClick={() => window.location.reload()} className="cm-btn cm-btn--primary mt-6">
          Reintentar
        </button>
      </div>
    );
  }

  // ── Empty (no attendance today) ──
  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <ErrorBanner error={error} onDismiss={() => setError('')} />

        {/* Clock button — big prominent */}
        <div className="flex flex-col items-center justify-center py-16 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg]">
          <div className="w-20 h-20 rounded-full bg-cm-success-soft flex items-center justify-center mb-5">
            <TimerOff className="w-10 h-10 text-cm-success" />
          </div>
          <h2 className="text-xl font-bold text-cm-text mb-1">No fichaste hoy</h2>
          <p className="text-sm text-cm-text-secondary mb-8">Presioná el botón para marcar entrada</p>
          <button
            onClick={handleClockIn}
            disabled={actionLoading}
            className="cm-btn cm-btn--success cm-btn--lg"
          >
            {actionLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Timer className="w-5 h-5" />
            )}
            Marcar Entrada
          </button>
        </div>

        <TodaySummary employee={employee} attendance={attendance} />
      </div>
    );
  }

  // ── Populated ──
  return (
    <div className="space-y-6">
      <ErrorBanner error={error} onDismiss={() => setError('')} />

      {/* Clock card */}
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Status icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isClockedIn ? 'bg-cm-success-soft' : isComplete ? 'bg-cm-info-soft' : 'bg-cm-bg-alt'
          }`}>
            {isClockedIn ? (
              <Timer className="w-10 h-10 text-cm-success" />
            ) : isComplete ? (
              <TimerOff className="w-10 h-10 text-cm-info" />
            ) : (
              <Clock className="w-10 h-10 text-cm-text-secondary" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-cm-text">
              {isClockedIn ? 'Jornada en curso' : isComplete ? 'Jornada completada' : 'Sin fichar'}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-cm-text-secondary">
              {attendance?.clockIn && (
                <span>Entrada: {new Date(attendance.clockIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {attendance?.clockOut && (
                <span>Salida: {new Date(attendance.clockOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
            {isClockedIn && (
              <div className="mt-2">
                <span className="text-3xl font-bold text-cm-primary tabular-nums">
                  {formatDuration(elapsed)}
                </span>
                <span className="text-sm text-cm-text-secondary ml-2">trabajados</span>
              </div>
            )}
            {isComplete && (
              <div className="mt-2">
                <span className="text-2xl font-bold text-cm-info tabular-nums">
                  {formatDuration(elapsed)}
                </span>
                <span className="text-sm text-cm-text-secondary ml-2">total del día</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {isClockedIn ? (
              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="cm-btn cm-btn--error cm-btn--lg"
              >
                {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TimerOff className="w-5 h-5" />}
                Marcar Salida
              </button>
            ) : isComplete ? (
              <div className="cm-badge cm-badge--info text-sm px-4 py-2">Completado</div>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="cm-btn cm-btn--success cm-btn--lg"
              >
                {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
                Marcar Entrada
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Today's summary */}
      <TodaySummary employee={employee} attendance={attendance} />
    </div>
  );
}

function ErrorBanner({ error, onDismiss }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="flex items-center gap-3 text-sm text-cm-error bg-cm-error-soft rounded-[--cm-radius-md] px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={onDismiss} className="text-cm-error hover:text-cm-text font-bold text-lg leading-none">&times;</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TodaySummary({ employee, attendance }) {
  const now = new Date();
  const dayName = now.toLocaleDateString('es-PE', { weekday: 'long' });
  const dayNum = now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-[--cm-radius-sm] bg-cm-accent-light flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-cm-accent" />
          </div>
          <div>
            <div className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Día</div>
            <div className="text-sm font-semibold text-cm-text capitalize">{dayName} {dayNum}</div>
          </div>
        </div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-[--cm-radius-sm] bg-cm-info-soft flex items-center justify-center">
            <Clock className="w-4 h-4 text-cm-info" />
          </div>
          <div>
            <div className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Rol</div>
            <div className="text-sm font-semibold text-cm-text">{employee?.role || '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-[--cm-radius-sm] flex items-center justify-center ${
            attendance?.clockIn ? 'bg-cm-success-soft' : 'bg-cm-bg-alt'
          }`}>
            <Inbox className={`w-4 h-4 ${attendance?.clockIn ? 'text-cm-success' : 'text-cm-text-secondary'}`} />
          </div>
          <div>
            <div className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Estado</div>
            <div className="text-sm font-semibold text-cm-text">
              {attendance?.clockIn && !attendance?.clockOut ? 'En jornada' :
               attendance?.clockIn && attendance?.clockOut ? 'Completado' : 'Sin fichar'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
