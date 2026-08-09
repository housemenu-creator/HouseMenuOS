import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { tenantRef } from '../../../lib/tenantService';
import { clockIn, clockOut, getAttendanceHistory } from '../../../lib/employeeService';
import { todayISO } from '../../../lib/format';
import { Clock, Play, Square, Timer, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number | null): string {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  currentTime: Date;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AttendanceCard({ currentTime }: Props) {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();

  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Toast ──
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Suscripciones Firebase ──
  useEffect(() => {
    if (!activeBranchId || !user?.id) return;
    const today = todayISO();
    try {
      const attRef = tenantRef(`employees/${user.id}/attendance/${today}`);
      const unsubAtt = onValue(attRef, (snap) => setTodayAttendance(snap.val()), (err) => showToast('Error al cargar asistencia: ' + err.message, false));
      getAttendanceHistory(activeBranchId, user.id)
        .then((h) => setAttendanceHistory(h.slice(0, 5)))
        .catch(() => {});
      return () => { unsubAtt(); };
    } catch (err: any) {
      showToast('Error al conectar con asistencia', false);
    }
  }, [activeBranchId, user?.id]);

  // ── Clock In / Out ──
  const handleClockIn = async () => {
    if (!activeBranchId || !user?.id || attendanceLoading) return;
    setAttendanceLoading(true);
    try {
      const rec = await clockIn(activeBranchId, user.id);
      setTodayAttendance(rec);
      const h = await getAttendanceHistory(activeBranchId, user.id);
      setAttendanceHistory(h.slice(0, 5));
      showToast('¡Turno iniciado con éxito! 🟢');
    } catch {
      showToast('Error al iniciar el turno', false);
    }
    setAttendanceLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeBranchId || !user?.id || attendanceLoading) return;
    setAttendanceLoading(true);
    try {
      const rec = await clockOut(activeBranchId, user.id);
      setTodayAttendance(rec);
      const h = await getAttendanceHistory(activeBranchId, user.id);
      setAttendanceHistory(h.slice(0, 5));
      showToast('Turno finalizado. ¡Hasta pronto! 🔴');
    } catch {
      showToast('Error al finalizar el turno', false);
    }
    setAttendanceLoading(false);
  };

  // ── Derivados ──
  const isInShift = !!todayAttendance?.clockIn && !todayAttendance?.clockOut;
  const shiftDuration = isInShift ? formatDuration(Date.now() - todayAttendance.clockIn) : null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-cm-lg border flex items-center gap-2 animate-slide-up ${
          toast.ok
            ? 'bg-cm-success/15 border-cm-success/30 text-cm-success'
            : 'bg-cm-error/15 border-cm-error/30 text-cm-error'
        }`}>
          {toast.ok
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      {/* ── CONTROL DE ASISTENCIA (2 cols) ── */}
      <div className="md:col-span-2 bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-0.5">Control de Asistencia</span>
            <h2 className="text-sm font-bold text-cm-text">Tu Turno de Hoy</h2>
          </div>
          <div className="flex items-center gap-1.5 text-cm-accent bg-cm-accent/5 px-2.5 py-1 rounded-lg border border-cm-accent/15 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            {currentTime.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-cm-bg-alt border border-cm-border rounded-xl">
          <div className="flex-1 text-center sm:text-left space-y-1">
            {todayAttendance?.clockIn ? (
              <>
                <p className="text-sm font-black text-cm-success flex items-center gap-1.5 justify-center sm:justify-start">
                  <span className={`w-2.5 h-2.5 rounded-full ${isInShift ? 'bg-cm-success animate-pulse' : 'bg-cm-border'}`} />
                  {isInShift ? 'En Turno Activo' : 'Turno Completado'}
                </p>
                <p className="text-[11px] text-cm-text-secondary">
                  Entrada: <strong>{formatTime(todayAttendance.clockIn)}</strong>
                  {todayAttendance.clockOut && (
                    <> · Salida: <strong>{formatTime(todayAttendance.clockOut)}</strong></>
                  )}
                </p>
                {isInShift && shiftDuration && (
                  <p className="text-[11px] text-cm-accent font-bold flex items-center gap-1">
                    <Timer className="w-3 h-3" /> {shiftDuration} trabajando
                  </p>
                )}
                {todayAttendance.clockOut && (
                  <p className="text-[11px] text-cm-muted">
                    Duración: <strong>{formatDuration(todayAttendance.clockOut - todayAttendance.clockIn)}</strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-black text-cm-error flex items-center gap-1.5 justify-center sm:justify-start">
                  <span className="w-2.5 h-2.5 rounded-full bg-cm-error" />
                  Fuera de Turno
                </p>
                <p className="text-[11px] text-cm-muted">No has marcado tu entrada hoy.</p>
              </>
            )}
          </div>

          <div className="w-full sm:w-auto">
            {isInShift ? (
              <button
                onClick={handleClockOut}
                disabled={attendanceLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                <Square className="w-4 h-4 fill-white" />
                Terminar Turno
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={!!todayAttendance?.clockOut || attendanceLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                <Play className="w-4 h-4 fill-white" />
                Iniciar Turno
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── HISTORIAL DE ASISTENCIAS ── */}
      <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm">
        <span className="text-[10px] font-black text-cm-muted uppercase tracking-widest block mb-1">Registro</span>
        <h2 className="text-sm font-bold text-cm-text mb-3">Turnos Recientes</h2>
        <div className="space-y-2">
          {attendanceHistory.length === 0 ? (
            <div className="text-center py-5 border border-dashed border-cm-border rounded-xl">
              <Calendar className="w-4 h-4 text-cm-muted mx-auto mb-1 opacity-40" />
              <p className="text-[11px] text-cm-muted">Sin registros previos</p>
            </div>
          ) : (
            attendanceHistory.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-cm-bg-alt/50 border border-cm-border/50 rounded-xl">
                <div>
                  <p className="text-[11px] font-bold text-cm-text capitalize">
                    {new Date(item.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-cm-muted font-mono">
                    {formatTime(item.clockIn)} – {formatTime(item.clockOut)}
                  </p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  item.clockOut
                    ? 'bg-cm-border/50 text-cm-muted border-cm-border'
                    : 'bg-cm-success/10 text-cm-success border-cm-success/20'
                }`}>
                  {item.clockOut ? formatDuration(item.clockOut - item.clockIn) : 'Activo'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
