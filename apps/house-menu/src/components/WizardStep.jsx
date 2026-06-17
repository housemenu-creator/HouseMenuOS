import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const cardVariants = {
  idle: { scale: 1, opacity: 1 },
  selected: { scale: 1.02, opacity: 1 },
  sibling: { scale: 0.97, opacity: 0.5 },
};

const iconVariants = {
  idle: { scale: 1 },
  selected: {
    scale: [1, 1.18, 0.92, 1.05, 1],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const shimmerVariants = {
  idle: { opacity: 0, x: '-100%' },
  selected: {
    opacity: [0, 0.15, 0],
    x: ['-100%', '100%'],
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

export default function WizardStep({ stepData, selections, onOptionToggle }) {
  if (!stepData) return null;

  const isSingleMode = stepData.type === 'single';
  const hasSelection = isSingleMode && !!selections[stepData.id];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1.5"
      >
        <span className="text-[10px] font-black text-cm-accent uppercase tracking-widest bg-cm-accent/10 px-3 py-1 rounded-full border border-cm-accent/25">
          Paso Personalizable
        </span>
        <h2 className="text-2xl font-black text-cm-text tracking-tight mt-2">{stepData.title}</h2>
        <p className="text-cm-muted text-xs font-semibold">Elige las opciones que prefieras para tu plato</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 gap-4"
        initial="idle"
        animate="idle"
        variants={{
          idle: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {stepData.options.map(option => {
          const isOut = option.trackStock === true && (option.stock ?? 0) <= 0;
          const lowStock = option.trackStock === true && (option.stock ?? 0) > 0 && (option.stock ?? 0) <= 5;
          const isSelected = stepData.type === 'multiple'
            ? (selections[stepData.id] || []).includes(option.id)
            : selections[stepData.id] === option.id;

          return (
            <motion.div
              key={option.id}
              layout
              variants={{
                idle: { scale: 1, opacity: 1 },
                selected: { scale: 1.03, opacity: 1, y: -2 },
                sibling: { scale: 0.96, opacity: 0.45 },
              }}
              animate={
                isOut
                  ? { opacity: 0.3, scale: 0.95 }
                  : isSelected
                  ? 'selected'
                  : hasSelection
                  ? 'sibling'
                  : 'idle'
              }
              transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
              whileHover={isOut ? {} : { scale: isSelected ? 1.04 : 1.02, y: -4 }}
              whileTap={isOut ? {} : { scale: 0.97 }}
              onClick={() => {
                if (isOut) return;
                onOptionToggle(stepData.id, option, stepData.type === 'multiple');
              }}
              className={cn(
                'bg-cm-surface/40 hover:bg-cm-surface/70 rounded-2xl border border-cm-border p-5 flex flex-col items-center text-center space-y-4 relative cursor-pointer shadow-cm-sm hover:shadow-cm-md overflow-hidden',
                isSelected && !isOut && 'border-cm-accent/60 bg-cm-accent/10 shadow-cm-md ring-1 ring-cm-accent/30',
                isOut && 'grayscale cursor-not-allowed'
              )}
            >
              {/* Shimmer / color wash on selection */}
              {isSelected && !isOut && (
                <motion.div
                  key="shimmer"
                  variants={shimmerVariants}
                  initial="idle"
                  animate="selected"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-cm-accent to-transparent pointer-events-none"
                />
              )}

              {/* Icon medallion — imagen real o emoji con glow */}
              <motion.div
                animate={isSelected && !isOut ? 'selected' : 'idle'}
                variants={iconVariants}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden',
                  'bg-gradient-to-br from-cm-surface to-cm-bg-alt',
                  'shadow-cm-sm ring-1 ring-cm-border/50',
                  isSelected && 'from-cm-accent/15 to-cm-accent/5 ring-cm-accent/30 shadow-cm-md'
                )}
              >
                {option.image ? (
                  <img
                    src={option.image}
                    alt={option.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <>
                    {/* Glow detrás del emoji */}
                    <div className={cn(
                      'absolute inset-4 rounded-full blur-xl opacity-0 transition-opacity duration-300',
                      isSelected ? 'opacity-60 bg-cm-accent/20' : ''
                    )} />
                    <motion.span
                      className="text-5xl select-none relative z-10"
                      animate={isSelected && !isOut ? { rotate: [0, -8, 8, -4, 0], scale: [1, 1.1, 0.95, 1.05, 1] } : { rotate: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      {option.icon}
                    </motion.span>
                  </>
                )}
              </motion.div>

              <div className="space-y-1 relative z-10">
                <span className="text-sm font-black text-cm-text block leading-tight">{option.name}</span>
                {option.description && (
                  <p className="text-[10px] text-cm-text-secondary font-medium leading-snug line-clamp-2 px-1">{option.description}</p>
                )}
              </div>

              {/* Status Tags */}
              <div className="flex flex-col gap-1 items-center relative z-10">
                {lowStock && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[9px] font-black uppercase text-cm-warning bg-cm-warning/10 border border-cm-warning/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse"
                  >
                    <AlertTriangle className="w-3 h-3" /> Solo {option.stock}
                  </motion.span>
                )}

                {isOut ? (
                  <span className="text-[9px] font-black text-cm-error bg-cm-error/10 border border-cm-error/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Agotado
                  </span>
                ) : option.price ? (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cm-success/10 text-cm-success border border-cm-success/20"
                  >
                    +S/ {option.price.toFixed(2)}
                  </motion.span>
                ) : (
                  <span className="text-[9px] font-bold text-cm-text-secondary uppercase tracking-widest">
                    Incluido
                  </span>
                )}
              </div>

              {/* Top Right Check Circle with pop-in */}
              <AnimatePresence mode="popLayout">
                {isSelected && !isOut && (
                  <motion.div
                    key="check"
                    className="absolute top-2.5 right-2.5 z-20"
                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                  >
                    <div className="bg-cm-accent text-white rounded-full p-0.5 shadow-md border border-white/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
