import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Rocket, Eye } from 'lucide-react';
import { AIProcessingDisplay } from './AIProcessingDisplay';
import { useAICampaign } from '../../hooks/useAICampaign';
import type { MenuProduct } from '../../types';

interface CampaignQuickWizardProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  product: MenuProduct;
  onCampaignCreated: (campaignId: string) => void;
}

type Step = 'generating' | 'preview' | 'done';

export function CampaignQuickWizard({
  isOpen,
  onClose,
  branchId,
  product,
  onCampaignCreated,
}: CampaignQuickWizardProps) {
  const { generating, progress, steps, suggestion, error, generate, saveCampaign, reset } = useAICampaign(
    branchId,
    {
      name: product.name,
      base_price: product.base_price ?? product.price ?? 0,
      category: product.category,
      description: product.description,
    }
  );

  const [step, setStep] = useState<Step>('generating');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      reset();
      setStep('generating');
      generate();
    }
  }, [isOpen, reset, generate]);

  useEffect(() => {
    if (suggestion) {
      setHeroTitle(suggestion.heroTitle);
      setHeroSubtitle(suggestion.heroSubtitle);
      setCtaText(suggestion.ctaText);
      setDiscountType(suggestion.discountType);
      setDiscountValue(suggestion.discountValue);
      setStep('preview');
    }
  }, [suggestion]);

  useEffect(() => {
    if (error && !generating) {
      setHeroTitle(`🔥 ${product.name}`);
      setHeroSubtitle('¡Prueba nuestro plato estrella!');
      setCtaText('Ordenar Ahora');
      setStep('preview');
    }
  }, [error, generating, product.name]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const id = await saveCampaign({
      heroTitle,
      heroSubtitle,
      ctaText,
      discountType,
      discountValue,
    });
    if (id) {
      setStep('done');
      onCampaignCreated(id);
    }
    setSaving(false);
  }, [heroTitle, heroSubtitle, ctaText, discountType, discountValue, saveCampaign, onCampaignCreated]);

  if (!isOpen) return null;

  const originalPrice = product.base_price ?? product.price ?? 0;
  const flashPrice =
    discountType === 'percentage'
      ? originalPrice * (1 - discountValue / 100)
      : Math.max(0, originalPrice - discountValue);

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
        className="w-full max-w-xl bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cm-warning" />
            <h2 className="text-sm font-black text-cm-text tracking-tight">
              {product.name ? `✨ Campaña — ${product.name}` : '✨ Campaña AI'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
            <X className="w-4 h-4 text-cm-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'generating' && (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AIProcessingDisplay label="🧠 GENERANDO CAMPAÑA" steps={steps} progress={progress} />
              </motion.div>
            )}

            {(step === 'preview' || step === 'done') && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Banner Preview — WYSIWYG */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Eye className="w-3.5 h-3.5 text-cm-text-muted" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cm-text-muted">
                      Vista Previa
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border-2 border-cm-accent/30 bg-gradient-to-br from-cm-accent/[0.07] to-cm-bg p-5 shadow-cm-lg">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-cm-warning/10 rounded-full blur-[60px] pointer-events-none" />
                    <div className="relative z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cm-warning to-cm-error text-[9px] font-black uppercase tracking-widest text-white mb-3 shadow-lg">
                        🔥 OFERTA ESPECIAL
                      </span>
                      <h3 className="text-xl font-black text-white mt-2 tracking-tight">
                        {heroTitle || `🔥 ${product.name}`}
                      </h3>
                      <p className="text-xs text-white/70 mt-1 max-w-md">{heroSubtitle}</p>
                      <div className="flex items-end justify-between mt-4">
                        <div>
                          {discountValue > 0 && (
                            <span className="text-[11px] text-white/50 line-through">
                              S/ {originalPrice.toFixed(2)}
                            </span>
                          )}
                          <p className="text-2xl font-black text-cm-success font-mono tracking-tighter">
                            S/ {flashPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="px-4 py-2 rounded-xl bg-cm-warning text-white font-black text-xs tracking-wider uppercase shadow-lg">
                          {ctaText || 'Ordenar Ahora'}
                        </span>
                      </div>
                      {discountValue > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] font-black text-cm-error bg-cm-error/10 px-2 py-0.5 rounded border border-cm-error/20">
                            -{discountValue}
                            {discountType === 'percentage' ? '%' : ' S/'}
                          </span>
                          <span className="text-[9px] text-white/40">Válido por tiempo limitado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                {step === 'preview' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-2 border-t border-cm-border"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                          Título Hero
                        </label>
                        <input
                          value={heroTitle}
                          onChange={e => setHeroTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                          CTA
                        </label>
                        <input
                          value={ctaText}
                          onChange={e => setCtaText(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                        Subtítulo
                      </label>
                      <input
                        value={heroSubtitle}
                        onChange={e => setHeroSubtitle(e.target.value)}
                        className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                          Descuento
                        </label>
                        <input
                          type="number"
                          value={discountValue}
                          onChange={e => setDiscountValue(Number(e.target.value))}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-mono font-black text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                          Tipo
                        </label>
                        <select
                          value={discountType}
                          onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Fijo (S/)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cm-success/10 text-cm-success mb-3">
                      <Rocket className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-cm-text">🚀 Campaña activa</p>
                    <p className="text-xs text-cm-text-secondary mt-1">Los clientes ya pueden ver la oferta</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !heroTitle}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cm-warning to-cm-error text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Activando...' : '🚀 Activar Campaña'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
