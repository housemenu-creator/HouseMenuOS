import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, Loader2, AlertCircle, CheckCircle2, XCircle, Eye, EyeOff,
  FileText, IdCard, Calendar, MapPin, Phone, Copy, RefreshCw,
} from 'lucide-react';
import { subscribeApplications, approveApplication, rejectApplication } from '../../lib/applicationsService';
import { useAuth } from '../../context/AuthContext';
import { ROLE_REGISTRY } from '../../lib/roleRegistry';

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const INPUT_CLS = 'w-full bg-cm-bg border-2 border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors';
const LABEL_CLS = 'block text-xs font-bold text-cm-muted mb-1';

// Roles que un trabajador puede tener al aprobar (sin superadmin)
const WORKER_ROLES = ['cajero', 'kitchen', 'mozo', 'dispatch', 'delivery', 'admin'];

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildSchedule(start, end, days) {
  const s = {};
  for (const d of days) {
    s[d] = { start, end, active: true };
  }
  return s;
}

export default function ApplicationsTab() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [approving, setApproving] = useState(null); // app id en modal
  const [confirmReject, setConfirmReject] = useState(null); // app id
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFiles, setShowFiles] = useState(null); // app id — ver docs lado a lado

  // Form de aprobación
  const [form, setForm] = useState({
    role: 'cajero', pin: genPin(), start: '08:00', end: '16:00',
    days: DAYS.slice(0, 5), // lun-vie por defecto
    functions: '',
    showPin: false,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    try {
      const unsub = subscribeApplications((list) => {
        setApps(list);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      setError(err.message || 'Error al cargar solicitudes');
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return apps;
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const a of apps) if (c[a.status] !== undefined) c[a.status]++;
    return c;
  }, [apps]);

  const toggleDay = (d) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
    }));
  };

  const resetForm = () => setForm((f) => ({ ...f, role: 'cajero', pin: genPin(), start: '08:00', end: '16:00', days: DAYS.slice(0, 5), functions: '', showPin: false }));

  const handleApprove = async (app) => {
    setBusy(true);
    setError('');
    const result = await approveApplication({
      applicationId: app.id,
      name: app.profile?.name || '',
      email: app.profile?.email || '',
      dni: app.profile?.dni || '',
      phone: app.profile?.phone || '',
      role: form.role,
      pin: form.pin,
      branchIds: { monteverde: true },
      schedule: buildSchedule(form.start, form.end, form.days),
      functions: form.functions.split(',').map((s) => s.trim()).filter(Boolean),
      actor: user?.email,
    });
    setBusy(false);
    if (result.success) {
      setApproving(null);
      resetForm();
      setToast({ message: `✔ ${app.profile?.name} aprobado — rol ${form.role}, PIN ${form.pin}`, type: 'ok' });
    } else {
      setError(result.error || 'No se pudo aprobar');
    }
  };

  const handleReject = async (app) => {
    setBusy(true);
    setError('');
    const result = await rejectApplication(app.id, rejectReason, user?.email);
    setBusy(false);
    if (result.success) {
      setConfirmReject(null);
      setRejectReason('');
      setToast({ message: `✘ ${app.profile?.name} rechazado`, type: 'warn' });
    } else {
      setError(result.error || 'No se pudo rechazar');
    }
  };

  const filesVisibleFor = (app) => {
    const f = app.files || {};
    return (
      <div className="grid grid-cols-2 gap-3 mt-2">
        {['dni', 'cv'].map((kind) => {
          const url = f[kind];
          if (!url) return (
            <div key={kind} className="text-xs text-cm-muted bg-cm-bg rounded-lg p-3 text-center border border-cm-border">
              Sin {kind === 'dni' ? 'DNI' : 'CV'}
            </div>
          );
          return (
            <a key={kind} href={url} target="_blank" rel="noreferrer"
               className="flex items-center justify-center gap-2 text-xs font-bold text-cm-accent bg-cm-bg rounded-lg p-3 border border-cm-border hover:border-cm-accent/40 transition-colors">
              {kind === 'dni' ? <IdCard className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              Ver {kind === 'dni' ? 'DNI' : 'Hoja de vida'}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-cm-md border text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black text-cm-text flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cm-accent" /> Solicitudes de trabajadores
          </h2>
          <p className="text-xs text-cm-muted mt-1">
            Revisá los registros, mirá el DNI y la hoja de vida, y aprobá asignando rol, PIN y horario.
          </p>
        </div>
        <div className="flex gap-1 bg-cm-bg rounded-lg p-1 border border-cm-border">
          {['pending', 'approved', 'rejected', 'all'].map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${filter === k ? 'bg-cm-accent text-white' : 'text-cm-muted hover:text-cm-text'}`}>
              {k === 'all' ? 'Todas' : k === 'pending' ? `Pendientes (${counts.pending})` : k}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-cm-muted">
          {(filter === 'pending' ? 'No hay solicitudes pendientes. Cuando un trabajador se registre, aparecerá acá.' : 'Sin resultados.')}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <motion.div key={app.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-cm-text truncate">{app.profile?.name || 'Sin nombre'}</p>
                    {app.status === 'pending' && (
                      <span className="text-[0.6rem] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>
                    )}
                    {app.status === 'approved' && (
                      <span className="text-[0.6rem] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Aprobado</span>
                    )}
                    {app.status === 'rejected' && (
                      <span className="text-[0.6rem] font-black uppercase bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">Rechazado</span>
                    )}
                  </div>
                  <p className="text-xs text-cm-muted mt-0.5">{app.profile?.email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-cm-muted">
                    {app.profile?.dni && <span className="flex items-center gap-1"><IdCard className="w-3.5 h-3.5" /> DNI {app.profile.dni}</span>}
                    {app.profile?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {app.profile.phone}</span>}
                    {app.profile?.birthDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {app.profile.birthDate}</span>}
                    {app.profile?.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.profile.address}</span>}
                  </div>
                  {app.assigned && (
                    <p className="text-xs text-cm-muted mt-1">
                      Asignado: <span className="font-bold text-cm-text capitalize">{app.assigned.role}</span>
                      {app.assigned.pin && <span> · PIN <span className="font-mono">{app.assigned.pin}</span></span>}
                      {app.assigned.functions?.length > 0 && <span> · {app.assigned.functions.join(', ')}</span>}
                    </p>
                  )}
                  {app.status === 'rejected' && app.rejectReason && (
                    <p className="text-xs text-red-600 mt-1">Motivo: {app.rejectReason}</p>
                  )}
                  <p className="text-[0.65rem] text-cm-text-tertiary mt-1">
                    Creado: {app.createdAt ? new Date(app.createdAt).toLocaleString('es-PE') : '—'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowFiles(showFiles === app.id ? null : app.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-cm-muted hover:text-cm-accent border border-cm-border rounded-lg px-3 py-2 transition-colors">
                    {showFiles === app.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showFiles === app.id ? 'Ocultar archivos' : 'Ver archivos'}
                  </button>
                  {app.status === 'pending' && (
                    <>
                      <button onClick={() => { setApproving(app.id); }}
                        className="flex items-center gap-1.5 text-xs font-black text-white bg-cm-accent rounded-lg px-3 py-2 hover:bg-cm-accent-hover transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                      </button>
                      <button onClick={() => { setConfirmReject(app.id); setRejectReason(''); }}
                        className="flex items-center gap-1.5 text-xs font-black text-red-600 border border-red-300 bg-red-50 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showFiles === app.id && filesVisibleFor(app)}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Modal aprobar ── */}
      {approving && (() => {
        const app = apps.find((a) => a.id === approving);
        if (!app) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { if (!busy) setApproving(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-cm-surface rounded-xl shadow-cm-lg border border-cm-border p-6 max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="text-lg font-black text-cm-text">Aprobar a {app.profile?.name}</h3>
                <p className="text-xs text-cm-muted mt-0.5">
                  Asigná puesto, PIN y horario. El trabajador podrá entrar con su correo y este PIN.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Puesto / rol *</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={INPUT_CLS}>
                    {WORKER_ROLES.filter((r) => ROLE_REGISTRY[r]).map((r) => (
                      <option key={r} value={r}>{ROLE_REGISTRY[r]?.name || r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>PIN de acceso *</label>
                  <div className="flex gap-1.5">
                    <input type={form.showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6}
                      value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                      className={INPUT_CLS + ' font-mono text-center'} placeholder="4321" />
                    <button type="button" onClick={() => { setForm({ ...form, pin: genPin() }); }}
                      className="shrink-0 flex items-center justify-center w-9 border border-cm-border rounded-lg text-cm-muted hover:text-cm-accent hover:border-cm-accent/40 transition-colors"
                      title="Generar PIN">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Entrada</label>
                  <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Salida</label>
                  <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={INPUT_CLS} />
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Días de trabajo</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`text-[0.65rem] font-bold capitalize px-2.5 py-1.5 rounded-lg border transition-colors ${form.days.includes(d) ? 'bg-cm-accent text-white border-cm-accent' : 'text-cm-muted border-cm-border hover:border-cm-accent/40'}`}>
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Funciones / estación (separadas por coma)</label>
                <input value={form.functions} onChange={(e) => setForm({ ...form, functions: e.target.value })}
                  className={INPUT_CLS} placeholder="Cocina caliente, Emplatado" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setApproving(null)} disabled={busy}
                  className="flex-1 border border-cm-border rounded-xl py-2.5 text-sm font-bold text-cm-muted hover:text-cm-text transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={() => handleApprove(app)} disabled={busy || form.days.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-cm-accent text-white font-black rounded-xl py-2.5 text-sm hover:bg-cm-accent-hover transition-colors disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar y crear
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Modal rechazar ── */}
      {confirmReject && (() => {
        const app = apps.find((a) => a.id === confirmReject);
        if (!app) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { if (!busy) setConfirmReject(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-cm-surface rounded-xl shadow-cm-lg border border-cm-border p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-cm-text">Rechazar a {app.profile?.name}</h3>
              <p className="text-xs text-cm-muted">
                La solicitud quedará rechazada y no podrá acceder. Opcional: indicá el motivo.
              </p>
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                className={INPUT_CLS} placeholder="Motivo (opcional)" />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmReject(null)} disabled={busy}
                  className="flex-1 border border-cm-border rounded-xl py-2.5 text-sm font-bold text-cm-muted hover:text-cm-text transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={() => handleReject(app)} disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-black rounded-xl py-2.5 text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Rechazar
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}