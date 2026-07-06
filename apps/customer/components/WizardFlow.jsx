import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Minus, Plus, ShoppingBag, ArrowLeft, Check, ImageOff } from 'lucide-react';
import WizardStep from '../../components/WizardStep';\n
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

  // Check if the product image is a marketing banner (indicated by certain dimensions or URL patterns)
  const isMarketingImage = product?.image && (product.image.includes('arma-tu-menu') || product.image.includes('menu') || !product.image.includes('product'));
  const shouldShowImage = product?.image && !isMarketingImage;

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
    <div className="h-full flex flex-col bg-cm-bg" data-theme="dark">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Stock banner */}
          {product?.trackStock && (
            <div className={
              (product.stock ?? 0) > 0
                ? 'bg-cm-success/10 border-cm-success/20 text-cm-success'
                : 'bg-cm-error/10 border-cm-error/20 text-cm-error'
            } + ' p-3 rounded-xl border text-center text-xs font-bold'}>
              {(product.stock ?? 0) > 0
                ? `Stock disponible: ${product.stock} unidades`
                : 'Sin stock disponible'}
            </div>
          )}

          {/* Product info header */}
          <div className="space-y-3">
            {shouldShowImage && (
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-cm-border/60">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-cm-text">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-cm-text-secondary mt-1">{product.description}</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {product.steps?.map((s, idx) => {
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                  {idx > 0 && (
                    <div className={`w-full h-0.5 -mr-2 ${isCompleted ? 'bg-cm-accent' : 'bg-cm-border'}`} />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                      ${isCompleted ? 'bg-cm-accent text-white' : ''}
                      ${isActive ? 'bg-cm-accent/20 border-2 border-cm-accent text-cm-accent' : ''}
                      ${!isCompleted && !isActive ? 'bg-cm-bg-alt border border-cm-border text-cm-text-secondary' : ''}
                    `}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : isActive ? idx + 1 : idx + 1}
                  </div>
                  {isActive && (
                    <span className="text-xs font-bold text-cm-accent mt-1">
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
      </div>

      {/* Sticky bottom bar */}
      <div className="bg-cm-bg/95 backdrop-blur-xl border-t border-cm-border z-30 p-4">
        {/* Subtotal line */}
        {isLastStep && !isOutOfStock && quantity > 1 && (
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-sm text-cm-text-secondary"><strong>{quantity}</strong> × S/ {unitTotal.toFixed(2)}</span>
            <span className="text-base font-bold text-cm-accent">Total: S/ {itemTotal.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Back button */}
          {currentStepIndex > 0 && (
            <button
              onClick={() => onStepChange(currentStepIndex - 1)}
              className="p-3 rounded-xl border border-cm-border bg-cm-surface hover:bg-cm-surface-hover text-cm-text-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Quantity selector — only on last step */}
          {isLastStep && !isOutOfStock && (
            <div className="flex items-center bg-cm-surface border border-cm-border rounded-xl p-1">
              <button
                onClick={decrementQty}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-cm-text-secondary hover:text-cm-text hover:bg-cm-bg disabled:opacity-30 transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-10 text-center text-lg font-bold text-cm-text tabular-nums">{quantity}</span>
              <button
                onClick={incrementQty}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-cm-text-secondary hover:text-cm-text hover:bg-cm-bg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Action button */}
          {!isLastStep ? (
            <button
              onClick={() => onStepChange(currentStepIndex + 1)}
              disabled={!canProceed}
              className={`flex-1 py-4 text-base font-bold uppercase tracking-wide rounded-xl transition-colors
                ${canProceed
                  ? 'bg-cm-accent text-white hover:bg-cm-accent-hover'
                  : 'bg-cm-surface text-cm-text-secondary/50 border border-cm-border cursor-not-allowed'
                }
              `}
            >
              SIGUIENTE
            </button>
          ) : (
            <button
              onClick={() => onComplete(quantity)}
              disabled={!canProceed || isOutOfStock}
              className={`flex-1 py-4 text-base font-bold uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors
                ${canProceed && !isOutOfStock
                  ? 'bg-cm-accent text-white hover:bg-cm-accent-hover active:scale-[0.99]'
                  : 'bg-cm-surface text-cm-text-secondary/50 border border-cm-border cursor-not-allowed'
                }
              `}
            >
              <ShoppingBag className="w-5 h-5" />
              {isOutOfStock
                ? 'Sin stock'
                : unitTotal > 0
                  ? `AGREGAR — S/ ${itemTotal.toFixed(2)}`
                  : 'AGREGAR A LA ORDEN'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
