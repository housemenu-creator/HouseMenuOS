import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WizardStep({ stepData, selections, onOptionToggle }) {
  if (!stepData) return null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-lg text-cm-accent">{stepData.title}</h2>
        <p className="text-cm-muted text-xs">Selecciona tus favoritos</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stepData.options.map(option => {
          const isOut = option.trackStock === true && (option.stock ?? 0) <= 0;
          const lowStock = option.trackStock === true && (option.stock ?? 0) > 0 && (option.stock ?? 0) <= 5;
          const isSelected = stepData.type === 'multiple'
            ? (selections[stepData.id] || []).includes(option.id)
            : selections[stepData.id] === option.id;

          return (
            <motion.div
              key={option.id}
              whileHover={isOut ? {} : { y: -5 }}
              whileTap={isOut ? {} : { scale: 0.95 }}
              onClick={() => {
                if (isOut) return;
                onOptionToggle(stepData.id, option, stepData.type === 'multiple');
              }}
              className={cn(
                "bg-cm-surface rounded-2xl shadow-cm-md border-2 border-cm-border p-5 flex flex-col items-center text-center space-y-4 relative cursor-pointer transition-all",
                isSelected && !isOut && "border-cm-accent border-4 bg-cm-accent/10 shadow-cm-lg",
                isOut && "opacity-40 grayscale cursor-not-allowed"
              )}
            >
              <span className="text-4xl filter drop-shadow-md">{option.icon}</span>
              <span className="text-sm font-bold leading-tight">{option.name}</span>

              {lowStock && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Solo {option.stock}
                </span>
              )}

              {isOut ? (
                <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                  Agotado
                </span>
              ) : option.price ? (
                <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                  +S/ {option.price.toFixed(2)}
                </span>
              ) : null}

              {isSelected && !isOut && (
                <motion.div
                  layoutId={`check-${option.id}`}
                  className="absolute top-3 right-3 bg-white rounded-full shadow-sm"
                >
                  <CheckCircle2 className="w-6 h-6 text-cm-accent" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
