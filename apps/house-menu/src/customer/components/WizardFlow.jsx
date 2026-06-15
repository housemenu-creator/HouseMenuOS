import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Minus, Plus, ShoppingBag, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import WizardStep from '../../components/WizardStep';

export default function WizardFlow({ 
  product, 
  wizardSelections, 
  onOptionToggle, 
  currentStepIndex, 
  onStepChange, 
  onComplete, 
  isOutOfStock, 
  qtyInCart = 0 
}) {
  const [quantity, setQuantity] = useState(1);
  const currentStep = product.steps?.[currentStepIndex];
  const currentSelection = currentStep ? wizardSelections[currentStep.id] : null;
  const canProceed = currentStep?.type === 'single' ? !!currentSelection : true;
  const isLastStep = currentStepIndex >= (product.steps?.length - 1);

  // Calculate total price from all wizard selections
  const unitTotal = (product?.base_price || 0) + (product?.steps || []).reduce((acc, step) => {
    const sel = wizardSelections[step.id];
    if (!sel) return acc;
    const opts = step.options || [];
    if (Array.isArray(sel)) {
      return acc + sel.reduce((s, id) => s + (opts.find(o => o.id === id)?.price || 0), 0);
    }
    return acc + (opts.find(o => o.id === sel)?.price || 0);
  }, 0);
  const itemTotal = unitTotal * quantity;

  const incrementQty = () => {
    const stockLimit = product.stock ?? 99;
    if (quantity < stockLimit) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Stock Banner */}
      {product?.trackStock && (
        <div className={`p-3.5 rounded-2xl border text-center font-bold text-xs ${
          (product.stock ?? 0) > 0
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 animate-pulse'
        }`}>
          {(product.stock ?? 0) > 0
            ? `✅ Unidades disponibles en stock: ${product.stock}`
            : '❌ Combo Agotado (Sin stock disponible)'}
        </div>
      )}

      {/* Progress Bar Indicators with Step Icons */}
      <div className="flex items-start gap-3 mb-6 px-1">
        {product.steps?.map((s, idx) => {
          const isActive = idx === currentStepIndex;
          const isCompleted = idx < currentStepIndex;
          const stepLabel = s.title?.length > 18 ? s.title.slice(0, 16) + '…' : s.title || `Paso ${idx + 1}`;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-2">
              {/* Icon + Connector row */}
              <div className="flex items-center w-full">
                {/* Connector line before */}
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${isCompleted || isActive ? 'bg-cm-accent/50' : 'bg-cm-border'}`} />
                )}
                {/* Step dot */}
                <motion.div
                  layout
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    isCompleted
                      ? 'bg-cm-accent border-cm-accent text-white'
                      : isActive
                      ? 'bg-cm-accent/10 border-cm-accent text-cm-accent'
                      : 'bg-cm-surface border-cm-border text-cm-text-secondary'
                  }`}
                  animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <Circle className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <span className="text-[9px] font-black">{idx + 1}</span>
                  )}
                </motion.div>
                {/* Connector line after */}
                {idx < product.steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-cm-accent/50' : 'bg-cm-border'}`} />
                )}
              </div>
              {/* Label */}
              <span className={`text-[8px] font-black tracking-wider uppercase text-center leading-tight max-w-[80px] ${
                isActive ? 'text-cm-accent' : isCompleted ? 'text-cm-text-secondary/60' : 'text-cm-text-secondary/30'
              }`}>
                {stepLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Step Content */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`step-${currentStepIndex}`}
          initial={{ opacity: 0, x: 60, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
        >
          <WizardStep
            stepData={product.steps?.[currentStepIndex]}
            selections={wizardSelections}
            onOptionToggle={onOptionToggle}
          />
        </motion.div>
      </AnimatePresence>

      {/* Sticky Bottom Actions Bar with Quantity Selector */}
      <div className="fixed bottom-0 left-0 w-full bg-cm-bg/95 backdrop-blur-xl border-t border-cm-border/40 z-30 max-w-2xl mx-auto right-0 rounded-t-3xl shadow-cm-lg">
        {/* Subtotal Row - shown on last step when qty > 1 */}
        {isLastStep && !isOutOfStock && quantity > 1 && (
          <div className="px-5 pt-3 pb-0 flex items-center justify-between">
            <span className="text-[0.65rem] text-cm-text-secondary font-bold uppercase tracking-wider">
              {quantity} × S/ {unitTotal.toFixed(2)}
            </span>
            <span className="text-[0.65rem] text-cm-accent font-black">
              Total: S/ {itemTotal.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 p-4">
          {/* Back button (Only visible after step 1) */}
          {currentStepIndex > 0 && (
            <button
              onClick={() => onStepChange(currentStepIndex - 1)}
              className="p-4 rounded-2xl border border-cm-border bg-cm-surface/50 hover:bg-cm-surface text-cm-text font-bold transition-all text-xs flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> ATRÁS
            </button>
          )}

          {/* Quantity Selector - Show only on the final step */}
          {isLastStep && !isOutOfStock && (
            <div className="flex items-center gap-1 bg-cm-surface/50 border border-cm-border rounded-2xl p-1.5 shrink-0">
              <button
                onClick={decrementQty}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center text-base font-black text-cm-text tabular-nums select-none">
                {quantity}
              </span>
              <button
                onClick={incrementQty}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-cm-text-secondary hover:text-cm-text hover:bg-cm-accent/10 transition-all active:scale-90"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Button */}
          {!isLastStep ? (
            <button
              onClick={() => onStepChange(currentStepIndex + 1)}
              disabled={!canProceed}
              className={`flex-1 py-4 text-xs font-black tracking-wider uppercase transition-all rounded-2xl ${
                canProceed
                  ? 'bg-gradient-to-r from-cm-accent to-orange-500 text-white shadow-lg shadow-cm-accent/30'
                  : 'bg-cm-surface/50 text-cm-text-secondary/50 cursor-not-allowed border border-cm-border'
              }`}
            >
              SIGUIENTE PASO
            </button>
          ) : (
            <button
              onClick={() => onComplete(quantity)}
              disabled={!canProceed || isOutOfStock}
              className={`flex-1 py-4 text-xs font-black tracking-wider uppercase transition-all rounded-2xl flex items-center justify-center gap-2 ${
                canProceed && !isOutOfStock
                  ? 'bg-gradient-to-r from-cm-accent to-orange-500 text-white shadow-lg shadow-cm-accent/30 hover:shadow-xl hover:shadow-cm-accent/40 active:scale-[0.98]'
                  : 'bg-cm-surface/50 text-cm-text-secondary/50 cursor-not-allowed border border-cm-border'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock 
                ? (qtyInCart >= (product?.stock ?? 0) ? 'MÁXIMO EN CARRITO' : 'SIN STOCK') 
                : unitTotal > 0 ? `AGREGAR • S/ ${itemTotal.toFixed(2)}` : 'AGREGAR A LA ORDEN'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
