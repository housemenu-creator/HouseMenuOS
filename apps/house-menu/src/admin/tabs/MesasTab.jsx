import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Plus, Edit2, Trash2, X, Check, Users,
  UtensilsCrossed, ReceiptText, Circle, Loader2,
} from 'lucide-react';
import { tableService } from '../../lib/tableService';
import { useToast } from '../../components/ToastContext';
import { confirmDialog } from '../../components/ConfirmDialog';

// ─── Constantes ────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'salon',   label: 'Salón'   },
  { key: 'terraza', label: 'Terraza' },
  { key: 'barra',   label: 'Barra'   },
];

const STATUS_CONFIG = {
  libre:         { label: 'Libre',          color: 'bg-cm-success',  dot: 'bg-cm-success',  ring: 'ring-cm-success/30'  },
  ocupada:       { label: 'Ocupada',        color: 'bg-cm-warning',  dot: 'bg-cm-warning',  ring: 'ring-cm-warning/30'  },
  cuenta_pedida: { label: 'Cuenta pedida', color: 'bg-cm-error',    dot: 'bg-cm-error',    ring: 'ring-cm-error/30'    },
};

// ─── Modal crear/editar mesa ───────────────────────────────────────────────
function TableModal({ initial, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    number:   initial?.number   ?? '',
    name:     initial?.name     ?? '',
    capacity: initial?.capacity ?? 4,
    section:  initial?.section  ?? 'salon',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const isEdit = !!initial?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.number) return;
    onSave({
      ...form,
      number: Number(form.number),
      name: form.name.trim() || `Mesa ${form.number}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-cm-surface rounded-2xl shadow-cm-lg w-full max-w-sm p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-cm-text">{isEdit ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Número *</label>
              <input
                type="number" min="1" required
                value={form.number}
                onChange={e => set('number', e.target.value)}
                className="w-full bg-cm-bg border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Capacidad</label>
              <input
                type="number" min="1" max="20"
                value={form.capacity}
                onChange={e => set('capacity', Number(e.target.value))}
                className="w-full bg-cm-bg border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Nombre (opcional)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-cm-bg border border-cm-border rounded-lg px-3 py-2 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
              placeholder={`Mesa ${form.number || '?'}`}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-2">Sección</label>
            <div className="flex gap-2">
              {SECTIONS.map(s => (
                <button
                  key={s.key} type="button"
                  onClick={() => set('section', s.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    form.section === s.key
                      ? 'bg-cm-accent text-white shadow-sm'
                      : 'bg-cm-bg border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.number}
            className="w-full py-2.5 bg-cm-accent text-white rounded-xl text-sm font-bold hover:bg-cm-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear mesa'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Card de mesa ──────────────────────────────────────────────────────────
function TableCard({ table, onEdit, onDelete, onStatusChange }) {
  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.libre;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative bg-cm-surface border border-cm-border rounded-2xl p-4 space-y-3 ring-2 ${cfg.ring} transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-black text-cm-text leading-none">{table.name || `Mesa ${table.number}`}</p>
          <p className="text-xs text-cm-text-secondary mt-0.5 capitalize">{table.section || 'salón'}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-bold ${cfg.color}`}>
          <Circle className="w-2 h-2 fill-white" />
          {cfg.label}
        </div>
      </div>

      {/* Capacidad */}
      <div className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
        <Users className="w-3.5 h-3.5" />
        <span>{table.capacity} personas</span>
      </div>

      {/* Cambiar estado */}
      <div className="flex gap-1.5">
        {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => onStatusChange(table.id, key)}
            disabled={table.status === key}
            className={`flex-1 py-1.5 rounded-lg text-[0.65rem] font-bold transition-all ${
              table.status === key
                ? `${color} text-white opacity-100 cursor-default`
                : 'bg-cm-bg border border-cm-border text-cm-text-secondary hover:border-cm-accent/50 opacity-70 hover:opacity-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1 border-t border-cm-border">
        <button
          onClick={() => onEdit(table)}
          className="flex items-center gap-1 text-xs text-cm-text-secondary hover:text-cm-accent transition-colors"
        >
          <Edit2 className="w-3 h-3" /> Editar
        </button>
        <button
          onClick={() => onDelete(table)}
          className="flex items-center gap-1 text-xs text-cm-text-secondary hover:text-cm-error transition-colors ml-auto"
        >
          <Trash2 className="w-3 h-3" /> Eliminar
        </button>
      </div>
    </motion.div>
  );
}

// ─── MesasTab principal ────────────────────────────────────────────────────
export default function MesasTab({ activeBranchId }) {
  const showToast = useToast();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // null | { initial?: Table }
  const [sectionFilter, setSectionFilter] = useState('all');

  // Suscripción realtime
  useEffect(() => {
    if (!activeBranchId) return;
    setLoading(true);
    const unsub = tableService.subscribeToTables(activeBranchId, (data) => {
      setTables(data);
      setLoading(false);
    });
    return unsub;
  }, [activeBranchId]);

  // Estadísticas
  const stats = {
    total:         tables.length,
    libre:         tables.filter(t => t.status === 'libre').length,
    ocupada:       tables.filter(t => t.status === 'ocupada').length,
    cuenta_pedida: tables.filter(t => t.status === 'cuenta_pedida').length,
  };

  // Filtro por sección
  const filtered = sectionFilter === 'all'
    ? tables
    : tables.filter(t => t.section === sectionFilter);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async (formData) => {
    if (!activeBranchId) return;
    setSaving(true);
    let result;
    if (modal?.initial?.id) {
      result = await tableService.updateTable(activeBranchId, modal.initial.id, formData);
    } else {
      result = await tableService.createTable(activeBranchId, formData);
    }
    setSaving(false);
    if (result.success) {
      showToast(modal?.initial?.id ? 'Mesa actualizada' : 'Mesa creada');
      setModal(null);
    } else {
      showToast('Error al guardar', 'error');
    }
  }, [activeBranchId, modal, showToast]);

  const handleDelete = useCallback(async (table) => {
    const confirmed = await confirmDialog(`¿Eliminar ${table.name || `Mesa ${table.number}`}?`);
    if (!confirmed) return;
    const result = await tableService.deleteTable(activeBranchId, table.id);
    if (result.success) showToast('Mesa eliminada');
    else showToast('Error al eliminar', 'error');
  }, [activeBranchId, showToast]);

  const handleStatusChange = useCallback(async (tableId, status) => {
    await tableService.setTableStatus(activeBranchId, tableId, status);
  }, [activeBranchId]);

  const handleSeed = useCallback(async () => {
    const confirmed = await confirmDialog('¿Crear 10 mesas predeterminadas (Mesa 1 – Mesa 10)?');
    if (!confirmed) return;
    setSaving(true);
    const result = await tableService.seedTables(activeBranchId, 10);
    setSaving(false);
    if (result.success) {
      showToast(result.skipped ? 'Ya existen mesas configuradas' : '10 mesas creadas correctamente');
    }
  }, [activeBranchId, showToast]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-cm-text flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-cm-accent" />
            Administración de Mesas
          </h2>
          <p className="text-xs text-cm-text-secondary mt-0.5">Gestión del plano de sala en tiempo real</p>
        </div>
        <div className="flex gap-2">
          {tables.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:border-cm-accent/50 transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Crear mesas por defecto
            </button>
          )}
          <button
            onClick={() => setModal({ initial: undefined })}
            className="flex items-center gap-1.5 px-3 py-2 bg-cm-accent text-white rounded-lg text-xs font-bold hover:bg-cm-accent/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Mesa
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: LayoutGrid, color: 'text-cm-text' },
          { label: 'Libres',         value: stats.libre,         icon: Circle,      color: 'text-cm-success' },
          { label: 'Ocupadas',       value: stats.ocupada,       icon: UtensilsCrossed, color: 'text-cm-warning' },
          { label: 'Cuenta pedida',  value: stats.cuenta_pedida, icon: ReceiptText,  color: 'text-cm-error'   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-cm-surface border border-cm-border rounded-xl p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-xl font-black text-cm-text">{value}</p>
              <p className="text-xs text-cm-text-secondary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro de sección */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSectionFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sectionFilter === 'all' ? 'bg-cm-accent text-white' : 'bg-cm-bg border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}
        >
          Todas
        </button>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSectionFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${sectionFilter === s.key ? 'bg-cm-accent text-white' : 'bg-cm-bg border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}
          >
            {s.label} ({tables.filter(t => t.section === s.key).length})
          </button>
        ))}
      </div>

      {/* Grid de mesas */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-cm-text-secondary">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Sin mesas configuradas</p>
          <p className="text-xs mt-1">Crea una mesa o usa "Crear mesas por defecto"</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <AnimatePresence>
            {filtered.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={t => setModal({ initial: t })}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal !== null && (
          <TableModal
            initial={modal.initial}
            onClose={() => setModal(null)}
            onSave={handleSave}
            loading={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
