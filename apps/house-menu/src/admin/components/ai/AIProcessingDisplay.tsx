import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';
import type { AIProcessingStep } from '../../../lib/aiService';

interface AIProcessingDisplayProps {
  label: string;
  steps: AIProcessingStep[];
  progress: number;
}

function StepIcon({ status }: { status: AIProcessingStep['status'] }) {
  switch (status) {
    case 'done':
      return <Check className="w-3.5 h-3.5 text-cm-success" />;
    case 'current':
      return <Loader2 className="w-3.5 h-3.5 text-cm-accent animate-spin" />;
    case 'error':
      return <Circle className="w-3.5 h-3.5 text-cm-error" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-cm-text-muted opacity-40" />;
  }
}

export function AIProcessingDisplay({ label, steps, progress }: AIProcessingDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] p-5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
      {/* Scanline overlay */}
      <div
        className="ai-scanline absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        }}
      />

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse"
            style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }}
          />
          <span
            className="font-mono text-xs font-black tracking-[0.2em] text-cm-success uppercase"
            style={{ textShadow: '0 0 10px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.15)' }}
          >
            {label}
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2.5"
            >
              <StepIcon status={step.status} />
              <span
                className={`text-xs font-mono tracking-wider ${
                  step.status === 'done'
                    ? 'text-cm-success'
                    : step.status === 'current'
                      ? 'text-cm-accent'
                      : step.status === 'error'
                        ? 'text-cm-error'
                        : 'text-cm-text-muted'
                }`}
              >
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cm-accent to-cm-success"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-end mt-1">
          <span className="font-mono text-[10px] font-bold tracking-wider text-cm-text-muted">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
