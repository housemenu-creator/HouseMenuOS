import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ImageIcon, Loader2 } from 'lucide-react';
import { normalizeFirebaseData } from '../../../lib/normalizeFirebaseData';
import { storageService } from '../../../lib/storageService';
import EmojiPicker from '../EmojiPicker';
import { useBranch } from '../../../context/BranchContext';
import type { WizardStep, WizardOption, MenuProduct } from '../../types';

interface WizardConfigModalProps {
  open: boolean;
  product: (MenuProduct & { id: string }) | null;
  onSave: (id: string, steps: WizardStep[]) => Promise<void> | void;
  onClose: () => void;
}

let idCounter = 0;
const uid = (prefix: string): string => `${prefix}_${Date.now()}_${++idCounter}`;

// ── OptionRow sub-component ──

interface OptionRowProps {
  opt: WizardOption;
  onChange: (opt: WizardOption) => void;
  onRemove: () => void;
}

function OptionRow({ opt, onChange, onRemove }: OptionRowProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeBranchId } = useBranch();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId) return;
    setUploading(true);
    try {
      const result = await storageService.uploadOptionImage(activeBranchId, opt.id, file);
      onChange({ ...opt, image: result.url, imagePath: result.path });
    } catch (err) {
      console.error('Error uploading option image:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (opt.imagePath) {
      storageService.deleteImage(opt.imagePath).catch(() => {});
    }
    onChange({ ...opt, image: null as unknown as string | undefined, imagePath: null as unknown as string | undefined });
  };

  const handleStockToggle = () => {
    if (opt.trackStock) {
      onChange({ ...opt, trackStock: false, stock: 0 });
    } else {
      onChange({ ...opt, trackStock: true, stock: 10 });
    }
  };

  return (
    <div className="flex items-center gap-2 bg-cm-bg/50 rounded-lg p-2 border border-cm-border group hover:border-cm-border transition-colors">
      <GripVertical className="w-3 h-3 text-cm-muted shrink-0" />

      {/* Image preview OR icon picker */}
      <div className="relative shrink-0">
        {opt.image ? (
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-cm-border group/image">
            <img src={opt.image} alt="" className="w-full h-full object-cover" />
            <button
              onClick={handleRemoveImage}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center"
              title="Quitar imagen"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ) : uploading ? (
          <div className="w-9 h-9 rounded-lg bg-cm-bg-alt border border-cm-border flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-cm-accent animate-spin" />
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="w-7 h-7 rounded-lg bg-cm-surface border border-cm-border text-center text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center"
              title="Cambiar icono"
            >
              {opt.icon || '📍'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-lg bg-cm-surface border border-cm-border hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center text-cm-muted hover:text-emerald-600"
              title="Subir imagen"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <EmojiPicker open={showEmoji} onSelect={(emoji: string) => { onChange({ ...opt, icon: emoji }); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <input
        value={opt.name || ''}
        onChange={(e) => onChange({ ...opt, name: e.target.value })}
        placeholder="Nombre (ej. Pollo)"
        className="flex-1 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-bold text-cm-text focus:outline-none focus:border-cm-accent placeholder:text-cm-muted"
      />

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-bold text-cm-muted">S/</span>
        <input
          type="number"
          step="0.5"
          min="0"
          value={opt.price ?? 0}
          onChange={(e) => onChange({ ...opt, price: parseFloat(e.target.value) || 0 })}
          className="w-14 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-black text-cm-accent text-right focus:outline-none focus:border-cm-accent"
        />
      </div>

      {opt.trackStock ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[8px] font-black text-white bg-cm-accent px-1 py-0.5 rounded uppercase tracking-wider">ST</span>
          <input
            type="number"
            min="0"
            value={opt.stock ?? 0}
            onChange={(e) => onChange({ ...opt, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            className="w-10 px-1 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-bold text-cm-text text-center focus:outline-none focus:border-cm-accent"
          />
          <button
            onClick={() => onChange({ ...opt, trackStock: false, stock: 0 })}
            className="text-[8px] font-bold text-red-500 hover:text-red-700 uppercase px-1 py-0.5 rounded hover:bg-red-50 transition-colors"
            title="Desactivar stock"
          >
            ∞
          </button>
        </div>
      ) : (
        <button
          onClick={handleStockToggle}
          className="text-[9px] font-bold text-cm-muted hover:text-cm-accent bg-cm-surface hover:bg-indigo-50 px-1.5 py-1 rounded-lg border border-cm-border hover:border-indigo-300 transition-all shrink-0 uppercase tracking-wider"
          title="Controlar stock de esta opción"
        >
          Stock
        </button>
      )}

      <button onClick={onRemove} className="p-1 text-cm-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── StepEditor sub-component ──

interface StepEditorProps {
  step: WizardStep;
  index: number;
  onChange: (step: WizardStep) => void;
  onRemove: () => void;
}

function StepEditor({ step, index, onChange, onRemove }: StepEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const addOption = () => {
    const newOpt: WizardOption = { id: uid('opt'), name: '', price: 0, icon: '📍', trackStock: false, stock: 0 };
    onChange({ ...step, options: [...(step.options || []), newOpt] });
  };

  const updateOption = (oi: number, updated: WizardOption) => {
    const opts = [...(step.options || [])];
    opts[oi] = updated;
    onChange({ ...step, options: opts });
  };

  const removeOption = (oi: number) => {
    const opts = (step.options || []).filter((_, i) => i !== oi);
    onChange({ ...step, options: opts });
  };

  const cycleType = () => {
    const next = step.type === 'single' ? 'multiple' as const : step.type === 'multiple' ? 'auto' as const : 'single' as const;
    onChange({ ...step, type: next });
  };

  return (
    <div className="bg-cm-surface rounded-xl border border-indigo-200 shadow-sm">
      <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border-b border-indigo-100 rounded-t-xl">
        <GripVertical className="w-4 h-4 text-indigo-300 shrink-0" />
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider shrink-0">Paso {index + 1}</span>
        <input
          value={step.title || ''}
          onChange={(e) => onChange({ ...step, title: e.target.value })}
          placeholder="Nombre del paso (ej. Elige tu proteína)"
          className="flex-1 px-2 py-1 rounded-lg border border-indigo-200 bg-cm-surface text-xs font-bold text-cm-text focus:outline-none focus:border-indigo-400 placeholder:text-cm-muted"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-bold text-cm-muted uppercase">Tipo</span>
          <button
            onClick={cycleType}
            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
              step.type === 'multiple'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : step.type === 'auto'
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-cm-border text-cm-muted border-cm-border'
            }`}
          >
            {step.type === 'multiple' ? 'Multiple' : step.type === 'auto' ? 'Auto' : 'Single'}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar paso">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {(step.options || []).length === 0 ? (
            <p className="text-[11px] text-cm-muted font-medium text-center py-2">Aún no hay opciones. Agrega la primera.</p>
          ) : (
            (step.options || []).map((opt, oi) => (
              <OptionRow
                key={opt.id || oi}
                opt={opt}
                onChange={(updated) => updateOption(oi, updated)}
                onRemove={() => removeOption(oi)}
              />
            ))
          )}
          <button onClick={addOption}
            className="w-full py-2 border-2 border-dashed border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Agregar opción
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export default function WizardConfigModal({ open, product, onSave, onClose }: WizardConfigModalProps) {
  const [steps, setSteps] = useState<WizardStep[]>([]);

  useEffect(() => {
    if (!open || !product) return;
    const normalized = normalizeFirebaseData(product.steps);
    const initial = Array.isArray(normalized) ? normalized : [];
    if (initial.length === 0) {
      setSteps([{ id: uid('step'), title: '', type: 'single', options: [] }]);
    } else {
      setSteps(initial.map((s: WizardStep) => ({
        ...s,
        options: Array.isArray(s.options) ? s.options.map((o: WizardOption) => ({
          ...o,
          trackStock: o.trackStock === true,
          stock: typeof o.stock === 'number' ? o.stock : 0,
        })) : [],
      })));
    }
  }, [open, product]);

  const addStep = () => {
    setSteps([...steps, { id: uid('step'), title: '', type: 'single' as const, options: [] }]);
  };

  const updateStep = (index: number, updated: WizardStep) => {
    const next = [...steps];
    next[index] = updated;
    setSteps(next);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const valid = steps.filter(s => s.title?.trim());
    if (valid.length === 0) return;
    await onSave(product!.id, valid);
    onClose();
  };

  const stepCount = steps.filter(s => s.title?.trim()).length;
  const optionCount = steps.reduce((sum, s) => sum + (s.options || []).filter(o => o.name?.trim()).length, 0);
  const stockCount = steps.reduce((sum, s) => sum + (s.options || []).filter(o => o.trackStock).length, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-cm-bg rounded-2xl shadow-2xl border border-cm-border w-[680px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-cm-surface border-b border-cm-border shrink-0">
              <div>
                <h3 className="text-sm font-black text-cm-text uppercase tracking-wider">Configurar Pasos del Combo</h3>
                <p className="text-xs text-cm-muted font-medium mt-0.5">{product?.name}</p>
              </div>
              <button onClick={onClose} className="p-1 text-cm-muted hover:text-cm-text rounded-lg hover:bg-cm-bg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {steps.map((step, i) => (
                <StepEditor
                  key={step.id || i}
                  step={step}
                  index={i}
                  onChange={(s) => updateStep(i, s)}
                  onRemove={() => removeStep(i)}
                />
              ))}

              <button onClick={addStep}
                className="w-full py-3 border-2 border-dashed border-cm-border rounded-xl text-sm font-bold text-cm-muted hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar Paso
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-cm-surface border-t border-cm-border shrink-0">
              <span className="text-xs font-bold text-cm-muted">
                {stepCount} paso{stepCount !== 1 ? 's' : ''} · {optionCount} opcion{optionCount !== 1 ? 'es' : ''}
                {stockCount > 0 && <span className="ml-2 text-cm-accent">· {stockCount} con stock</span>}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border-2 border-cm-border text-sm font-black text-cm-muted hover:bg-cm-bg transition-all">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  disabled={stepCount === 0}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all shadow-cm-md ${
                    stepCount === 0 ? 'bg-cm-border cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}>
                  Guardar ({stepCount} paso{stepCount !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
