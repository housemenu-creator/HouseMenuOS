import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  ShoppingCart, Download, Plus, X, Save, Loader2, Trash2, AlertTriangle, RefreshCw, Package
} from 'lucide-react';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { subscribeIngredients } from '../../lib/logisticsService';

// ── Animated Counter ──
function AnimatedCounter({ value, prefix = '', decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const startTime = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    from.current = display;
    startTime.current = null;
    const step = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(from.current + (value - from.current) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}</>;
}

function IntCounter({ value }) {
  return <>{value}</>;
}

// ── Modal ──
function ExpenseModal({ show, onClose, onSave, editing }) {
  const [form, setForm] = useState({ description: '', amount: '', category: 'Operativos', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setForm({ description: editing.description, amount: String(editing.amount), category: editing.category, date: editing.date });
    else setForm({ description: '', amount: '', category: 'Operativos', date: new Date().toISOString().split('T')[0] });
  }, [editing, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) });
      onClose();
    } catch {} finally { setSaving(false); }
  };

  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-cm-text mb-4">{editing ? 'Editar gasto' : 'Nuevo gasto'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Descripcion</label>
            <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Monto (S/)</label>
              <input type="number" step="0.5" min="0" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent">
                <option value="Operativos">Operativos</option>
                <option value="Insumos">Insumos</option>
                <option value="Planilla">Planilla</option>
                <option value="Servicios">Servicios</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Marketing">Marketing</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Constants ──
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

// ── Skeleton ──
function FinanzasSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between"><div className="h-6 w-24 bg-cm-border rounded" /><div className="h-8 w-48 bg-cm-border rounded" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="bg-cm-surface rounded-xl border border-cm-border p-4"><div className="h-3 w-16 bg-cm-border rounded mb-2" /><div className="h-7 w-24 bg-cm-border rounded" /></div>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="bg-cm-surface rounded-xl border border-cm-border p-4 h-16" />)}
      </div>
      <div className="bg-cm-surface rounded-xl border border-cm-border p-5 h-48" />
    </div>
  );
}

// ── Error State ──
function FinanzasError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cm-error/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-cm-error" />
      </div>
      <h2 className="text-lg font-bold text-cm-text">Error al cargar finanzas</h2>
      <p className="text-sm text-cm-muted font-medium mt-1">No se pudieron obtener los datos.</p>
      <button onClick={onRetry} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent-hover transition-colors flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}

// ── Empty State ──
function FinanzasEmpty({ onAddExpense }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cm-accent/10 flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-cm-accent" />
      </div>
      <h2 className="text-lg font-bold text-cm-text">Sin movimientos aún</h2>
      <p className="text-sm text-cm-muted font-medium mt-1 max-w-sm">No hay gastos registrados para este período. Agrega el primero.</p>
      <button onClick={onAddExpense} className="mt-6 px-5 py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent-hover transition-colors flex items-center gap-2">
        <Plus className="w-4 h-4" /> Nuevo gasto
      </button>
    </div>
  );
}

