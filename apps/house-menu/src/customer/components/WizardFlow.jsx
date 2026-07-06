import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Minus, Plus, ShoppingBag, ArrowLeft, Check, X } from 'lucide-react';
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

  // Calculate total price
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
    if (quantity < stockLimit) setQuantity(q => q + 1);
  };
  const decrementQty = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  return (
    <div className="flex flex-col h-full" data-theme="dark">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pb-4">
        {/* Stock banner */}
        {product?.trackStock && (
          <div className={`
            p-3 rounded-xl border text-center text-xs font-bold
            ${(product.stock ?? 0) > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              : 'bg-red-500/10 border-red-500/20 text-red-600'
            }
          `}>
            {(product.stock ?? 0) > 0
              ? `Stock disponible: ${product.stock} unidades`
              : 'Sin stock disponible'}
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2 px-1">
          {product.steps?.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                {idx > 0 && (
                  <div className={`w-full h-0.5 -mr-2 ${isCompleted ? 'bg-cm-accent' : 'bg-cm-border'}`} />
                )}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-colors',
                    isCompleted && 'bg-cm-accent text-white',
                    isActive && 'bg-cm-accent/15 border border-cm-accent text-cm-accent',
                    !isCompleted && !isActive && 'bg-cm-surface border border-cm-border text-cm-text-secondary'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : isActive ? <X className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                {isActive && (
                  <span className="text-[9px] font-black text-cm-accent uppercase tracking-wider mt-0.5">
                    {s.title?.length > 12 ? s.title.slice(0, 10) + '…' : s.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`step-${currentStepIndex}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            <WizardStep
              stepData={product.steps?.[currentStepIndex]}
              selections={wizardSelections}
              onOptionToggle={onOptionToggle}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-cm-border/40 bg-cm-bg pt-3 pb-1 -mx-5 px-5">
        {/* Subtotal line */}
        {isLastStep && !isOutOfStock && quantity > 1 && (
          <div className="pb-2 flex justify-between">
            <span className="text-xs text-cm-text-secondary font-bold">{quantity} x S/ {unitTotal.toFixed(2)}</span>
            <span className="text-xs font-bold text-cm-accent">Total: S/ {itemTotal.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Back button */}
          {currentStepIndex > 0 && (
            <button
              onClick={() => onStepChange(currentStepIndex - 1)}
              className="p-2 rounded-lg border border-cm-border bg-cm-surface hover:bg-cm-surface-hover text-cm-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Quantity selector - only on last step */}
          {isLastStep && !isOutOfStock && (
            <div className="flex items-center bg-cm-surface border border-cm-border rounded-lg p-0.5">
              <button
                onClick={decrementQty}
                disabled={quantity <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-md text-cm-text-secondary hover:text-cm-text disabled:opacity-30 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold text-cm-text">{quantity}</span>
              <button
                onClick={incrementQty}
                className="w-7 h-7 flex items-center justify-center rounded-md text-cm-text-secondary hover:text-cm-text transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action button */}
          {!isLastStep ? (
            <button
              onClick={() => onStepChange(currentStepIndex + 1)}
              disabled={!canProceed}
              className={cn(
                'flex-1 py-3 text-sm font-bold rounded-lg transition-colors',
                canProceed
                  ? 'bg-cm-accent text-white hover:bg-cm-accent-hover'
                  : 'bg-cm-surface text-cm-text-secondary/50 border border-cm-border cursor-not-allowed'
              )}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={() => onComplete(quantity)}
              disabled={!canProceed || isOutOfStock}
              className={cn(
                'flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors',
                canProceed && !isOutOfStock
                  ? 'bg-cm-accent text-white hover:bg-cm-accent-hover active:scale-[0.99]'
                  : 'bg-cm-surface text-cm-text-secondary/50 border border-cm-border cursor-not-allowed'
              )}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock
                ? 'Sin stock'
                : unitTotal > 0
                  ? `Agregar - S/ ${itemTotal.toFixed(2)}`
                  : 'Agregar a la orden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...args) {
  return args.filter(Boolean).join(' ');
}
