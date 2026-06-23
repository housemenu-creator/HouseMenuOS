import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, Timer, TimerOff, AlertTriangle } from 'lucide-react';
import { subscribeAttendanceHistory } from './employeeService';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

function formatDuration(ms: number) {
  if (!ms || ms < 0) return '—';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

interface AttendanceViewProps {
  uid: string;
}

export default function AttendanceView({ uid }: AttendanceViewProps) {
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'populated'>('loading');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!uid) { setState('error'); return; }

    const unsub = subscribeAttendanceHistory(uid, (data) => {
      setRecords(data || []);
      setState(Array.isArray(data) && data.length > 0 ? 'populated' : 'empty');
    });

    return unsub;
  }, [uid]);

  // Filter by selected month
  const filtered = records.filter((r) => (r.date as string)?.startsWith(filterMonth));

  // Compute stats for filtered month
  const totalDays = filtered.length;
  const totalGross = filtered.reduce((acc, r) => {
    const rec = r as { clockIn?: number; clockOut?: number; breakMinutes?: number };
    if (rec.clockIn && rec.clockOut) {
      return acc + (rec.clockOut - rec.clockIn);
    }
    return acc;
  }, 0);
  const totalBreak = filtered.reduce((acc, r) => {
    const rec = r as { breakMinutes?: number };
    return acc + ((rec.breakMinutes || 0) * 60000);
  }, 0);
  const totalNet = Math.max(0, totalGross - totalBreak);
  const avgHours = totalDays > 0 ? totalNet / totalDays : 0;

  // Available months from data
  const availableMonths = [...new Set(records.map((r) => (r.date as string)?.slice(0, 7)))] as string[];
  availableMonths.sort().reverse();

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-16 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Sin registros</h2>
        <p className="text-sm text-cm-text-secondary mt-1 max-w-sm">
          Todavía no tenés fichadas registradas. Los días que fichen van a aparecer acá.
        </p>
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
        <p className="text-sm text-cm-text-secondary mt-1">No se pudo obtener el historial.</p>
      </div>
    );
  }

  // ── Populated ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-[--cm-radius-sm] bg-cm-info-soft flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-cm-info" />
            </div>
            <div className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider">Días</div>
          </div>
          <div className="text-xl font-bold text-cm-text tabular-nums">{totalDays}</div>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-[--cm-radius-sm] bg-cm-warning-soft flex items-center justify-center">
              <Timer className="w-3.5 h-3.5 text-cm-warning" />
            </div>
            <div className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider">Bruto</div>
          </div>
          <div className="text-xl font-bold text-cm-text tabular-nums">{formatDuration(totalGross)}</div>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-[--cm-radius-sm] bg-cm-accent-light flex items-center justify-center">
              <TimerOff className="w-3.5 h-3.5 text-cm-accent" />
            </div>
            <div className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider">Refrigerio</div>
          </div>
          <div className="text-xl font-bold text-cm-text tabular-nums">{formatDuration(totalBreak) || '0m'}</div>
        </div>

        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-[--cm-radius-sm] bg-cm-success-soft flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-cm-success" />
            </div>
            <div className="text-[0.55rem] font-semibold text-cm-text-secondary uppercase tracking-wider">Neto</div>
          </div>
          <div className="text-xl font-bold text-cm-text tabular-nums">{formatDuration(totalNet)}</div>
        </div>
      </div>

      {/* Month filter */}
      {availableMonths.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableMonths.map((m) => {
            const [y, mo] = m.split('-');
            const label = `${MONTHS[parseInt(mo) - 1]} ${y}`;
            return (
              <button
                key={m}
                onClick={() => setFilterMonth(m)}
                className={`px-3 py-1.5 rounded-[--cm-radius-md] text-xs font-semibold whitespace-nowrap transition-all ${
                  filterMonth === m
                    ? 'bg-cm-accent-light text-cm-primary'
                    : 'bg-cm-surface border border-cm-border text-cm-text-secondary hover:bg-cm-surface-hover'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Records list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-cm-text-secondary">
            No hay registros en este mes.
          </div>
        ) : (
          filtered.map((record) => {
            const rec = record as { date: string; clockIn?: number; clockOut?: number; breakMinutes?: number };
            const d = new Date(rec.date + 'T00:00:00');
            const dayName = d.toLocaleDateString('es-PE', { weekday: 'long' });
            const dayNum = d.getDate();
            const isComplete = rec.clockIn && rec.clockOut;
            const grossDuration = isComplete
              ? rec.clockOut! - rec.clockIn!
              : 0;
            const breakMs = (rec.breakMinutes || 0) * 60000;
            const netDuration = Math.max(0, grossDuration - breakMs);

            return (
              <div
                key={rec.date}
                className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-4 flex items-center gap-4"
              >
                {/* Date badge */}
                <div className="w-12 text-center shrink-0">
                  <div className="text-xs text-cm-text-secondary capitalize">{dayName.slice(0, 3)}</div>
                  <div className="text-lg font-bold text-cm-text tabular-nums">{dayNum}</div>
                </div>

                {/* Times */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-sm">
                    {rec.clockIn ? (
                      <span className="text-cm-text">
                        {new Date(rec.clockIn!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-cm-text-tertiary">—</span>
                    )}
                    <span className="text-cm-text-tertiary">→</span>
                    {rec.clockOut ? (
                      <span className="text-cm-text">
                        {new Date(rec.clockOut!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-cm-accent font-semibold">En curso</span>
                    )}
                  </div>
                  {isComplete && (
                    <div className="flex items-center gap-2 text-[0.6rem] text-cm-text-secondary mt-0.5">
                      <span>Bruto: {formatDuration(grossDuration)}</span>
                      {rec.breakMinutes > 0 && <span>· Break: {rec.breakMinutes}m</span>}
                      <span className="font-semibold text-cm-text">· Neto: {formatDuration(netDuration)}</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span className={`cm-badge shrink-0 ${
                  isComplete ? 'cm-badge--success' : 'cm-badge--warning'
                }`}>
                  {isComplete ? 'Completo' : 'Parcial'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
