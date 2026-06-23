import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WizardStep({ stepData, selections, onOptionToggle }) {
  if (!stepData) return null;

  const isSingleMode = stepData.type === 'single';
  const hasSelection = isSingleMode && !!selections[stepData.id];

  return (
    <div className="space-y-5">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-cm-text">{stepData.title}</h2>
        <p className="text-xs text-cm-text-secondary">
          {stepData.type === 'multiple'
            ? 'Elegí las opciones que prefieras'
            : 'Elegí una opción'}
        </p>
      </div>

      {/* Options grid - responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stepData.options.map((option) => {
          const isOut = option.trackStock === true && (option.stock ?? 0) <= 0;
          const lowStock = option.trackStock === true && (option.stock ?? 0) > 0 && (option.stock ?? 0) <= 5;
          const isSelected = stepData.type === 'multiple'
            ? (selections[stepData.id] || []).includes(option.id)
            : selections[stepData.id] === option.id;

          return (
            <motion.button
              key={option.id}
              layout
              onClick={() => {
                if (isOut) return;
                onOptionToggle(stepData.id, option, stepData.type === 'multiple');
              }}
              whileHover={isOut ? {} : { y: -2 }}
              whileTap={isOut ? {} : { scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'relative rounded-xl border-2 p-4 flex flex-col items-center gap-3 text-center transition-colors cursor-pointer',
                isOut && 'opacity-40 cursor-not-allowed',
                isSelected && !isOut
                  ? 'border-cm-accent bg-cm-accent/10'
                  : 'border-cm-border/50 bg-cm-surface hover:border-cm-accent/40',
              )}
            >
              {/* Image or icon */}
              <div className={cn(
                'w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center',
                isSelected && !isOut ? 'bg-cm-accent/20' : 'bg-cm-bg-alt',
              )}>
                {option.image ? (
                  <img src={option.image} alt={option.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-cm-text-secondary/50" />
                )}
              </div>

              {/* Text */}
              <div className="space-y-1 w-full">
                <p className="text-sm font-bold text-cm-text leading-tight">{option.name}</p>
                {option.description && (
                  <p className="text-[10px] text-cm-text-secondary line-clamp-2 leading-snug">{option.description}</p>
                )}
              </div>

              {/* Price or status */}
              <div className="w-full">
                {isOut ? (
                  <span className="text-[9px] font-bold text-cm-error uppercase tracking-wider">Agotado</span>
                ) : lowStock ? (
                  <span className="text-[9px] font-bold text-cm-warning bg-cm-warning/10 border border-cm-warning/20 px-2 py-0.5 rounded-full inline-flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {option.stock} uds
                  </span>
                ) : option.price > 0 ? (
                  <span className="text-xs font-bold text-cm-accent">+ S/ {option.price.toFixed(2)}</span>
                ) : (
                  <span className="text-[9px] font-bold text-cm-text-secondary uppercase tracking-wider">Incluido</span>
                )}
              </div>

              {/* Selected check */}
              <AnimatePresence>
                {isSelected && !isOut && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute top-2 right-2"
                  >
                    <div className="w-5 h-5 bg-cm-accent rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-3 h-3 text-cm-text" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
