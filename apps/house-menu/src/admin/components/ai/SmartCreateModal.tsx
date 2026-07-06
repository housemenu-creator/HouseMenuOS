import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Sparkles, Save, ArrowRight } from 'lucide-react';
import { AIProcessingDisplay } from './AIProcessingDisplay';
import { useAIProduct } from '../../hooks/useAIProduct';
import type { ProductDescription } from '../../../lib/aiService';

interface SmartCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  categories: string[];
  onProductCreated: (productId: string, productName: string) => void;
}

type Step = 'upload' | 'processing' | 'form' | 'done';

export function SmartCreateModal({ isOpen, onClose, branchId, categories, onProductCreated }: SmartCreateModalProps) {
  const { processing, progress, steps, result, error, analyze, saveProduct, reset } = useAIProduct(branchId);
  const [step, setStep] = useState<Step>('upload');
  const [form, setForm] = useState<ProductDescription>({
    name: '',
    description: '',
    price: 0,
    category: '',
    tags: [],
    isSpicy: false,
    isVegan: false,
    isGlutenFree: false,
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      reset();
      setStep('upload');
      setSaving(false);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (result) {
      setForm(result);
      setStep('form');
    }
  }, [result]);

  useEffect(() => {
    if (error) setStep('upload');
  }, [error]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setStep('processing');
      await analyze(file, categories);
    },
    [analyze, categories]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    const id = await saveProduct(form);
    if (id) {
      setStep('done');
      onProductCreated(id, form.name);
    }
    setSaving(false);
  }, [form, saveProduct, onProductCreated]);

  const handleCreateCampaign = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cm-accent" />
            <h2 className="text-sm font-black text-cm-text tracking-tight">✨ Smart Create</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
            <X className="w-4 h-4 text-cm-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-cm-border hover:border-cm-accent/50 rounded-xl p-10 text-center cursor-pointer transition-colors group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-2xl bg-cm-accent/10 text-cm-accent group-hover:scale-105 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-cm-text">Tomar foto o subir imagen</p>
                      <p className="text-xs text-cm-text-tertiary mt-1">Arrastra una imagen o haz clic para seleccionar</p>
                    </div>
                    <span className="text-[10px] font-semibold text-cm-text-muted bg-cm-bg px-3 py-1 rounded-full">
                      JPG, PNG — Máx 10MB
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-cm-error/10 border border-cm-error/20 text-xs font-semibold text-cm-error">
                    {error}
                  </div>
                )}

                {/* Upload from gallery */}
                <button
                  onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = 'image/*';
                    inp.onchange = (e: Event) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) handleFile(f);
                    };
                    inp.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cm-border text-xs font-bold text-cm-text-secondary hover:border-cm-accent/40 hover:text-cm-accent transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Subir desde galería
                </button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AIProcessingDisplay label="🧠 ANALIZANDO" steps={steps} progress={progress} />
              </motion.div>
            )}

            {step === 'form' && result && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-cm-accent mb-2">
                  🤖 AI Sugiere
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                    Nombre
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                      Precio (S/)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-mono font-black text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                      Categoría
                    </label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Popular', '🌶 Picante', '🥬 Vegano', '🌾 Sin Gluten'].map(tag => {
                      const isSpicyTag = tag === '🌶 Picante';
                      const isVeganTag = tag === '🥬 Vegano';
                      const isGlutenFreeTag = tag === '🌾 Sin Gluten';
                      const isPopular = tag === 'Popular';
                      const isSelected = isPopular
                        ? form.tags.includes(tag)
                        : isSpicyTag
                          ? form.isSpicy
                          : isVeganTag
                            ? form.isVegan
                            : isGlutenFreeTag
                              ? form.isGlutenFree
                              : false;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSpicyTag) setForm(f => ({ ...f, isSpicy: !f.isSpicy }));
                            else if (isVeganTag) setForm(f => ({ ...f, isVegan: !f.isVegan }));
                            else if (isGlutenFreeTag) setForm(f => ({ ...f, isGlutenFree: !f.isGlutenFree }));
                            else
                              setForm(f => ({
                                ...f,
                                tags: f.tags.includes(tag)
                                  ? f.tags.filter(t => t !== tag)
                                  : [...f.tags, tag],
                              }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            isSelected
                              ? 'bg-cm-accent text-white'
                              : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-3"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cm-success/10 text-cm-success">
                  <Save className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-black text-cm-text">✅ Producto creado</p>
                  <p className="text-xs text-cm-text-secondary mt-1">
                    {form.name} ya está en el catálogo
                  </p>
                </div>
                <button
                  onClick={handleCreateCampaign}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cm-accent text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100"
                >
                  ✨ Crear Campaña <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.price || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : '⚡ Guardar Producto'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
