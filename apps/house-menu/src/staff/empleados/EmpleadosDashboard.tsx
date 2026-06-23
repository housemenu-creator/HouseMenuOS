import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, TimerOff, Coffee, RefreshCw, Inbox, CalendarDays, AlertCircle, CheckCircle2, X, ListChecks, ClipboardCheck, MessageSquare, AlertTriangle } from 'lucide-react';
import { subscribeEmployee, subscribeAttendance, clockIn, clockOut, startBreak, endBreak, toggleChecklistItem, saveHandoverNotes, confirmHandover, reportIncident } from './employeeService';
import { subscribeAreas } from '../../lib/areaConfigService';

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export default function EmpleadosDashboard({ uid, branchId }) {
  const [state, setState] = useState('loading');
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [areas, setAreas] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Clock-in flow state
  const [showClockInFlow, setShowClockInFlow] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [clockInChecklistDone, setClockInChecklistDone] = useState({});

  // Clock-out flow state
  const [showClockOutFlow, setShowClockOutFlow] = useState(false);
  const [clockOutChecklistDone, setClockOutChecklistDone] = useState({});
  const [handoverNotes, setHandoverNotes] = useState('');
  const [showHandover, setShowHandover] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(null);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const breakRef = useRef(null);
  const [breakLoading, setBreakLoading] = useState(false);

  const att = attendance || {};
  const shiftChecklists = att.checklists || { inicio: {}, cierre: {} };
  const isClockedIn = att.clockIn && !att.clockOut;
  const isComplete = att.clockIn && att.clockOut;
  const isOnBreak = att.breakStart && !att.breakEnd;

  // Subscribe
  useEffect(() => {
    if (!uid) { setState('error'); return; }
    const unsubEmp = subscribeEmployee(uid, (data) => {
      if (data) setEmployee(data);
    });
    const unsubAtt = subscribeAttendance(uid, (data) => {
      setAttendance(data);
      setState(data ? 'populated' : 'empty');
      setError('');
    });
    const unsubAreas = branchId ? subscribeAreas(branchId, setAreas) : () => {};
    return () => { unsubEmp(); unsubAtt(); unsubAreas(); };
  }, [uid, branchId]);

  // Tick timer
  useEffect(() => {
    if (att.clockIn && !att.clockOut) {
      const update = () => setElapsed(Date.now() - att.clockIn);
      update();
      elapsedRef.current = setInterval(update, 1000);
      return () => clearInterval(elapsedRef.current);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (att.clockIn && att.clockOut) setElapsed(att.clockOut - att.clockIn);
    }
  }, [att.clockIn, att.clockOut]);

  // Break timer
  useEffect(() => {
    if (att.breakStart && !att.breakEnd) {
      const update = () => setBreakElapsed(Date.now() - att.breakStart);
      update();
      breakRef.current = setInterval(update, 1000);
      return () => clearInterval(breakRef.current);
    } else {
      if (breakRef.current) clearInterval(breakRef.current);
      if (att.breakStart && att.breakEnd) setBreakElapsed(att.breakEnd - att.breakStart);
      else setBreakElapsed(0);
    }
  }, [att.breakStart, att.breakEnd]);

  // ── Clock In handler ──────────────────────────────────
  const handleClockIn = useCallback(async () => {
    // If area not assigned and areas exist, show flow
    const areaList = Object.values(areas).filter(a => a.active !== false);
    if (areaList.length > 0 && !employee?.area) {
      setShowClockInFlow(true);
      return;
    }
    await doClockIn(employee?.area || '', employee?.station || '', null);
  }, [uid, employee, areas]);

  const doClockIn = async (area, station, template) => {
    setActionLoading(true);
    setError('');
    try {
      await clockIn(uid, area, station, template);
      setShowClockInFlow(false);
      setSelectedArea('');
      setSelectedStation('');
    } catch (e) {
      console.error('clockIn error:', e);
      setError('No se pudo fichar entrada. Verificá la conexión.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmClockInFlow = async () => {
    if (!selectedArea) return;
    const areaObj = Object.entries(areas).find(([, a]) => a.name === selectedArea)?.[1];
    const template = areaObj ? {
      name: areaObj.name,
      stations: areaObj.stations,
      checklists: areaObj.checklists,
    } : null;
    await doClockIn(selectedArea, selectedStation, template);
  };

  // ── Clock Out handler ─────────────────────────────────
  const handleClockOut = useCallback(async () => {
    setShowClockOutFlow(true);
  }, []);

  // ── Break handlers ────────────────────────────────────
  const handleStartBreak = useCallback(async () => {
    setBreakLoading(true);
    try {
      await startBreak(uid);
    } catch (e) {
      console.error('startBreak error:', e);
    } finally {
      setBreakLoading(false);
    }
  }, [uid]);

  const handleEndBreak = useCallback(async () => {
    setBreakLoading(true);
    try {
      await endBreak(uid);
    } catch (e) {
      console.error('endBreak error:', e);
    } finally {
      setBreakLoading(false);
    }
  }, [uid]);

  const confirmClockOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      if (handoverNotes.trim()) {
        await saveHandoverNotes(uid, handoverNotes);
      }
      await clockOut(uid);
      setShowClockOutFlow(false);
      setHandoverNotes('');
    } catch (e) {
      console.error('clockOut error:', e);
      setError('No se pudo fichar salida.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Checklist toggle ──────────────────────────────────
  const handleToggleItem = async (phase, itemId) => {
    try {
      await toggleChecklistItem(uid, phase, itemId);
    } catch (e) {
      console.error('toggle checklist error:', e);
    }
  };

  // ── Incident ──────────────────────────────────────────
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentDesc, setIncidentDesc] = useState('');
  const handleReportIncident = async () => {
    if (!incidentDesc.trim()) return;
    await reportIncident(uid, { type: 'other', description: incidentDesc });
    setIncidentDesc('');
    setShowIncidentForm(false);
  };

  // ── Checklist item checkboxes ─────────────────────────
  function ChecklistSection({ phase, items, readOnly }) {
    const list = items || {};
    const entries = Object.entries(list);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {entries.map(([id, item]) => {
          const checked = item?.done;
          return (
            <label key={id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              checked ? 'bg-cm-success/5 border-cm-success/20' : 'bg-cm-bg-alt border-cm-border'
            } ${readOnly ? 'cursor-default' : ''}`}>
              <input
                type="checkbox"
                checked={!!checked}
                onChange={() => !readOnly && handleToggleItem(phase, id)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-cm-border text-cm-accent focus:ring-cm-accent disabled:opacity-50"
              />
              <span className={`text-xs font-medium ${checked ? 'text-cm-success line-through' : 'text-cm-text'}`}>
                {item?.label || id}
              </span>
              {checked && item?.at && (
                <span className="ml-auto text-[10px] text-cm-text-tertiary">{fmtTime(item.at)}</span>
              )}
            </label>
          );
        })}
      </div>
    );
  }

  // ── Area / Station selector for clock-in flow ─────────
  const areaList = Object.values(areas).filter(a => a.active !== false);
  const currentAreaObj = areaList.find(a => a.name === selectedArea);
  const stations = currentAreaObj?.stations || [];

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
        <button onClick={() => window.location.reload()} className="cm-btn cm-btn--primary mt-6">Reintentar</button>
      </div>
    );
  }

  // ── Empty (no attendance today) ──
  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <ErrorBanner error={error} onDismiss={() => setError('')} />
        <div className="flex flex-col items-center justify-center py-16 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg]">
          <div className="w-20 h-20 rounded-full bg-cm-success-soft flex items-center justify-center mb-5">
            <TimerOff className="w-10 h-10 text-cm-success" />
          </div>
          <h2 className="text-xl font-bold text-cm-text mb-1">No fichaste hoy</h2>
          <p className="text-sm text-cm-text-secondary mb-8">Presioná el botón para marcar entrada</p>
          <button onClick={handleClockIn} disabled={actionLoading} className="cm-btn cm-btn--success cm-btn--lg">
            {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
            Marcar Entrada
          </button>
        </div>
        <TodaySummary employee={employee} attendance={attendance} branchId={branchId} />

        {/* Clock-in flow modal */}
        <AnimatePresence>
          {showClockInFlow && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClockInFlow(false)}>
              <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-cm-text flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-cm-accent" />
                    Iniciar turno
                  </h3>
                  <button onClick={() => setShowClockInFlow(false)} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
                </div>

                {/* Area selection */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Área</label>
                  <div className="grid grid-cols-2 gap-2">
                    {areaList.map(a => (
                      <button key={a.name} onClick={() => { setSelectedArea(a.name); setSelectedStation(''); }}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                          selectedArea === a.name
                            ? 'border-cm-accent bg-cm-accent/10 text-cm-accent'
                            : 'border-cm-border bg-cm-bg-alt text-cm-text hover:border-cm-accent/40'
                        }`}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Station selection */}
                {stations.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Estación</label>
                    <div className="flex flex-wrap gap-2">
                      {stations.map(s => (
                        <button key={s} onClick={() => setSelectedStation(s)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            selectedStation === s
                              ? 'border-cm-accent bg-cm-accent/10 text-cm-accent'
                              : 'border-cm-border bg-cm-bg-alt text-cm-text hover:border-cm-accent/40'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inicio checklist from template */}
                {currentAreaObj?.checklists?.inicio?.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Checklist de inicio</label>
                    <div className="space-y-1.5">
                      {currentAreaObj.checklists.inicio.map(item => (
                        <label key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-cm-bg-alt border-cm-border cursor-pointer transition-colors hover:border-cm-accent/30">
                          <input
                            type="checkbox"
                            checked={!!clockInChecklistDone[item.id]}
                            onChange={() => setClockInChecklistDone(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="w-4 h-4 rounded border-cm-border text-cm-accent focus:ring-cm-accent"
                          />
                          <span className="text-xs font-medium text-cm-text">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={confirmClockInFlow} disabled={!selectedArea || actionLoading}
                  className="w-full py-2.5 bg-cm-accent text-white text-sm font-bold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
                  Iniciar Turno
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Populated ──
  const hasInicioChecklist = Object.keys(shiftChecklists.inicio || {}).length > 0;
  const hasCierreChecklist = Object.keys(shiftChecklists.cierre || {}).length > 0;
  const inicioDone = Object.values(shiftChecklists.inicio || {}).every(i => i.done);

  return (
    <div className="space-y-6">
      <ErrorBanner error={error} onDismiss={() => setError('')} />

      {/* Clock card */}
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isClockedIn ? 'bg-cm-success-soft' : isComplete ? 'bg-cm-info-soft' : 'bg-cm-bg-alt'
          }`}>
            {isClockedIn ? <Timer className="w-10 h-10 text-cm-success" /> : isComplete ? <TimerOff className="w-10 h-10 text-cm-info" /> : <Clock className="w-10 h-10 text-cm-text-secondary" />}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-cm-text">
              {isClockedIn ? 'Jornada en curso' : isComplete ? 'Jornada completada' : 'Sin fichar'}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-cm-text-secondary">
              {att.clockIn && <span>Entrada: {fmtTime(att.clockIn)}</span>}
              {att.clockOut && <span>Salida: {fmtTime(att.clockOut)}</span>}
              {att.area && <span className="flex items-center gap-1"><Inbox className="w-3 h-3" />{att.area}{att.station ? ` · ${att.station}` : ''}</span>}
              {att.state && att.state !== 'active' && (
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  att.state === 'verified' ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-info/10 text-cm-info'
                }`}>{att.state}</span>
              )}
            </div>
            {isClockedIn && (
              <div className="mt-2">
                <span className="text-3xl font-bold text-cm-primary tabular-nums">{formatDuration(elapsed)}</span>
                <span className="text-sm text-cm-text-secondary ml-2">trabajados</span>
              </div>
            )}
            {isOnBreak && (
              <div className="mt-1">
                <span className="text-lg font-bold text-cm-warning tabular-nums">{formatDuration(breakElapsed)}</span>
                <span className="text-sm text-cm-warning ml-1">en refrigerio</span>
              </div>
            )}
            {isComplete && (
              <div className="mt-2">
                <span className="text-2xl font-bold text-cm-info tabular-nums">{formatDuration(elapsed)}</span>
                <span className="text-sm text-cm-text-secondary ml-2">total del día</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            {isClockedIn ? (
              <>
                {isOnBreak ? (
                  <button onClick={handleEndBreak} disabled={breakLoading} className="cm-btn cm-btn--success cm-btn--md">
                    {breakLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
                    Terminar Refrigerio
                  </button>
                ) : (
                  <button onClick={handleStartBreak} disabled={breakLoading} className="cm-btn cm-btn--warning cm-btn--md">
                    {breakLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
                    Iniciar Refrigerio
                  </button>
                )}
                <button onClick={handleClockOut} disabled={actionLoading} className="cm-btn cm-btn--error cm-btn--lg">
                  {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TimerOff className="w-5 h-5" />}
                  Marcar Salida
                </button>
              </>
            ) : isComplete ? (
              <div className="cm-badge cm-badge--info text-sm px-4 py-2">Completado</div>
            ) : (
              <button onClick={handleClockIn} disabled={actionLoading} className="cm-btn cm-btn--success cm-btn--lg">
                {actionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
                Marcar Entrada
              </button>
            )}
          </div>
        </div>
      </div>

      {/* During shift: checklist items */}
      {isClockedIn && hasInicioChecklist && (
        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
          <h3 className="text-sm font-bold text-cm-text flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-cm-accent" />
            Checklist de inicio
            {inicioDone && <span className="text-[10px] font-semibold text-cm-success bg-cm-success/10 px-1.5 py-0.5 rounded">Completado</span>}
          </h3>
          <ChecklistSection phase="inicio" items={shiftChecklists.inicio} readOnly={false} />
        </div>
      )}

      {/* Incident report during shift */}
      {isClockedIn && (
        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
          <button onClick={() => setShowIncidentForm(!showIncidentForm)} className="flex items-center gap-2 text-sm font-semibold text-cm-text-secondary hover:text-cm-warning transition-colors">
            <AlertTriangle className="w-4 h-4" />
            Reportar incidencia
          </button>
          <AnimatePresence>
            {showIncidentForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} placeholder="Describí el problema..."
                  className="w-full mt-3 px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text bg-cm-bg-alt focus:outline-none focus:border-cm-accent resize-none" rows={2} />
                <button onClick={handleReportIncident} disabled={!incidentDesc.trim()} className="mt-2 px-3 py-1.5 bg-cm-warning text-white text-xs font-bold rounded-lg hover:bg-cm-warning/80 transition-colors disabled:opacity-50">
                  Reportar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Clock-out flow modal */}
      <AnimatePresence>
        {showClockOutFlow && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClockOutFlow(false)}>
            <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cm-text flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-cm-warning" />
                  Cerrar turno
                </h3>
                <button onClick={() => setShowClockOutFlow(false)} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              {/* Cierre checklist */}
              {hasCierreChecklist && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Checklist de cierre</label>
                  <ChecklistSection phase="cierre" items={shiftChecklists.cierre} readOnly={false} />
                </div>
              )}

              {/* Handover notes */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Notas de traspaso
                </label>
                <textarea value={handoverNotes} onChange={e => setHandoverNotes(e.target.value)} placeholder="Ej: Queda 1/2 de arroz, parrilla encendida..."
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text bg-cm-bg-alt focus:outline-none focus:border-cm-accent resize-none" rows={3} />
              </div>

              <button onClick={confirmClockOut} disabled={actionLoading}
                className="w-full py-2.5 bg-cm-accent text-white text-sm font-bold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TimerOff className="w-4 h-4" />}
                Cerrar Turno
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TodaySummary employee={employee} attendance={attendance} branchId={branchId} />
    </div>
  );
}

function ErrorBanner({ error, onDismiss }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 text-sm text-cm-error bg-cm-error-soft rounded-[--cm-radius-md] px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={onDismiss} className="text-cm-error hover:text-cm-text font-bold text-lg leading-none">&times;</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TodaySummary({ employee, attendance, branchId }) {
  const now = new Date();
  const dayName = now.toLocaleDateString('es-PE', { weekday: 'long' });
  const dayNum = now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  const att = attendance || {};
  const role = employee?.role;

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
            <div className="text-sm font-semibold text-cm-text">{role || '—'}</div>
          </div>
        </div>
        {att.area && (
          <p className="text-xs text-cm-text-secondary mt-1">{att.area}{att.station ? ` · ${att.station}` : ''}</p>
        )}
      </div>
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-[--cm-radius-sm] flex items-center justify-center ${att.clockIn ? 'bg-cm-success-soft' : 'bg-cm-bg-alt'}`}>
            <Inbox className={`w-4 h-4 ${att.clockIn ? 'text-cm-success' : 'text-cm-text-secondary'}`} />
          </div>
          <div>
            <div className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">Estado</div>
            <div className="text-sm font-semibold text-cm-text">
              {att.state === 'verified' ? 'Verificado' :
               att.clockIn && !att.clockOut ? 'En jornada' :
               att.clockIn && att.clockOut ? 'Completado' : 'Sin fichar'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
