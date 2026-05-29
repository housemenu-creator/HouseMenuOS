import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, Landmark,
  ShoppingCart, UtensilsCrossed, Download, Plus, X, Save, Loader2, Trash2
} from 'lucide-react';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { useBranch } from '../../context/BranchContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

function ExpenseModal({ show, onClose, onSave, editing }) {
  const [form, setForm] = useState({ description: '', amount: '', category: 'Operativos', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) setForm({ description: editing.description, amount: String(editing.amount), category: editing.category, date: editing.date });
  }, [editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) });
    setSaving(false);
    onClose();
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

export default function FinanzasTab({ allOrders, activeBranchId, activeBranchName }) {
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [period, setPeriod] = useState('month');

  const getExpensesPath = () => `branches/${activeBranchId || 'hq'}/finanzas/gastos`;

  useEffect(() => {
    if (!activeBranchId) return;
    const refPath = ref(db, getExpensesPath());
    const unsub = onValue(refPath, (snap) => {
      const data = snap.val();
      if (!data) { setExpenses([]); return; }
      setExpenses(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return unsub;
  }, [activeBranchId]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredOrders = useMemo(() => {
    if (period === 'day') return allOrders.filter(o => (o.createdAt || '').startsWith(todayStr));
    if (period === 'month') return allOrders.filter(o => (o.createdAt || '').startsWith(monthStr));
    return allOrders;
  }, [allOrders, period, todayStr, monthStr]);

  const filteredExpenses = useMemo(() => {
    if (period === 'day') return expenses.filter(e => e.date === todayStr);
    if (period === 'month') return expenses.filter(e => (e.date || '').startsWith(monthStr));
    return expenses;
  }, [expenses, period, todayStr, monthStr]);

  const revenue = useMemo(() =>
    filteredOrders.reduce((s, o) => s + (o.financials?.total || 0), 0), [filteredOrders]);

  const totalExpenses = useMemo(() =>
    filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);

  const byMethod = useMemo(() => {
    const methods = {};
    filteredOrders.forEach(o => {
      const m = o.payment_method || 'Sin metodo';
      methods[m] = (methods[m] || 0) + (o.financials?.total || 0);
    });
    return methods;
  }, [filteredOrders]);

  const byCategory = useMemo(() => {
    const cats = {};
    filteredExpenses.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + (e.amount || 0);
    });
    return cats;
  }, [filteredExpenses]);

  const orderCount = filteredOrders.length;
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
  const profit = revenue - totalExpenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const handleSaveExpense = async (data) => {
    if (editingExpense) {
      await set(ref(db, `${getExpensesPath()}/${editingExpense.id}`), data);
    } else {
      await push(ref(db, getExpensesPath()), data);
    }
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Eliminar este gasto?')) return;
    await remove(ref(db, `${getExpensesPath()}/${id}`));
  };

  const exportCSV = () => {
    const headers = ['Tipo', 'Descripcion', 'Monto', 'Metodo/Categoria', 'Fecha'];
    const rows = [
      ...filteredExpenses.map(e => ['Gasto', e.description, e.amount, e.category, e.date]),
      ...filteredOrders.map(o => ['Ingreso', o.customerName, o.financials?.total || 0, o.payment_method, new Date(o.createdAt).toLocaleDateString('es-PE')]),
    ];
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-${activeBranchName}-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Finanzas</h2>
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-cm-success" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-cm-text">S/ {revenue.toFixed(2)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-cm-error" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Gastos</span>
          </div>
          <p className="text-2xl font-bold text-cm-text">S/ {totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            {profit >= 0 ? <TrendingUp className="w-4 h-4 text-cm-success" /> : <TrendingDown className="w-4 h-4 text-cm-error" />}
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Ganancia</span>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>S/ {profit.toFixed(2)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-cm-info" />
            <span className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Margen</span>
          </div>
          <p className={`text-2xl font-bold ${margin >= 20 ? 'text-cm-success' : margin >= 10 ? 'text-cm-warning' : 'text-cm-error'}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Ticket promedio + Pedidos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Ticket promedio</p>
          <p className="text-lg font-bold text-cm-text">S/ {avgTicket.toFixed(2)}</p>
        </div>
        <div className="bg-cm-surface rounded-xl border border-cm-border p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Pedidos</p>
          <p className="text-lg font-bold text-cm-text">{orderCount}</p>
        </div>
      </div>

      {/* Ingresos por método */}
      <div className="bg-cm-surface rounded-xl border border-cm-border p-5">
        <h3 className="text-sm font-semibold text-cm-text mb-3">Ingresos por metodo de pago</h3>
        <div className="space-y-3">
          {Object.entries(byMethod).length === 0 && <p className="text-sm text-cm-text-secondary">Sin datos</p>}
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
      </div>

      {/* Gastos por categoría + lista */}
      <div className="bg-cm-surface rounded-xl border border-cm-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cm-text">Gastos</h3>
          <button onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
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

        <div className="space-y-2">
          {filteredExpenses.length === 0 && <p className="text-sm text-cm-text-secondary">Sin gastos registrados</p>}
          {filteredExpenses.map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-cm-border/50 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-cm-text">{e.description}</p>
                <p className="text-xs text-cm-text-secondary">{e.category} — {new Date(e.date).toLocaleDateString('es-PE')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-cm-error">- S/ {(e.amount || 0).toFixed(2)}</span>
                <button onClick={() => { setEditingExpense(e); setShowExpenseModal(true); }} className="p-1 text-cm-text-tertiary hover:text-cm-accent transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDeleteExpense(e.id)} className="p-1 text-cm-text-tertiary hover:text-cm-error transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ExpenseModal
        show={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        onSave={handleSaveExpense}
        editing={editingExpense}
      />
    </div>
  );
}
