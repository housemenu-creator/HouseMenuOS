import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Edit3, Trash2, X, Clock, Target, Calendar,
  CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Phone, Mail, Briefcase, DollarSign, Hash, LogIn, LogOut, Star,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import {
  subscribeEmployees, createEmployee, updateEmployee, deleteEmployee,
  getSchedule, saveSchedule,
  clockIn, clockOut, subscribeTodayAttendance, getAttendanceHistory,
  getGoals, setGoal, deleteGoal, computeEmployeeKPI,
} from '../../lib/employeeService';
import { todayISO } from '../../lib/format';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'dispatch', label: 'Despacho' },
  { value: 'mozo', label: 'Mozo' },
  { value: 'delivery', label: 'Repartidor' },
  { value: 'vendedor', label: 'Vendedor' },
];

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const SECTIONS = [
  { key: 'employees', label: 'Empleados', icon: Users },
  { key: 'schedules', label: 'Horarios', icon: Calendar },
  { key: 'attendance', label: 'Asistencia', icon: Clock },
  { key: 'goals', label: 'Metas', icon: Target },
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

function EmployeeForm({ employee, onSave, onClose }) {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    role: employee?.role || 'mozo',
    pin: employee?.pin || '',
    hourlyRate: employee?.hourlyRate || 0,
    startDate: employee?.startDate || todayISO(),
    notes: employee?.notes || '',
    userId: employee?.userId || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cm-text">{employee ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button onClick={onClose} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
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
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder={employee ? '••••' : ''} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Paga hora (S/)</label>
              <input type="number" min="0" step="0.5" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Fecha inicio</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none" />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-cm-error/30 bg-cm-error/10 p-3 text-xs font-semibold text-cm-error">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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

function ScheduleEditor({ employeeId, onClose }) {
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

  const handleSave = async () => {
    if (!activeBranchId) return;
    setSaving(true);
    try {
      await saveSchedule(activeBranchId, employeeId, week);
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
      <motion.div className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-lg" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cm-text">Horario semanal</h3>
          <button onClick={onClose} className="p-1 text-cm-text-tertiary hover:text-cm-text rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {week.map((d, i) => (
            <div key={d.day} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${d.active ? 'bg-cm-accent/5 border-cm-accent/20' : 'bg-cm-bg-alt border-cm-border/50'}`}>
              <button onClick={() => toggleDay(i)} className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-black transition-colors ${d.active ? 'bg-cm-accent text-white' : 'bg-cm-border text-cm-text-tertiary'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <span className={`w-20 text-sm font-bold capitalize ${d.active ? 'text-cm-text' : 'text-cm-text-tertiary'}`}>{d.day.slice(0, 3)}</span>
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={d.start} disabled={!d.active} onChange={e => updateTime(i, 'start', e.target.value)} className="w-28 px-2 py-1.5 border border-cm-border rounded-lg text-xs font-semibold text-cm-text bg-cm-surface disabled:opacity-40 focus:outline-none focus:border-cm-accent" />
                <span className="text-xs text-cm-text-tertiary">→</span>
                <input type="time" value={d.end} disabled={!d.active} onChange={e => updateTime(i, 'end', e.target.value)} className="w-28 px-2 py-1.5 border border-cm-border rounded-lg text-xs font-semibold text-cm-text bg-cm-surface disabled:opacity-40 focus:outline-none focus:border-cm-accent" />
              </div>
            </div>
          ))}
        </div>
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
  const [section, setSection] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [scheduleEmp, setScheduleEmp] = useState(null);
  const [goalsEmp, setGoalsEmp] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceEmpId, setAttendanceEmpId] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Subscribe employees
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = subscribeEmployees(activeBranchId, setEmployees);
    return unsub;
  }, [activeBranchId]);

  // Subscribe today attendance
  useEffect(() => {
    if (!activeBranchId || section !== 'attendance') return;
    const unsub = subscribeTodayAttendance(activeBranchId, setAttendance);
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

  const activeCount = useMemo(() => employees.filter(e => e.active !== false).length, [employees]);

  const handleCreate = async (data) => {
    await createEmployee(activeBranchId, data);
  };

  const handleUpdate = async (data) => {
    await updateEmployee(activeBranchId, editingEmp.id, data);
  };

  const handleDelete = async (empId) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    await deleteEmployee(activeBranchId, empId);
  };

  const handleClockIn = async (empId) => {
    await clockIn(activeBranchId, empId);
  };

  const handleClockOut = async (empId) => {
    await clockOut(activeBranchId, empId);
  };

  const loadAttendanceHistory = async (empId) => {
    setAttendanceLoading(true);
    setAttendanceEmpId(empId);
    const data = await getAttendanceHistory(activeBranchId, empId);
    setAttendanceHistory(data);
    setAttendanceLoading(false);
  };

  // ── Section: Employee Directory ──────────────────

  const renderEmployees = () => (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-2xl font-black text-cm-text">{employees.length}</p>
          <p className="text-xs font-semibold text-cm-text-tertiary mt-0.5">Total</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-2xl font-black text-cm-success">{activeCount}</p>
          <p className="text-xs font-semibold text-cm-text-tertiary mt-0.5">Activos</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-2xl font-black text-cm-text">{employees.length - activeCount}</p>
          <p className="text-xs font-semibold text-cm-text-tertiary mt-0.5">Inactivos</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..." className="w-full pl-9 pr-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors" />
        </div>
        <button onClick={() => { setEditingEmp(null); setShowForm(true); }} className="px-4 py-2 bg-cm-accent text-white text-sm font-bold rounded-lg hover:bg-cm-accent-hover transition-colors flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-cm-text-secondary">No hay empleados {search ? 'que coincidan' : 'aún'}</p>
          </div>
        )}
        {filtered.map(emp => {
          const kpi = allOrders ? computeEmployeeKPI(allOrders, emp.id, emp.name) : null;
          const today = attendance[emp.id];
          return (
            <div key={emp.id} className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-cm-text">{emp.name}</h4>
                  {emp.active === false && <span className="text-[0.55rem] font-semibold bg-cm-error/10 text-cm-error px-1.5 py-0.5 rounded uppercase">Inactivo</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cm-text-secondary">
                  {emp.role && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{ROLES.find(r => r.value === emp.role)?.label || emp.role}</span>}
                  {emp.userId ? (
                    <span className="flex items-center gap-0.5 text-cm-success text-[10px]" title="Tiene acceso al sistema (usuario vinculado)"><LogIn className="w-3 h-3" /></span>
                  ) : emp.email && ['admin','cajero','kitchen','dispatch','mozo','vendedor'].includes(emp.role) && (
                    <span className="flex items-center gap-0.5 text-cm-warning text-[10px]" title="Sin acceso al sistema — crear usuario manualmente"><AlertTriangle className="w-3 h-3" /></span>
                  )}
                  {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                  {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                  {emp.hourlyRate > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{fmtCurrency(emp.hourlyRate)}/h</span>}
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
                <button onClick={() => handleDelete(emp.id)} className="p-2 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Section: Schedules ───────────────────────────

  const renderSchedules = () => {
    const withSchedule = employees.filter(e => e.active !== false);
    return (
      <div>
        <p className="text-sm text-cm-text-secondary mb-4">Gestiona los horarios semanales de cada empleado</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {withSchedule.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Calendar className="w-10 h-10 text-cm-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-cm-text-secondary">No hay empleados activos</p>
            </div>
          )}
          {withSchedule.map(emp => (
            <div key={emp.id} className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-cm-text">{emp.name}</p>
                <p className="text-xs text-cm-text-tertiary mt-0.5 capitalize">{emp.role}</p>
              </div>
              <button onClick={() => setScheduleEmp(emp)} className="px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors">
                Editar horario
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Section: Attendance ──────────────────────────

  const renderAttendance = () => {
    const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
      <div>
        <p className="text-sm text-cm-text-secondary mb-1 capitalize">{today}</p>

        {/* Clock in/out quick actions */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {employees.filter(e => e.active !== false).map(emp => {
            const record = attendance[emp.id];
            const isClockedIn = record && record.clockIn && !record.clockOut;
            return (
              <div key={emp.id} className="bg-cm-surface rounded-xl border border-cm-border p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-cm-text text-sm">{emp.name}</p>
                  <p className="text-xs text-cm-text-tertiary">{ROLES.find(r => r.value === emp.role)?.label || emp.role}</p>
                  {record && record.clockIn && (
                    <p className="text-[10px] font-semibold mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Entrada: {fmtTime(record.clockIn)}
                      {record.clockOut && <> · Salida: {fmtTime(record.clockOut)}</>}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {!isClockedIn ? (
                    <button onClick={() => handleClockIn(emp.id)} className="px-3 py-1.5 bg-cm-success text-white text-[10px] font-bold rounded-lg hover:bg-cm-success/80 transition-colors flex items-center gap-1">
                      <LogIn className="w-3 h-3" /> Entrada
                    </button>
                  ) : (
                    <button onClick={() => handleClockOut(emp.id)} className="px-3 py-1.5 bg-cm-error text-white text-[10px] font-bold rounded-lg hover:bg-cm-error/80 transition-colors flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> Salida
                    </button>
                  )}
                  <button onClick={() => loadAttendanceHistory(emp.id)} className="text-[10px] text-cm-accent font-semibold hover:underline">
                    Historial
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Attendance history modal */}
        <AnimatePresence>
          {attendanceEmpId && (
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
                      <div key={i} className="flex items-center justify-between p-2 bg-cm-bg-alt rounded-lg text-xs">
                        <span className="font-semibold text-cm-text">{r.date}</span>
                        <span className="text-cm-text-secondary">
                          {fmtTime(r.clockIn)} → {fmtTime(r.clockOut)}
                        </span>
                        <span className="text-cm-text-tertiary">
                          {r.clockIn && r.clockOut ? fmtDuration(r.clockOut - r.clockIn) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Section: Goals ───────────────────────────────

  const renderGoals = () => {
    const eligible = employees.filter(e => e.active !== false);
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

  // ── Render ───────────────────────────────────────

  return (
    <div>
      {/* Segmented nav */}
      <div className="flex gap-1 mb-6 p-1 bg-cm-bg-alt rounded-xl border border-cm-border w-fit">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${section === s.key ? 'bg-cm-surface shadow-sm text-cm-accent' : 'text-cm-text-tertiary hover:text-cm-text'}`}>
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'employees' && renderEmployees()}
      {section === 'schedules' && renderSchedules()}
      {section === 'attendance' && renderAttendance()}
      {section === 'goals' && renderGoals()}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <EmployeeForm employee={editingEmp} onSave={editingEmp ? handleUpdate : handleCreate} onClose={() => { setShowForm(false); setEditingEmp(null); }} />
        )}
        {scheduleEmp && (
          <ScheduleEditor employeeId={scheduleEmp.id} onClose={() => setScheduleEmp(null)} />
        )}
        {goalsEmp && (
          <GoalsModal employeeId={goalsEmp.id} onClose={() => setGoalsEmp(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
