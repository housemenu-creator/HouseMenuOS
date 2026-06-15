import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import type { CatalogProduct } from '../../worker/workerTypes';

interface ProductDetailPanelProps {
  product: CatalogProduct;
  catalog: { variations?: Record<string, any>; modifiers?: Record<string, any> };
  onAdd: (item: any) => void;
  onBack: () => void;
}

interface Variation {
  id: string;
  name: string;
  adjustPrice?: number;
}

interface Modifier {
  id: string;
  name: string;
  price?: number;
}

export default function ProductDetailPanel({ product, catalog, onAdd, onBack }: ProductDetailPanelProps) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [wizardSelections, setWizardSelections] = useState<Record<string, any>>({});
  const [wizardStep, setWizardStep] = useState(0);

  const variations: Variation[] = useMemo(
    () => Object.entries(catalog.variations || {}).map(([id, data]: [string, any]) => ({ id, ...data })),
    [catalog.variations]
  );
  const modifiers: Modifier[] = useMemo(
    () => Object.entries(catalog.modifiers || {}).map(([id, data]: [string, any]) => ({ id, ...data })),
    [catalog.modifiers]
  );

  const steps = product.steps || [];
  const isWizard = product.isWizard;
  const currentStep = steps[wizardStep];

  const itemTotal = useMemo(() => {
    let total = product.base_price || 0;
    if (isWizard) {
      for (const step of steps) {
        if (step.type === 'auto') {
          for (const opt of step.options || []) total += opt.price || 0;
          continue;
        }
        const sel = wizardSelections[step.id];
        if (!sel) continue;
        if (step.type === 'multiple' && Array.isArray(sel)) {
          for (const optId of sel) {
            const opt = (step.options || []).find((o) => o.id === optId);
            if (opt) total += opt.price || 0;
          }
        } else {
          const opt = (step.options || []).find((o) => o.id === sel);
          if (opt) total += opt.price || 0;
        }
      }
    } else {
      if (selectedVariation) {
        const v = variations.find((v) => v.id === selectedVariation);
        if (v?.adjustPrice) total += v.adjustPrice;
      }
      for (const mId of selectedModifiers) {
        const m = modifiers.find((m) => m.id === mId);
        if (m?.price) total += m.price;
      }
    }
    return total;
  }, [product, isWizard, steps, wizardSelections, selectedVariation, variations, modifiers]);

  const handleWizardToggle = (stepId: string, optionId: string, isMultiple: boolean) => {
    setWizardSelections((prev) => {
      const current = prev[stepId];
      if (isMultiple) {
        const arr = Array.isArray(current) ? current : [];
        return { ...prev, [stepId]: arr.includes(optionId) ? arr.filter((id) => id !== optionId) : [...arr, optionId] };
      }
      return { ...prev, [stepId]: current === optionId ? null : optionId };
    });
  };

  const buildDetails = (): string[] => {
    const d: string[] = [];
    if (isWizard) {
      for (const step of steps) {
        if (step.type === 'auto') {
          for (const opt of step.options || []) d.push(`${step.title}: ${opt.name}`);
          continue;
        }
        const sel = wizardSelections[step.id];
        if (!sel) continue;
        if (step.type === 'multiple' && Array.isArray(sel)) {
          for (const optId of sel) {
            const opt = (step.options || []).find((o) => o.id === optId);
            if (opt) d.push(`${step.title}: ${opt.name}`);
          }
        } else {
          const opt = (step.options || []).find((o) => o.id === sel);
          if (opt) d.push(`${step.title}: ${opt.name}`);
        }
      }
    } else {
      if (selectedVariation) {
        const v = variations.find((v) => v.id === selectedVariation);
        if (v) d.push(v.name);
      }
      for (const mId of selectedModifiers) {
        const m = modifiers.find((m) => m.id === mId);
        if (m) d.push(m.name);
      }
    }
    return d;
  };

  const handleAdd = () => {
    onAdd({
      productId: product.id,
      name: product.name,
      price: itemTotal,
      quantity: 1,
      details: buildDetails(),
      ...(isWizard ? {
        wizardSelections: {
          ...wizardSelections,
          ...Object.fromEntries(steps.filter((s) => s.type === 'auto').map((s) => [s.id, (s.options || []).map((o) => o.id)])),
        },
      } : {}),
    });
    onBack();
  };

  const canAdd = !isWizard || steps.every((s) => s.type === 'auto' || wizardSelections[s.id]);

  const toggleModifier = (modId: string) => {
    setSelectedModifiers((prev) => (prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]));
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-cm-text-secondary hover:text-cm-accent transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a productos
      </button>

      <div className="bg-cm-bg-alt rounded-xl border border-cm-border p-4">
        <p className="text-base font-bold text-cm-text">{product.name}</p>
        <p className="text-sm text-cm-text-secondary mt-0.5">S/ {(product.base_price || 0).toFixed(2)}</p>
      </div>

      {isWizard && steps.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-1">
            {steps.map((s, idx) => (
              <div key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${idx <= wizardStep ? 'bg-cm-accent' : 'bg-cm-border'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={wizardStep} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-3">{currentStep.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {(currentStep.options || []).map((opt) => {
                  const isMultiple = currentStep.type === 'multiple';
                  const sel = wizardSelections[currentStep.id];
                  const selected = isMultiple ? (Array.isArray(sel) && sel.includes(opt.id)) : sel === opt.id;
                  return (
                    <button key={opt.id} onClick={() => handleWizardToggle(currentStep.id, opt.id, isMultiple)}
                      className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selected ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                      <p className="font-bold">{opt.name}</p>
                      {opt.price > 0 && <p className="text-cm-accent mt-0.5">+ S/ {opt.price.toFixed(2)}</p>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {wizardStep > 0 && (
              <button onClick={() => setWizardStep((w) => w - 1)} className="flex-1 py-2.5 border border-cm-border rounded-lg text-xs font-bold text-cm-text-secondary hover:bg-cm-surface-hover">Anterior</button>
            )}
            {wizardStep < steps.length - 1 ? (
              <button onClick={() => setWizardStep((w) => w + 1)} disabled={currentStep.type !== 'multiple' && !wizardSelections[currentStep.id]}
                className="flex-1 py-2.5 bg-cm-accent text-white rounded-lg text-xs font-bold disabled:opacity-50">Siguiente</button>
            ) : null}
          </div>
        </div>
      )}

      {!isWizard && variations.length > 0 && (
        <div>
          <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-2">Variación</p>
          <div className="grid grid-cols-2 gap-2">
            {variations.map((v) => (
              <button key={v.id} onClick={() => setSelectedVariation(v.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selectedVariation === v.id ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                <p className="font-bold">{v.name}</p>
                {v.adjustPrice ? <p className="text-cm-accent mt-0.5">+ S/ {v.adjustPrice.toFixed(2)}</p> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isWizard && modifiers.length > 0 && (
        <div>
          <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-2">Adicionales</p>
          <div className="grid grid-cols-2 gap-2">
            {modifiers.map((m) => (
              <button key={m.id} onClick={() => toggleModifier(m.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${selectedModifiers.includes(m.id) ? 'bg-cm-accent/10 border-cm-accent text-cm-text' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'}`}>
                <p className="font-bold">{m.name}</p>
                {m.price ? <p className="text-cm-accent mt-0.5">+ S/ {m.price.toFixed(2)}</p> : null}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleAdd} disabled={!canAdd}
        className="w-full py-3 bg-cm-accent text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Agregar — S/ {itemTotal.toFixed(2)}
      </button>
    </div>
  );
}
