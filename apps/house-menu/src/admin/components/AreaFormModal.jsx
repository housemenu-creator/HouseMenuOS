import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const defaultChecklistItem = () => ({ name: '', description: '' });

export default function AreaFormModal({ area, onSave, onClose }) {
  const isEditing = !!area;
  const [name, setName] = useState(area?.name || '');
  const [stations, setStations] = useState(area?.stations || ['']);
  const [checklists, setChecklists] = useState(
    area?.checklists || { inicio: [defaultChecklistItem()], cierre: [defaultChecklistItem()] }
  );
  const [confirmClose, setConfirmClose] = useState(false);

  const hasUnsaved = name !== (area?.name || '') ||
    JSON.stringify(stations) !== JSON.stringify(area?.stations || ['']) ||
    JSON.stringify(checklists) !== JSON.stringify(area?.checklists || { inicio: [defaultChecklistItem()], cierre: [defaultChecklistItem()] });

  const validate = () => {
    if (!name.trim()) return false;
    const validStations = stations.filter(s => s.trim());
    const validInicio = checklists.inicio.filter(i => i.name.trim());
    const validCierre = checklists.cierre.filter(c => c.name.trim());
    return validStations.length > 0 || validInicio.length > 0 || validCierre.length > 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      stations: stations.filter(s => s.trim()),
      checklists: {
        inicio: checklists.inicio.filter(i => i.name.trim()),
        cierre: checklists.cierre.filter(c => c.name.trim()),
      },
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] pb-8 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={() => { if (hasUnsaved) setConfirmClose(true); else onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-cm-surface rounded-2xl shadow-2xl border border-cm-border w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cm-border">
            <h3 className="text-sm font-black text-cm-text uppercase tracking-wider">
              {isEditing ? 'Editar área' : 'Nueva área'}
            </h3>
            <button onClick={() => { if (hasUnsaved) setConfirmClose(true); else onClose(); }}
              className="p-1 text-cm-muted hover:text-cm-text rounded-lg hover:bg-cm-bg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-cm-muted mb-1.5 block">Nombre del área</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Cocina, Barra, Salón..."
                className="w-full px-3 py-2.5 rounded-xl border-2 border-cm-border bg-cm-bg text-sm font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
              />
            </div>

            {/* Stations */}
            <div>
              <label className="text-xs font-bold text-cm-muted mb-1.5 block">Estaciones</label>
              <p className="text-[10px] text-cm-muted mb-2">Puestos específicos dentro del área (opcional)</p>
              <div className="space-y-2">
                {stations.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={s} onChange={(e) => {
                      const next = [...stations]; next[i] = e.target.value; setStations(next);
                    }} placeholder="Ej: Parrilla, Freidora, Barra 1..."
                      className="flex-1 px-3 py-2 rounded-xl border-2 border-cm-border bg-cm-bg text-xs font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
                    />
                    {stations.length > 1 && (
                      <button onClick={() => setStations(stations.filter((_, j) => j !== i))}
                        className="p-1.5 text-cm-muted hover:text-cm-error rounded-lg hover:bg-cm-error/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setStations([...stations, ''])}
                className="mt-2 text-xs font-bold text-cm-accent hover:text-cm-accent-hover transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar estación
              </button>
            </div>

            {/* Checklist: Inicio */}
            <ChecklistSection
              label="Checklist de inicio"
              description="Tareas al comenzar el turno"
              items={checklists.inicio}
              onChange={(items) => setChecklists(prev => ({ ...prev, inicio: items }))}
              tallyClass="text-cm-success"
            />

            {/* Checklist: Cierre */}
            <ChecklistSection
              label="Checklist de cierre"
              description="Tareas al finalizar el turno"
              items={checklists.cierre}
              onChange={(items) => setChecklists(prev => ({ ...prev, cierre: items }))}
              tallyClass="text-cm-warning"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 p-4 border-t border-cm-border">
            <button onClick={() => { if (hasUnsaved) setConfirmClose(true); else onClose(); }}
              className="flex-1 py-2.5 rounded-xl border-2 border-cm-border text-sm font-black text-cm-muted hover:bg-cm-bg transition-all">
              Cancelar
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-cm-accent text-white text-sm font-black hover:bg-cm-accent-hover transition-all shadow-cm-md disabled:opacity-40"
              disabled={!name.trim()}>
              {isEditing ? 'Guardar cambios' : 'Crear área'}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Confirm close dialog */}
      {confirmClose && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40"
          onClick={() => setConfirmClose(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-cm-surface rounded-2xl shadow-2xl border border-cm-border w-[320px] p-4"
          >
            <p className="text-sm font-bold text-cm-text mb-4">¿Descartar cambios sin guardar?</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmClose(false)}
                className="flex-1 py-2 rounded-xl border-2 border-cm-border text-xs font-black text-cm-muted hover:bg-cm-bg transition-all">
                Seguir editando
              </button>
              <button onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-cm-error text-white text-xs font-black hover:bg-cm-error/80 transition-all shadow-cm-md">
                Descartar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Checklist Section Sub-component ── */

function ChecklistSection({ label, description, items, onChange, tallyClass = 'text-cm-accent' }) {
  const addItem = () => onChange([...items, { name: '', description: '' }]);
  const removeItem = (i) => onChange(items.filter((_, j) => j !== i));
  const updateItem = (i, field, value) => {
    const next = items.map((item, j) => j === i ? { ...item, [field]: value } : item);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-cm-muted">{label}</label>
        <span className={`text-[10px] font-bold ${tallyClass}`}>{items.filter(i => i.name.trim()).length} items</span>
      </div>
      <p className="text-[10px] text-cm-muted mb-2">{description}</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-cm-bg rounded-xl border border-cm-border p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <input type="text" value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)}
                placeholder="Nombre del item..."
                className="flex-1 px-2 py-1.5 rounded-lg border-2 border-cm-border bg-cm-surface text-xs font-bold text-cm-text focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)}
                  className="p-1 text-cm-muted hover:text-cm-error rounded-lg hover:bg-cm-error/10 transition-colors shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <input type="text" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
              placeholder="Descripción opcional..."
              className="w-full px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-[10px] font-medium text-cm-text-secondary focus:border-cm-accent focus:outline-none transition-colors placeholder:text-cm-muted"
            />
          </div>
        ))}
      </div>

      <button onClick={addItem}
        className="mt-2 text-xs font-bold text-cm-accent hover:text-cm-accent-hover transition-colors flex items-center gap-1">
        <Plus className="w-3 h-3" /> Agregar item
      </button>
    </div>
  );
}
