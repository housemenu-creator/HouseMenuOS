import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import WizardStep from '../../components/WizardStep';

export default function WizardFlow({ product, wizardSelections, onOptionToggle, currentStepIndex, onStepChange, onComplete, isOutOfStock, qtyInCart = 0 }) {
  const currentStep = product.steps?.[currentStepIndex];
  const currentSelection = currentStep ? wizardSelections[currentStep.id] : null;
  const canProceed = currentStep?.type === 'single' ? !!currentSelection : true;
  const isLastStep = currentStepIndex >= (product.steps?.length - 1);

  return (
    <div className="space-y-6">
      {product?.trackStock && (
        <div className={`p-4 rounded-xl border text-center font-bold text-sm ${
          (product.stock ?? 0) > 0
            ? 'bg-cm-success/10 border-cm-success/20 text-cm-success'
            : 'bg-cm-error/10 border-cm-error/20 text-cm-error animate-pulse'
        }`}>
          {(product.stock ?? 0) > 0
            ? `✅ Unidades disponibles en stock: ${product.stock}`
            : '❌ Combo Agotado (Sin stock disponible)'}
        </div>
      )}

      <div className="flex gap-1 mb-8">
        {product.steps?.map((s, idx) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= currentStepIndex ? 'bg-cm-accent' : 'bg-cm-border'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <WizardStep
            stepData={product.steps?.[currentStepIndex]}
            selections={wizardSelections}
            onOptionToggle={onOptionToggle}
          />
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-cm-bg to-transparent z-30 flex gap-4">
        {currentStepIndex > 0 && (
          <button
            onClick={() => onStepChange(currentStepIndex - 1)}
            className="px-6 py-5 rounded-xl border-2 border-cm-border font-bold bg-cm-bg/80 backdrop-blur-xl"
          >
            ATRÁS
          </button>
        )}

        {!isLastStep ? (
          <button
            onClick={() => onStepChange(currentStepIndex + 1)}
            disabled={!canProceed}
            className={`flex-1 py-5 text-sm tracking-widest transition-all ${
              canProceed
                ? 'bg-cm-accent text-white shadow-cm-md rounded-xl font-bold'
                : 'bg-cm-border text-cm-muted rounded-xl font-bold cursor-not-allowed'
            }`}
          >
            SIGUIENTE PASO
          </button>
        ) : (
          <button
            onClick={onComplete}
            disabled={!canProceed || isOutOfStock}
            className={`flex-1 py-5 text-sm tracking-widest transition-all ${
              canProceed && !isOutOfStock
                ? 'bg-cm-accent text-white shadow-cm-md rounded-xl font-bold hover:bg-cm-accent-hover'
                : 'bg-cm-border text-cm-muted rounded-xl font-bold cursor-not-allowed'
            }`}
          >
            {isOutOfStock ? (qtyInCart >= (product?.stock ?? 0) ? 'MÁXIMO EN CARRITO' : 'SIN STOCK DISPONIBLE') : 'COMPLETAR ORDEN'}
          </button>
        )}
      </div>
    </div>
  );
}