// ── Main ──
export default function FinanzasTab({ allOrders, activeBranchId, activeBranchName }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [period, setPeriod] = useState('month');
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => { setError(null); setLoading(true); setRetryKey(k => k + 1); }, []);
  const [ingredients, setIngredients] = useState([]);

  const getExpensesPath = () => `branches/${activeBranchId || 'monteverde'}/finanzas/gastos`;

  useEffect(() => {
    if (!activeBranchId) { setLoading(false); return; }
    setLoading(true);
    const refPath = ref(db, getExpensesPath());
    const unsub = onValue(refPath,
      (snap) => {
        const data = snap.val();
        setExpenses(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
        setLoading(false);
      },
      () => { setError('Error al conectar con Firebase'); setLoading(false); }
    );
    return unsub;
  }, [activeBranchId, retryKey]);

  useEffect(() => {
    if (!activeBranchId) return;
    return subscribeIngredients(activeBranchId, (data) => setIngredients(data || []));
  }, [activeBranchId]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredOrders = useMemo(() => {
    if (!allOrders?.length) return [];
    const activeOrdersOnly = allOrders.filter(o => o.status !== 'cancelado');
    if (period === 'day') {
      const dayStart = new Date(todayStr).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return activeOrdersOnly.filter(o => {
        const ts = o.createdAt || 0;
        return ts >= dayStart && ts < dayEnd;
      });
    }
    if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      return activeOrdersOnly.filter(o => {
        const ts = o.createdAt || 0;
        return ts >= monthStart && ts < monthEnd;
      });
    }
    return activeOrdersOnly;
  }, [allOrders, period]);

  const filteredExpenses = useMemo(() => {
    if (!expenses.length) return [];
    if (period === 'day') return expenses.filter(e => e.date === todayStr);
    if (period === 'month') return expenses.filter(e => (e.date || '').startsWith(monthStr));
    return expenses;
  }, [expenses, period, todayStr, monthStr]);

  const revenue = useMemo(() =>
    filteredOrders.reduce((s, o) => s + ((o.financials?.total || 0) - (o.refund?.amount || 0)), 0), [filteredOrders]);

  const totalExpenses = useMemo(() =>
    filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);

  const byMethod = useMemo(() => {
    const methods = {};
    filteredOrders.forEach(o => {
      const m = o.payment_method || 'Sin metodo';
      methods[m] = (methods[m] || 0) + ((o.financials?.total || 0) - (o.refund?.amount || 0));
    });
    return methods;
  }, [filteredOrders]);

  const byCategory = useMemo(() => {
    const cats = {};
    filteredExpenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + (e.amount || 0); });
    return cats;
  }, [filteredExpenses]);

  const orderCount = filteredOrders.length;
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
  const profit = revenue - totalExpenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const valorInventario = useMemo(() =>
    ingredients.reduce((s, i) => s + (Number(i.stock) * Number(i.cost) || 0), 0), [ingredients]);
  const autoCOGS = useMemo(() =>
    filteredExpenses
      .filter(e => e.source?.type === 'cogs')
      .reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);
  const gananciaReal = revenue - totalExpenses;

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) await set(ref(db, `${getExpensesPath()}/${editingExpense.id}`), data);
      else await push(ref(db, getExpensesPath()), data);
      setEditingExpense(null);
    } catch { setError('Error al guardar el gasto'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Eliminar este gasto?')) return;
    try { await remove(ref(db, `${getExpensesPath()}/${id}`)); }
    catch { setError('Error al eliminar el gasto'); }
  };

  const exportCSV = () => {
    const headers = ['Tipo', 'Descripcion', 'Monto', 'Metodo/Categoria', 'Fecha'];
    const rows = [
      ...filteredExpenses.map(e => ['Gasto', e.description, e.amount, e.category, e.date]),
      ...filteredOrders.map(o => ['Ingreso', o.customerName, (o.financials?.total || 0) - (o.refund?.amount || 0), o.payment_method, new Date(o.createdAt).toLocaleDateString('es-PE')]),
    ];
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-${activeBranchName || 'sucursal'}-${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (error && loading === false) return <FinanzasError onRetry={retry} />;
  if (loading) return <FinanzasSkeleton />;

  return (
    <motion.div
      key={retryKey}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Finanzas</h2>
          <p className="text-[10px] text-cm-muted font-medium">{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-cm-bg-alt rounded-lg border border-cm-border p-0.5">
            {['day', 'month', 'all'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === p ? 'bg-cm-accent text-white shadow-cm-sm' : 'text-cm-text-secondary hover:text-cm-text'}`}>
                {p === 'day' ? 'Hoy' : p === 'month' ? 'Este mes' : 'Todo'}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </motion.div>

      {/* ── KPIs ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-cm-success" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-cm-text">S/ <AnimatedCounter value={revenue} /></p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-cm-error" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Gastos</span>
          </div>
          <p className="text-2xl font-bold text-cm-text">S/ <AnimatedCounter value={totalExpenses} /></p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            {profit >= 0 ? <TrendingUp className="w-4 h-4 text-cm-success" /> : <TrendingDown className="w-4 h-4 text-cm-error" />}
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ganancia</span>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>S/ <AnimatedCounter value={profit} /></p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-cm-info" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Margen</span>
          </div>
          <p className={`text-2xl font-bold ${margin >= 20 ? 'text-cm-success' : margin >= 10 ? 'text-cm-warning' : 'text-cm-error'}`}><AnimatedCounter value={margin} decimals={1} />%</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-cm-info" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Valor inventario</span>
          </div>
          <p className="text-2xl font-bold text-cm-text">S/ <AnimatedCounter value={valorInventario} /></p>
        </div>
      </motion.div>

      {/* ── Ganancia Real ── */}
      <motion.div variants={itemVariants}>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ganancia real (Ingresos - Gastos totales)</p>
              <p className={`text-lg font-bold mt-1 ${gananciaReal >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>
                S/ {gananciaReal.toFixed(2)}
              </p>
            </div>
            <div className="text-right text-[0.55rem] text-cm-text-secondary">
              <p>Ingresos: S/ {revenue.toFixed(2)}</p>
              <p>Gastos: S/ {totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Ticket Promedio + Pedidos ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Ticket promedio</p>
          <p className="text-lg font-bold text-cm-text">S/ <AnimatedCounter value={avgTicket} /></p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Pedidos</p>
          <p className="text-lg font-bold text-cm-text">{orderCount}</p>
        </div>
      </motion.div>

      {/* ── Ingresos por método ── */}
      <motion.div variants={itemVariants} className="bg-cm-surface rounded-xl border border-cm-border p-5">
        <h3 className="text-sm font-bold text-cm-text mb-3">Ingresos por metodo de pago</h3>
        {Object.keys(byMethod).length === 0 ? (
          <p className="text-sm text-cm-text-secondary text-center py-4">Sin datos para este período</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${method === 'Efectivo' ? 'bg-cm-success' : method === 'Yape/Plin' ? 'bg-cm-info' : method === 'Tarjeta (POS)' ? 'bg-cm-accent' : 'bg-cm-warning'}`} />
                  <span className="text-sm font-medium text-cm-text">{method}</span>
                </div>
                <span className="text-sm font-semibold text-cm-text">S/ {amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Gastos ── */}
      <motion.div variants={itemVariants} className="bg-cm-surface rounded-xl border border-cm-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-cm-text">Gastos</h3>
            <p className="text-[10px] text-cm-muted font-medium">{filteredExpenses.length} registros</p>
          </div>
          <button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo gasto
          </button>
        </div>

        {Object.keys(byCategory).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(byCategory).map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cm-error/5 rounded-lg text-xs">
                <span className="font-medium text-cm-text-secondary">{cat}</span>
                <span className="font-bold text-cm-error">S/ {amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <FinanzasEmpty onAddExpense={() => { setEditingExpense(null); setShowExpenseModal(true); }} />
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between py-2 border-b border-cm-border/50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cm-text truncate">
                    {e.description}
                    {e.source ? (
                      <span className="text-[0.5rem] font-semibold bg-cm-info/10 text-cm-info px-1 py-0.5 rounded ml-1">auto</span>
                    ) : (
                      <span className="text-[0.5rem] font-semibold bg-cm-bg-alt text-cm-text-secondary px-1 py-0.5 rounded ml-1">manual</span>
                    )}
                  </p>
                  <p className="text-xs text-cm-text-secondary">{e.category} — {e.date ? new Date(e.date).toLocaleDateString('es-PE') : '—'}</p>
                  {e.source?.refDescription && (
                    <p className="text-[0.5rem] text-cm-info">Fuente: {e.source.refDescription}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-sm font-semibold text-cm-error">- S/ {(e.amount || 0).toFixed(2)}</span>
                  <button onClick={() => { setEditingExpense(e); setShowExpenseModal(true); }} className="p-1 text-cm-text-tertiary hover:text-cm-accent transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDeleteExpense(e.id)} className="p-1 text-cm-text-tertiary hover:text-cm-error transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <ExpenseModal
        show={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        onSave={handleSaveExpense}
        editing={editingExpense}
      />
    </motion.div>
  );
}
