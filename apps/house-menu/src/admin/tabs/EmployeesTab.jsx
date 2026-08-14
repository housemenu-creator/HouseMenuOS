import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Users, UserPlus, Search, Edit3, Trash2, X, Clock, Target, Calendar,
  CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Phone, Mail, Briefcase, DollarSign, Hash, LogIn, LogOut, Star,
  UserCheck, UserX, Inbox, PauseCircle, Sun, Sparkles,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { confirmDialog } from '../../components/ConfirmDialog';
import { subscribeAreas, createArea, updateArea, deleteArea } from '../../lib/areaConfigService';
import AreaFormModal from '../../admin/components/AreaFormModal';
import { RefreshCw } from 'lucide-react';
import { Store } from 'lucide-react';
import {
  subscribeEmployees, createEmployee, updateEmployee, deleteEmployee,
  createUserForEmployee,
  getSchedule, saveSchedule,
  clockIn, clockOut, updateAttendance, subscribeTodayAttendance, getAttendanceHistory,
  getGoals, setGoal, deleteGoal, computeEmployeeKPI,
} from '../../lib/employeeService';
import { auditLog } from '../../lib/auditService';
import { todayISO } from '../../lib/format';

// ── Animated Counter ──
function AnimCounter({ value, decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const st = useRef(null);
  const from = useRef(0);
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display; st.current = null;
    const step = (ts) => {
      if (!st.current) st.current = ts;
      const p = Math.min((ts - st.current) / duration, 1);
      const e = 1 - (1 - p) * (1 - p);
      setDisplay(from.current + (value - from.current) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

const cv = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const iv = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'dispatch', label: 'Despacho' },
  { value: 'mozo', label: 'Mozo' },
  { value: 'delivery', label: 'Repartidor' },
  { value: 'vendedor', label: 'Vendedor' },
];

const EMPLOYEE_STATUS = [
  { value: 'active', label: 'Activo', icon: UserCheck, color: 'text-cm-success', bg: 'bg-cm-success/10' },
  { value: 'inactive', label: 'Inactivo', icon: UserX, color: 'text-cm-error', bg: 'bg-cm-error/10' },
  { value: 'suspended', label: 'Suspendido', icon: PauseCircle, color: 'text-cm-warning', bg: 'bg-cm-warning/10' },
  { value: 'vacation', label: 'Vacaciones', icon: Sun, color: 'text-cm-info', bg: 'bg-cm-info/10' },
];

function getEmpStatus(emp) {
  if (emp.status) return emp.status;
  return emp.active !== false ? 'active' : 'inactive';
}

function statusInfo(emp) {
  return EMPLOYEE_STATUS.find(s => s.value === getEmpStatus(emp)) || EMPLOYEE_STATUS[0];
}

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function calculateEmployeeHours(schedule) {
  if (!schedule) return 0;
  let totalMinutes = 0;
  DAYS.forEach(day => {
    const entry = schedule[day];
    if (entry && entry.active && entry.start && entry.end) {
      const [sh, sm] = entry.start.split(':').map(Number);
      const [eh, em] = entry.end.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) totalMinutes += diff;
    }
  });
  return totalMinutes / 60;
}

const SECTIONS = [
  { key: 'employees', label: 'Empleados', icon: Users },
  { key: 'schedules', label: 'Horarios', icon: Calendar },
  { key: 'attendance', label: 'Asistencia', icon: Clock },
  { key: 'goals', label: 'Metas', icon: Target },
  { key: 'areas', label: 'Áreas', icon: Store },
];

function fmtCurrency(n) {
  return `S/ ${Number(n).toFixed(2)}`;
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms) {
  if (!ms) return '—';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ── Employee Form Modal ────────────────────────────────

function EmployeeForm({ employee, onSave, onClose, areas }) {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    dni: employee?.dni || '',
    docType: employee?.docType || 'dni',
    docNum: employee?.docNum || employee?.dni || '',
    role: employee?.role || 'mozo',
    pin: employee?.pin || '',
    hourlyRate: employee?.hourlyRate || 0,
    startDate: employee?.startDate || todayISO(),
    notes: employee?.notes || '',
    userId: employee?.userId || null,
    area: employee?.area || '',
    station: employee?.station || '',
    status: employee?.status || (employee?.active === false ? 'inactive' : 'active'),
    statusEnd: employee?.statusEnd || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.area) {
      setError('Debés seleccionar un área para el empleado.');
      return;
    }
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) {
      setError('El PIN debe tener entre 4 y 6 numeros.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el empleado. Revisa la conexion o tus permisos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-cm-text">{employee ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button onClick={onClose} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
              {form.email && !form.userId && ['admin','cajero','kitchen','dispatch','mozo','vendedor'].includes(form.role) && (
                <p className="text-[10px] text-cm-success font-bold mt-0.5">Se creará un usuario automáticamente</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Teléfono</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Doc. Identidad</label>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <select value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })}
                  className="w-full px-2 py-2 border border-cm-border rounded-lg text-xs font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors">
                  <option value="dni">DNI</option>
                  <option value="ce">C. Extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
                <input inputMode="numeric" maxLength={form.docType === 'dni' ? 8 : 12}
                  value={form.docNum}
                  onChange={e => setForm({ ...form, docNum: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                  placeholder={form.docType === 'dni' ? '12345678' : form.docType === 'ce' ? 'CE-123456' : 'AB123456'} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder={employee ? '••••' : ''} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">
                Área <span className="text-cm-error">*</span>
              </label>
              {Object.values(areas || {}).filter(a => a.active !== false).length === 0 ? (
                <div className="rounded-lg border border-cm-warning/30 bg-cm-warning/5 px-3 py-2">
                  <p className="text-[11px] font-semibold text-cm-warning">No hay áreas configuradas</p>
                  <p className="text-[10px] text-cm-text-secondary mt-0.5">Creá áreas en la sección Áreas primero.</p>
                </div>
              ) : (
                <select required value={form.area} onChange={e => setForm({ ...form, area: e.target.value, station: '' })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors">
                  <option value="">Seleccionar área...</option>
                  {Object.values(areas || {}).filter(a => a.active !== false).map(a => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Estación</label>
              <select value={form.station} onChange={e => setForm({ ...form, station: e.target.value })}
                className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors"
                disabled={!form.area}>
                <option value="">Sin estación</option>
                {Object.values(areas || {}).find(a => a.name === form.area)?.stations?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Paga hora (S/)</label>
              <input type="number" min="0" step="0.5" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Fecha inicio</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none" />
          </div>
          {employee && (
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Estado</label>
              <div className="grid grid-cols-4 gap-2">
                {EMPLOYEE_STATUS.map(st => {
                  const Icon = st.icon;
                  const isActive = form.status === st.value;
                  return (
                    <button key={st.value} type="button" onClick={() => setForm({ ...form, status: st.value })}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        isActive ? `${st.bg} ${st.color} border-current` : 'border-cm-border/50 text-cm-text-tertiary bg-cm-bg-alt hover:border-cm-border'
                      }`}>
                      <Icon className="w-4 h-4" />
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {(form.status === 'vacation' || form.status === 'suspended') && (
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">
                {form.status === 'vacation' ? 'Fin de vacaciones' : 'Fin de suspensión'}
              </label>
              <input type="date" value={form.statusEnd} onChange={e => setForm({ ...form, statusEnd: e.target.value })}
                className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-cm-error/30 bg-cm-error/10 p-3 text-xs font-semibold text-cm-error">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {employee ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Schedule Editor ────────────────────────────────────

const DAY_LABELS = { lunes: 'L', martes: 'M', miércoles: 'M', jueves: 'J', viernes: 'V', sábado: 'S', domingo: 'D' };
const PRESETS = [
  { label: 'Lun–Vie 9–18', data: { lunes: ['09:00','18:00'], martes: ['09:00','18:00'], miércoles: ['09:00','18:00'], jueves: ['09:00','18:00'], viernes: ['09:00','18:00'] } },
  { label: 'Lun–Sáb 9–18', data: { lunes: ['09:00','18:00'], martes: ['09:00','18:00'], miércoles: ['09:00','18:00'], jueves: ['09:00','18:00'], viernes: ['09:00','18:00'], sábado: ['09:00','18:00'] } },
  { label: 'Solo finde', data: { sábado: ['10:00','17:00'], domingo: ['10:00','17:00'] } },
  { label: 'Limpiar todo', data: {} },
];

function ScheduleEditor({ employeeId, userId, onClose }) {
  const { activeBranchId } = useBranch();
  const [week, setWeek] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranchId || !employeeId) return;
    setLoading(true);
    getSchedule(activeBranchId, employeeId).then(data => {
      setWeek(data);
      setLoading(false);
    });
  }, [activeBranchId, employeeId]);

  const toggleDay = (idx) => {
    setWeek(prev => prev.map((d, i) => i === idx ? { ...d, active: !d.active } : d));
  };

  const updateTime = (idx, field, value) => {
    setWeek(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const applyPreset = (preset) => {
    setWeek(prev => prev.map(d => {
      const time = preset.data[d.day];
      if (time) return { ...d, active: true, start: time[0], end: time[1], station: d.station || '' };
      return { ...d, active: false, start: '', end: '', station: '' };
    }));
  };

  const applySameTime = () => {
    const active = week.find(d => d.active);
    if (!active) return;
    setWeek(prev => prev.map(d => d.active ? { ...d, start: active.start, end: active.end, station: active.station || '' } : d));
  };

  const handleSave = async () => {
    if (!activeBranchId) return;
    setSaving(true);
    try {
      await saveSchedule(activeBranchId, employeeId, week, userId);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <div className="bg-cm-surface rounded-xl p-8" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-8 h-8 animate-spin text-cm-accent mx-auto" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-xl" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cm-text">Horario semanal y Funciones</h3>
          <button onClick={onClose} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-[0.6rem] font-semibold rounded-lg border border-cm-border bg-cm-bg-alt text-cm-text-secondary hover:bg-cm-accent hover:text-white hover:border-cm-accent transition-colors">
              {p.label}
            </button>
          ))}
        </div>

        {/* Day toggles + time inputs + station */}
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {week.map((d, i) => (
            <div key={d.day} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${d.active ? 'bg-cm-accent/5 border-cm-accent/20' : 'bg-cm-bg-alt border-cm-border/50'}`}>
              <button onClick={() => toggleDay(i)}
                className={`w-7 h-7 rounded-md text-xs font-black transition-colors shrink-0 ${d.active ? 'bg-cm-accent text-white' : 'bg-cm-border/50 text-cm-text-tertiary'}`}>
                {DAY_LABELS[d.day]}
              </button>
              <span className={`w-16 text-xs font-semibold capitalize shrink-0 ${d.active ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>{d.day}</span>
              <input type="time" value={d.start} disabled={!d.active} onChange={e => updateTime(i, 'start', e.target.value)}
                className="w-24 px-2 py-1 border border-cm-border rounded-md text-xs font-semibold text-cm-text bg-cm-surface disabled:opacity-30 focus:outline-none focus:border-cm-accent shrink-0" />
              <span className="text-[0.55rem] text-cm-text-tertiary shrink-0">→</span>
              <input type="time" value={d.end} disabled={!d.active} onChange={e => updateTime(i, 'end', e.target.value)}
                className="w-24 px-2 py-1 border border-cm-border rounded-md text-xs font-semibold text-cm-text bg-cm-surface disabled:opacity-30 focus:outline-none focus:border-cm-accent shrink-0" />
              
              <input type="text" value={d.station || ''} disabled={!d.active} placeholder="Estación / Función (ej: Terraza)" onChange={e => updateTime(i, 'station', e.target.value)}
                className="flex-1 min-w-[120px] px-2.5 py-1 border border-cm-border rounded-md text-xs font-semibold text-cm-text bg-cm-surface disabled:opacity-30 focus:outline-none focus:border-cm-accent" />
            </div>
          ))}
        </div>

        {/* Apply same time to all active days */}
        {week.filter(d => d.active).length > 1 && (
          <button onClick={applySameTime}
            className="mt-3 w-full text-[0.6rem] font-semibold text-cm-accent hover:text-cm-accent-hover py-1.5 border border-dashed border-cm-accent/30 rounded-lg hover:bg-cm-accent/5 transition-colors">
            Copiar horario y estación del primer día activo a todos
          </button>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t border-cm-border">
          <button onClick={onClose} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar horario
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Goals Modal ────────────────────────────────────────

function GoalsModal({ employeeId, onClose }) {
  const { activeBranchId } = useBranch();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({ metric: 'sales', target: '', period: 'monthly', label: '' });

  const loadGoals = async () => {
    if (!activeBranchId || !employeeId) return;
    const data = await getGoals(activeBranchId, employeeId);
    setGoals(data);
    setLoading(false);
  };

  useEffect(() => { loadGoals(); }, [activeBranchId, employeeId]);

  const handleAdd = async () => {
    if (!newGoal.target) return;
    await setGoal(activeBranchId, employeeId, newGoal);
    setNewGoal({ metric: 'sales', target: '', period: 'monthly', label: '' });
    await loadGoals();
  };

  const handleDelete = async (goalId) => {
    await deleteGoal(activeBranchId, employeeId, goalId);
    await loadGoals();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cm-text">Metas</h3>
          <button onClick={onClose} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-cm-accent mx-auto" /></div>
        ) : (
          <>
            {/* Existing goals */}
            <div className="space-y-2 mb-4">
              {goals.length === 0 && <p className="text-sm text-cm-text-tertiary text-center py-4">Sin metas aún</p>}
              {goals.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-cm-bg-alt rounded-lg border border-cm-border">
                  <div>
                    <p className="text-sm font-semibold text-cm-text">{g.label || g.metric}</p>
                    <p className="text-xs text-cm-text-tertiary">Meta: {g.target} · {g.period}</p>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 text-cm-text-tertiary hover:text-cm-error rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="border-t border-cm-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Nueva meta</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-cm-text-tertiary mb-1">Métrica</label>
                  <select value={newGoal.metric} onChange={e => setNewGoal({ ...newGoal, metric: e.target.value, label: '' })}
                    className="w-full px-2 py-1.5 border border-cm-border rounded-lg text-xs font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent">
                    <option value="sales">Ventas (S/)</option>
                    <option value="orders">Pedidos</option>
                    <option value="punctuality">Puntualidad</option>
                    <option value="rating">Rating cliente</option>
                    <option value="items">Items por hora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-cm-text-tertiary mb-1">Período</label>
                  <select value={newGoal.period} onChange={e => setNewGoal({ ...newGoal, period: e.target.value })}
                    className="w-full px-2 py-1.5 border border-cm-border rounded-lg text-xs font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent">
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-cm-text-tertiary mb-1">Meta</label>
                  <input type="number" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })}
                    className="w-full px-2 py-1.5 border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                </div>
                <button onClick={handleAdd} className="self-end px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Agregar
                </button>
              </div>
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-4 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cerrar</button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Tab ───────────────────────────────────────────

export default function EmployeesTab({ allOrders }) {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [section, setSection] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [scheduleEmp, setScheduleEmp] = useState(null);
  const [goalsEmp, setGoalsEmp] = useState(null);
  const [areas, setAreas] = useState({});
  const [editingArea, setEditingArea] = useState(null);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceEmpId, setAttendanceEmpId] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [editingBreak, setEditingBreak] = useState(null); // { empId, date } | null
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);
  const [toast, setToast] = useState(null);
  const userToPushIdRef = useRef({});

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Subscribe employees
  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    setError(null);
    try {
      const unsub = subscribeEmployees(activeBranchId, (emps) => {
        setEmployees(emps);
        setLoading(false);
        userToPushIdRef.current = emps.reduce((acc, e) => {
          if (e.userId) acc[e.userId] = e.id;
          return acc;
        }, {});
      });
      return unsub;
    } catch (err) {
      setError(err.message || 'Error al cargar empleados');
      setLoading(false);
    }
  }, [activeBranchId]);

  // Subscribe areas config
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = subscribeAreas(activeBranchId, setAreas);
    return unsub;
  }, [activeBranchId]);

  // Subscribe today attendance (keys are userId from tenant path → remap to pushId)
  useEffect(() => {
    if (!activeBranchId || section !== 'attendance') return;
    const unsub = subscribeTodayAttendance(activeBranchId, (data) => {
      const map = userToPushIdRef.current;
      const remapped = {};
      for (const [userId, record] of Object.entries(data)) {
        const pushId = map[userId];
        if (pushId) remapped[pushId] = record;
      }
      setAttendance(remapped);
    });
    return unsub;
  }, [activeBranchId, section]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q) ||
      (e.role || '').includes(q)
    );
  }, [employees, search]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, suspended: 0, vacation: 0 };
    for (const e of employees) counts[getEmpStatus(e)]++;
    return counts;
  }, [employees]);

  const handleCreate = async (data) => {
    const result = await createEmployee(activeBranchId, data);
    if (result._userWarning) {
      console.warn('EmployeesTab.createEmployee: user creation warning', result._userWarning);
      setToast({ message: `✔ Empleado creado, pero ${result._userWarning}`, type: 'warning' });
    }
  };

  const handleUpdate = async (data) => {
    const prev = employees.find(e => e.id === editingEmp.id);
    await updateEmployee(activeBranchId, editingEmp.id, data);
    if (prev && prev.status !== data.status) {
      auditLog('employee.status_changed', {
        employeeId: editingEmp.id,
        employeeName: data.name || prev.name,
        from: prev.status || 'active',
        to: data.status,
        statusEnd: data.statusEnd || null,
      }, user?.email);
    }
  };

  const handleRetryCreateUser = async (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    try {
      const result = await createUserForEmployee(activeBranchId, empId);
      if (result.success) {
        setToast({ message: `✔ Usuario creado para ${emp.name}`, type: 'success' });
      } else {
        alert(result.error || 'Error al crear usuario');
      }
    } catch (err) {
      console.error('handleRetryCreateUser error:', err);
      alert('Error de conexión. Revisá que el email no esté duplicado e intentá de nuevo.');
    }
  };

  const handleDelete = async (empId) => {
    const emp = employees.find(e => e.id === empId);
    // No permitir eliminarse a sí mismo
    if (emp && user && emp.id === user.id) {
      alert('No podés eliminar tu propio usuario.');
      return;
    }
    // No permitir eliminar admin/superadmin sin ser superadmin
    if (emp && (emp.role === 'admin' || emp.role === 'superadmin') && user?.role !== 'superadmin') {
      alert(`No podés eliminar un empleado con rol ${emp.role}. Solo un superadmin puede hacerlo.`);
      return;
    }
    // Si tiene usuario vinculado, avisar que también se eliminará
    let extraMsg = '';
    if (emp?.userId) {
      extraMsg = '\n\n⚠️ También se eliminará su acceso al sistema (usuario y permisos).';
    }
    if (!(await confirmDialog(`¿Eliminar a ${emp?.name || 'este empleado'}? Esta acción no se puede deshacer.${extraMsg}`))) return;
    const result = await deleteEmployee(activeBranchId, empId, user?.role);
    if (!result.success) {
      alert(result.error || 'Error al eliminar empleado');
    }
  };

  const getEmpUserId = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp?.userId || null;
  };

  const handleClockIn = async (empId) => {
    await clockIn(activeBranchId, empId, getEmpUserId(empId));
  };

  const handleClockOut = async (empId) => {
    await clockOut(activeBranchId, empId, getEmpUserId(empId));
  };

  const handleSaveBreakMinutes = async (empId, userId, date) => {
    await updateAttendance(userId, date, { breakMinutes: Number(editBreakMinutes) || 0 });
    setEditingBreak(null);
    // Re-fetch attendance for this employee to reflect changes
    const data = await getAttendanceHistory(activeBranchId, empId, userId);
    setAttendanceHistory(data);
  };

  const loadAttendanceHistory = async (empId) => {
    setAttendanceLoading(true);
    setAttendanceEmpId(empId);
    const data = await getAttendanceHistory(activeBranchId, empId, getEmpUserId(empId));
    setAttendanceHistory(data);
    setAttendanceLoading(false);
  };

  // ── Section: Employee Directory ──────────────────

  const renderEmployees = () => (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
          toast.type === 'warning'
            ? 'bg-cm-warning/10 border-cm-warning/30 text-cm-warning'
            : toast.type === 'error'
            ? 'bg-cm-error/10 border-cm-error/30 text-cm-error'
            : 'bg-cm-success/10 border-cm-success/30 text-cm-success'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto p-0.5 hover:opacity-70 transition-opacity"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {/* Stats bar */}
      <motion.div variants={iv} className="grid grid-cols-4 gap-3 mb-5">
        {EMPLOYEE_STATUS.map(st => {
          const Icon = st.icon;
          const count = statusCounts[st.value] || 0;
          return (
            <div key={st.value} className={`bg-cm-surface rounded-xl border border-cm-border p-4 flex items-start gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${st.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${st.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${st.color}`}><AnimCounter value={count} /></p>
                <p className="text-xs font-semibold text-cm-text-tertiary mt-0.5">{st.label}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado por nombre, email, rol..." className="w-full pl-9 pr-8 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cm-text-tertiary hover:text-cm-text rounded-md transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={() => { setEditingEmp(null); setShowForm(true); }} className="px-4 py-2 bg-cm-accent text-white text-sm font-bold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-2 shrink-0">
          <UserPlus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* List */}
      <motion.div variants={iv} className="space-y-2">
        {filtered.length === 0 && (
          <motion.div variants={iv} className="text-center py-12">
            <Users className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-cm-text-secondary">No hay empleados {search ? 'que coincidan' : 'aún'}</p>
          </motion.div>
        )}
        {filtered.map(emp => {
          const kpi = allOrders ? computeEmployeeKPI(allOrders, emp.id, emp.name) : null;
          const today = attendance[emp.id];
          return (
            <motion.div key={emp.id} variants={iv} className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-start justify-between gap-3 hover:border-cm-border-hover transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-cm-text">{emp.name}</h4>
                  {(() => {
                    const st = statusInfo(emp);
                    const Icon = st.icon;
                    return <span className={`text-[0.55rem] font-semibold ${st.bg} ${st.color} px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5`}><Icon className="w-2.5 h-2.5" />{st.label}</span>;
                  })()}
                  {emp.statusEnd && emp.status !== 'active' && (
                    <span className="text-[0.5rem] font-medium text-cm-text-tertiary bg-cm-bg-alt px-1.5 py-0.5 rounded-full">
                      Hasta {new Date(emp.statusEnd).toLocaleDateString('es-PE')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cm-text-secondary">
                  {emp.role && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{ROLES.find(r => r.value === emp.role)?.label || emp.role}</span>}
                  {emp.userId ? (
                    <span className="flex items-center gap-0.5 text-cm-success text-[10px]" title="Tiene acceso al sistema (usuario vinculado)"><LogIn className="w-3 h-3" /></span>
                  ) : emp.email && ['admin','cajero','kitchen','dispatch','mozo','vendedor'].includes(emp.role) && (
                    <span className="flex items-center gap-0.5 text-cm-warning text-[10px]" title="Sin acceso al sistema — hacer clic para crear usuario">
                      <button onClick={() => handleRetryCreateUser(emp.id)} className="flex items-center gap-0.5 hover:text-cm-accent transition-colors">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="underline decoration-dotted">Crear acceso</span>
                      </button>
                    </span>
                  )}
                  {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                  {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                  {emp.hourlyRate > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{fmtCurrency(emp.hourlyRate)}/h</span>}
                  {emp.area && <span className="flex items-center gap-1 text-cm-accent"><Inbox className="w-3 h-3" />{emp.area}{emp.station ? ` · ${emp.station}` : ''}</span>}
                </div>
                {kpi && (
                  <div className="flex gap-3 mt-2 text-[10px] font-semibold text-cm-text-tertiary">
                    <span>{kpi.totalOrders} pedidos</span>
                    <span>{fmtCurrency(kpi.totalRevenue)}</span>
                    {kpi.cancellations > 0 && <span className="text-cm-error">{kpi.cancellations} cancelados</span>}
                  </div>
                )}
                {today && (
                  <div className="flex items-center gap-2 mt-2">
                    {today.clockIn && !today.clockOut ? (
                      <span className="text-[10px] font-bold text-cm-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Desde {fmtTime(today.clockIn)}</span>
                    ) : today.clockIn && today.clockOut ? (
                      <span className="text-[10px] font-semibold text-cm-text-tertiary flex items-center gap-1">{fmtTime(today.clockIn)} → {fmtTime(today.clockOut)} ({fmtDuration(today.clockOut - today.clockIn)})</span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditingEmp(emp); setShowForm(true); }} className="p-2 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors" title="Editar">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setScheduleEmp(emp)} className="p-2 text-cm-text-tertiary hover:text-cm-info hover:bg-cm-info/10 rounded-lg transition-colors" title="Horario">
                  <Calendar className="w-4 h-4" />
                </button>
                <button onClick={() => setGoalsEmp(emp)} className="p-2 text-cm-text-tertiary hover:text-cm-warning hover:bg-cm-warning/10 rounded-lg transition-colors" title="Metas">
                  <Target className="w-4 h-4" />
                </button>
                {(emp.role === 'admin' || emp.role === 'superadmin') && user?.role !== 'superadmin' ? null : (
                  <button onClick={() => handleDelete(emp.id)} className="p-2 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );

  // ── Section: Schedules ───────────────────────────

  const renderSchedules = () => {
    const withSchedule = employees.filter(e => getEmpStatus(e) !== 'inactive');

    // Mapeo corto de días para el encabezado de la cuadrícula
    const shortDayLabels = {
      lunes: 'Lun',
      martes: 'Mar',
      miércoles: 'Mié',
      jueves: 'Jue',
      viernes: 'Vie',
      sábado: 'Sáb',
      domingo: 'Dom'
    };

    // Estaciones/Roles recomendados por IA (Simulado según PLAN_MAESTRO_V2.md)
    const RECOMMENDATIONS = {
      lunes: { mozo: 2, kitchen: 1, cajero: 1, demand: 'Baja' },
      martes: { mozo: 2, kitchen: 1, cajero: 1, demand: 'Baja' },
      miércoles: { mozo: 2, kitchen: 1, cajero: 1, demand: 'Baja' },
      jueves: { mozo: 3, kitchen: 2, cajero: 1, demand: 'Media' },
      viernes: { mozo: 5, kitchen: 3, cajero: 1, demand: 'Pico (Alta)' },
      sábado: { mozo: 5, kitchen: 3, cajero: 1, demand: 'Pico (Alta)' },
      domingo: { mozo: 4, kitchen: 2, cajero: 1, demand: 'Alta' },
    };

    const getScheduledCountByDayAndRole = (day, roleVal) => {
      return employees.filter(emp => {
        if (getEmpStatus(emp) === 'inactive') return false;
        if (emp.role !== roleVal) return false;
        const dayEntry = emp.schedule?.[day];
        return dayEntry && dayEntry.active;
      }).length;
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-cm-text-secondary">Planifica visualmente los turnos, horarios y estaciones de trabajo del personal.</p>
          </div>
        </div>

        {/* Cuadrícula Visual de Horarios */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl overflow-hidden shadow-cm-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg-alt/50">
                  <th className="py-3 px-4 text-xs font-bold text-cm-text-secondary uppercase tracking-wider w-56 sticky left-0 bg-cm-surface z-10">Empleado</th>
                  {DAYS.map(day => (
                    <th key={day} className="py-3 px-3 text-xs font-bold text-cm-text-secondary uppercase tracking-wider text-center">{shortDayLabels[day]}</th>
                  ))}
                  <th className="py-3 px-4 text-xs font-bold text-cm-text-secondary uppercase tracking-wider text-center w-24">Horas/Sem</th>
                  <th className="py-3 px-4 text-xs font-bold text-cm-text-secondary uppercase tracking-wider text-center w-16">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cm-border/50">
                {withSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={DAYS.length + 3} className="py-12 text-center text-sm text-cm-text-secondary">
                      <Calendar className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
                      No hay empleados activos configurados
                    </td>
                  </tr>
                ) : (
                  withSchedule.map(emp => {
                    const totalHours = calculateEmployeeHours(emp.schedule);
                    return (
                      <tr key={emp.id} className="hover:bg-cm-bg-alt/20 transition-colors">
                        {/* Celda del empleado (Sticky) */}
                        <td className="py-3 px-4 sticky left-0 bg-cm-surface z-10 border-r border-cm-border/30">
                          <div className="min-w-0">
                            <p className="font-semibold text-cm-text text-sm truncate">{emp.name}</p>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-cm-accent/5 text-cm-accent text-[9px] font-bold uppercase rounded tracking-wider">
                              {ROLES.find(r => r.value === emp.role)?.label || emp.role}
                            </span>
                          </div>
                        </td>

                        {/* Celdas de días */}
                        {DAYS.map(day => {
                          const sched = emp.schedule?.[day];
                          const isActive = sched && sched.active;
                          return (
                            <td key={day} className="py-2.5 px-2 border-r border-cm-border/30 last:border-r-0">
                              {isActive ? (
                                <div className="p-1.5 rounded-lg bg-cm-accent/5 border border-cm-accent/15 text-center space-y-0.5 group relative hover:bg-cm-accent/10 transition-colors cursor-pointer" onClick={() => setScheduleEmp(emp)}>
                                  <p className="text-[10px] font-bold text-cm-accent">{sched.start} - {sched.end}</p>
                                  {sched.station ? (
                                    <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold text-cm-text bg-cm-border rounded max-w-full truncate" title={sched.station}>
                                      {sched.station}
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[8px] text-cm-text-tertiary italic">Sin estación</span>
                                  )}
                                </div>
                              ) : (
                                <div className="py-3 text-center text-[10px] font-semibold text-cm-text-tertiary select-none">
                                  Libre
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Horas Totales */}
                        <td className="py-3 px-4 text-center border-l border-cm-border/30">
                          <span className={`text-xs font-bold ${totalHours > 45 ? 'text-cm-error' : totalHours > 0 ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>
                            {totalHours.toFixed(1)}h
                          </span>
                        </td>

                        {/* Editar */}
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => setScheduleEmp(emp)} className="p-1.5 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-all" title="Editar Horario">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Predictivo de Personal IA */}
        <div className="bg-cm-surface border border-cm-border rounded-2xl p-5 shadow-cm-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-cm-accent animate-pulse" />
            <h3 className="font-bold text-cm-text text-base">Optimización de Dotación de Personal (IA)</h3>
            <span className="text-[9px] font-black uppercase bg-cm-accent text-white px-1.5 py-0.5 rounded tracking-widest ml-2">Predictive Ops</span>
          </div>
          <p className="text-xs text-cm-text-secondary mb-4">
            Compara la dotación planificada contra el personal sugerido por la IA para cubrir el volumen estimado de pedidos y ventas por sucursal.
          </p>

          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {DAYS.map(day => {
              const rec = RECOMMENDATIONS[day];
              const schedMozos = getScheduledCountByDayAndRole(day, 'mozo');
              const schedKitchen = getScheduledCountByDayAndRole(day, 'kitchen');
              const schedCajero = getScheduledCountByDayAndRole(day, 'cajero');

              // Evaluar optimización de dotación
              const totalSched = schedMozos + schedKitchen + schedCajero;
              const totalRec = rec.mozo + rec.kitchen + rec.cajero;

              let statusLabel = 'Óptimo';
              let statusBg = 'bg-cm-success/5 border-cm-success/20 text-cm-success';
              let details = [];

              if (schedMozos < rec.mozo) details.push(`Falta ${rec.mozo - schedMozos} Mozo(s)`);
              if (schedKitchen < rec.kitchen) details.push(`Falta ${rec.kitchen - schedKitchen} Cocina`);
              if (schedCajero < rec.cajero) details.push(`Falta Cajero`);

              let overstaffDetails = [];
              if (schedMozos > rec.mozo) overstaffDetails.push(`Sobra ${schedMozos - rec.mozo} Mozo(s)`);
              if (schedKitchen > rec.kitchen) overstaffDetails.push(`Sobra ${schedKitchen - rec.kitchen} Cocina`);

              if (details.length > 0) {
                statusLabel = 'Subdotado';
                statusBg = 'bg-cm-error/5 border-cm-error/25 text-cm-error';
              } else if (overstaffDetails.length > 0) {
                statusLabel = 'Sobredotado';
                statusBg = 'bg-cm-warning/5 border-cm-warning/25 text-cm-warning';
              }

              return (
                <div key={day} className={`rounded-xl border p-3 flex flex-col justify-between min-h-[140px] transition-all hover:shadow-cm-sm ${statusBg}`}>
                  <div>
                    <p className="text-xs font-black capitalize text-cm-text">{day}</p>
                    <p className="text-[9px] text-cm-text-tertiary mt-0.5 font-semibold">Demanda: {rec.demand}</p>
                  </div>

                  <div className="my-2.5 space-y-1 text-[9px] font-bold text-cm-text-secondary">
                    <p className="flex justify-between">
                      <span>Mozos:</span> <span>{schedMozos} / {rec.mozo}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Cocina:</span> <span>{schedKitchen} / {rec.kitchen}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Caja:</span> <span>{schedCajero} / {rec.cajero}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-cm-border/10">
                    <span className="text-[9px] font-black uppercase tracking-wider block text-center mb-1">
                      {statusLabel}
                    </span>
                    {details.length > 0 && (
                      <p className="text-[8px] leading-tight text-center font-semibold text-cm-error-hover">
                        {details.join(', ')}
                      </p>
                    )}
                    {details.length === 0 && overstaffDetails.length > 0 && (
                      <p className="text-[8px] leading-tight text-center font-semibold text-cm-warning-hover">
                        {overstaffDetails.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Section: Attendance ──────────────────────────

  const renderAttendance = () => {
    const todayStr = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const activeShifts = employees.filter(e => getEmpStatus(e) === 'active' && attendance[e.id]?.state === 'active');

    return (
      <div>
        <p className="text-sm text-cm-text-secondary mb-1 capitalize">{todayStr}</p>

        {/* Active shifts summary */}
        {activeShifts.length > 0 && (
          <div className="mb-4 p-3 bg-cm-success/5 border border-cm-success/20 rounded-xl">
            <p className="text-xs font-bold text-cm-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeShifts.length} turno{activeShifts.length > 1 ? 's' : ''} activo{activeShifts.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Attendance grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {employees.filter(e => getEmpStatus(e) !== 'inactive').map(emp => {
            const record = attendance[emp.id];
            const isActive = record?.state === 'active';
            const duration = record?.clockIn ? Date.now() - record.clockIn : 0;
            const hrs = Math.floor(duration / 3600000);
            const mins = Math.floor((duration % 3600000) / 60000);

            // Get today's schedule config
            const DAY_MAP = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
            const todayName = DAY_MAP[new Date().getDay()];
            const sched = emp.schedule?.[todayName];
            const hasSched = sched && sched.active;

            let punchStatus = null;
            if (record?.clockIn && sched?.start) {
              const [sh, sm] = sched.start.split(':').map(Number);
              const schedDate = new Date(record.clockIn);
              schedDate.setHours(sh, sm, 0, 0);
              const diffMins = Math.round((record.clockIn - schedDate.getTime()) / 60000);
              if (diffMins > 10) {
                punchStatus = { label: `Tardanza (+${diffMins}m)`, color: 'text-cm-error bg-cm-error/10 border-cm-error/25' };
              } else {
                punchStatus = { label: 'A tiempo', color: 'text-cm-success bg-cm-success/10 border-cm-success/25' };
              }
            } else if (!record?.clockIn && hasSched) {
              const [sh, sm] = sched.start.split(':').map(Number);
              const nowTime = new Date();
              const schedDate = new Date();
              schedDate.setHours(sh, sm, 0, 0);
              const diffMins = Math.round((nowTime.getTime() - schedDate.getTime()) / 60000);
              if (diffMins > 30) {
                punchStatus = { label: 'Ausente', color: 'text-cm-error bg-cm-error/10 border-cm-error/25' };
              } else {
                punchStatus = { label: 'No ha ingresado', color: 'text-cm-text-tertiary bg-cm-bg-alt border-cm-border' };
              }
            } else if (!hasSched && !record?.clockIn) {
              punchStatus = { label: 'Día Libre', color: 'text-cm-text-secondary bg-cm-bg-alt border-cm-border border-dashed' };
            }

            return (
              <div key={emp.id} className={`bg-cm-surface rounded-xl border p-4 transition-colors ${isActive ? 'border-cm-success/40' : 'border-cm-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-cm-text text-sm truncate">{emp.name}</p>
                    <p className="text-[10px] text-cm-text-tertiary">{ROLES.find(r => r.value === emp.role)?.label || emp.role}</p>
                  </div>
                  {/* State badge */}
                  {isActive ? (
                    <span className="shrink-0 text-[10px] font-bold text-cm-success bg-cm-success/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse" />
                      Activo
                    </span>
                  ) : record?.clockOut ? (
                    <span className="shrink-0 text-[10px] font-semibold text-cm-text-tertiary bg-cm-bg-alt px-2 py-0.5 rounded-full">
                      Completado
                    </span>
                  ) : null}
                </div>

                {/* Comparación de Horario de hoy */}
                {punchStatus && (
                  <div className="mt-2.5 mb-2.5 p-1.5 rounded-lg border text-[9px] flex flex-col gap-0.5 bg-cm-bg-alt/40 border-cm-border/50">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-cm-text-secondary font-semibold">Horario:</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] border ${punchStatus.color}`}>
                        {punchStatus.label}
                      </span>
                    </div>
                    {hasSched && (
                      <p className="text-cm-text-tertiary font-semibold">
                        Plan: {sched.start} - {sched.end} {sched.station ? `(Estación: ${sched.station})` : '(Sin estación)'}
                      </p>
                    )}
                  </div>
                )}

                {/* Area / Station */}
                {record?.area && (
                  <p className="text-[10px] font-semibold text-cm-accent flex items-center gap-1 mb-1">
                    <Store className="w-3 h-3" />
                    {record.area}{record.station ? ` · ${record.station}` : ''}
                  </p>
                )}

                {/* Time info */}
                {record?.clockIn && (
                  <div className="text-[10px] text-cm-text-secondary space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Entrada: {fmtTime(record.clockIn)}
                      {record.clockOut && <> → {fmtTime(record.clockOut)}</>}
                    </p>
                    {isActive && (
                      <p className="text-cm-success font-semibold">
                        {hrs > 0 ? `${hrs}h ` : ''}{mins}min
                      </p>
                    )}
                    {record?.clockOut && record?.clockIn && (
                      <>
                        <p className="text-cm-text-tertiary">
                          Bruto: {fmtDuration(record.clockOut - record.clockIn)}
                          {record.breakMinutes > 0 && <> · Break: {record.breakMinutes}m</>}
                        </p>
                        <p className="text-cm-accent font-semibold">
                          Neto: {fmtDuration(Math.max(0, (record.clockOut - record.clockIn) - (record.breakMinutes || 0) * 60000))}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Checklist progress */}
                {record?.state === 'active' && record?.checklists?.inicio && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(record.checklists.inicio).map(([id, item]) => (
                      <div key={id} className={`flex items-center gap-1.5 text-[10px] ${item.done ? 'text-cm-success' : 'text-cm-text-tertiary'}`}>
                        {item.done ? (
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border border-cm-border shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-cm-border">
                  {!isActive && !record?.clockOut && (
                    <button onClick={() => handleClockIn(emp.id)}
                      className="px-2.5 py-1 bg-cm-success text-white text-[10px] font-bold rounded-lg hover:bg-cm-success/80 transition-colors flex items-center gap-1">
                      <LogIn className="w-3 h-3" /> Entrada
                    </button>
                  )}
                  {isActive && (
                    <button onClick={() => handleClockOut(emp.id)}
                      className="px-2.5 py-1 bg-cm-error text-white text-[10px] font-bold rounded-lg hover:bg-cm-error/80 transition-colors flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> Salida
                    </button>
                  )}
                  <button onClick={() => loadAttendanceHistory(emp.id)}
                    className="px-2.5 py-1 text-[10px] font-semibold text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors">
                    Historial
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Attendance history modal */}
        <AnimatePresence>
          {attendanceEmpId && (() => {
            const emp = employees.find(e => e.id === attendanceEmpId);
            const userId = emp?.userId;
            return (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAttendanceEmpId(null)}>
              <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md max-h-[70vh] overflow-y-auto" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-cm-text">Historial de asistencia</h3>
                  <button onClick={() => setAttendanceEmpId(null)} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                {attendanceLoading ? (
                  <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-cm-accent mx-auto" /></div>
                ) : attendanceHistory.length === 0 ? (
                  <p className="text-sm text-cm-text-tertiary text-center py-4">Sin registros</p>
                ) : (
                  <div className="space-y-1">
                    {attendanceHistory.map((r, i) => (
                      <div key={i} className="p-2 bg-cm-bg-alt rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-cm-text">{r.date}</span>
                          <span className="text-cm-text-secondary">
                            {fmtTime(r.clockIn)} → {fmtTime(r.clockOut)}
                          </span>
                          <span className="text-cm-text-tertiary">
                            {r.clockIn && r.clockOut ? fmtDuration(r.clockOut - r.clockIn) : '—'}
                          </span>
                        </div>
                        {r.clockOut && r.clockIn && (
                          <div className="flex items-center justify-between mt-1 text-[10px] text-cm-text-tertiary">
                            <span>
                              Break: {' '}
                              {editingBreak?.empId === attendanceEmpId && editingBreak?.date === r.date ? (
                                <>
                                  <input type="number" min="0" className="w-16 inline px-1 py-0.5 bg-cm-surface border border-cm-border rounded text-cm-text text-[10px]" value={editBreakMinutes} onChange={e => setEditBreakMinutes(e.target.value)} />
                                  <button onClick={() => handleSaveBreakMinutes(attendanceEmpId, userId, r.date)} className="ml-1 text-cm-success font-bold">✓</button>
                                  <button onClick={() => setEditingBreak(null)} className="ml-1 text-cm-error font-bold">✕</button>
                                </>
                              ) : (
                                <>
                                  {r.breakMinutes || 0} min
                                  <button onClick={() => { setEditingBreak({ empId: attendanceEmpId, date: r.date }); setEditBreakMinutes(r.breakMinutes || 0); }} className="ml-1 text-cm-accent hover:underline">editar</button>
                                </>
                              )}
                            </span>
                            <span className="text-cm-accent font-semibold">
                              Neto: {fmtDuration(Math.max(0, (r.clockOut - r.clockIn) - (r.breakMinutes || 0) * 60000))}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    );
  };

  // ── Section: Goals ───────────────────────────────

  const renderGoals = () => {
    const eligible = employees.filter(e => getEmpStatus(e) !== 'inactive');
    return (
      <div>
        <p className="text-sm text-cm-text-secondary mb-4">Define metas de rendimiento por empleado</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {eligible.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Target className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-cm-text-secondary">No hay empleados activos</p>
            </div>
          )}
          {eligible.map(emp => (
            <div key={emp.id} className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-cm-text">{emp.name}</p>
                <p className="text-xs text-cm-text-tertiary mt-0.5 capitalize">{emp.role}</p>
              </div>
              <button onClick={() => setGoalsEmp(emp)} className="px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
                Metas
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Section: Areas Config ───────────────────────

  const renderAreas = () => {
    const areaList = Object.values(areas);
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-cm-text-secondary">Gestioná las áreas de trabajo, estaciones y checklists de cada área</p>
          <button onClick={() => { setEditingArea(null); setShowAreaForm(true); }}
            className="px-3 py-1.5 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Nueva área
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areaList.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Store className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-cm-text-secondary">No hay áreas configuradas aún</p>
            </div>
          )}
          {areaList.map((a, idx) => {
            const areaKey = Object.keys(areas)[idx];
            const inicioCount = a.checklists?.inicio?.length || 0;
            const cierreCount = a.checklists?.cierre?.length || 0;
            return (
              <div key={areaKey} className="bg-cm-surface rounded-xl border border-cm-border p-4 hover:border-cm-border-hover transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-cm-text">{a.name}</h4>
                    {a.stations?.length > 0 && (
                      <p className="text-xs text-cm-text-tertiary mt-0.5">{a.stations.length} estaciones</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingArea({ key: areaKey, ...a }); setShowAreaForm(true); }}
                      className="p-1.5 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async () => {
                      if (await confirmDialog(`¿Eliminar área "${a.name}"?`)) {
                        await deleteArea(activeBranchId, areaKey);
                      }
                    }} className="p-1.5 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stations */}
                {a.stations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {a.stations.map(s => (
                      <span key={s} className="text-[10px] font-semibold bg-cm-bg-alt border border-cm-border px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                )}

                {/* Checklist counts */}
                <div className="flex gap-3 text-[10px] font-semibold text-cm-text-tertiary">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cm-success" />
                    Inicio: {inicioCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cm-warning" />
                    Cierre: {cierreCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Area form modal */}
        <AnimatePresence>
          {showAreaForm && (
            <AreaFormModal
              area={editingArea}
              onSave={async (data) => {
                if (editingArea) {
                  await updateArea(activeBranchId, editingArea.key, data);
                } else {
                  await createArea(activeBranchId, data);
                }
                setShowAreaForm(false);
                setEditingArea(null);
              }}
              onClose={() => { setShowAreaForm(false); setEditingArea(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-10 h-10 text-cm-error" />
        <p className="text-sm text-cm-text-secondary text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs font-bold text-cm-accent hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cm-accent animate-spin" /></div>;
  }

  return (
    <motion.div variants={cv} initial="hidden" animate="show">
      {/* Section nav with animated indicator */}
      <div className="mb-6 p-1 bg-cm-bg-alt rounded-xl border border-cm-border w-fit">
        <LayoutGroup id="emp-sections">
          <div className="flex gap-1">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = section === s.key;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className="relative px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {isActive && (
                    <motion.div
                      layoutId="emp-section-bg"
                      className="absolute inset-0 rounded-lg bg-cm-surface shadow-cm-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${isActive ? 'text-cm-accent' : 'text-cm-text-tertiary hover:text-cm-text'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {section === 'employees' && renderEmployees()}
          {section === 'schedules' && renderSchedules()}
          {section === 'attendance' && renderAttendance()}
          {section === 'goals' && renderGoals()}
          {section === 'areas' && renderAreas()}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <EmployeeForm employee={editingEmp} onSave={editingEmp ? handleUpdate : handleCreate} onClose={() => { setShowForm(false); setEditingEmp(null); }} areas={areas} />
        )}
        {scheduleEmp && (
          <ScheduleEditor employeeId={scheduleEmp.id} userId={scheduleEmp.userId} onClose={() => setScheduleEmp(null)} />
        )}
        {goalsEmp && (
          <GoalsModal employeeId={goalsEmp.id} onClose={() => setGoalsEmp(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
