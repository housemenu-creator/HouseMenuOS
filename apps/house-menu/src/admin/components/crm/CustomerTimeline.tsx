import { motion, AnimatePresence } from 'framer-motion';
import { Clock, UserPlus, Sparkles, Award, Gift, Flame, Cake } from 'lucide-react';
import type { CustomerMilestone } from '../../hooks/crm/useCustomerProfile';
import type { Customer } from '../../hooks/crm/useCustomerList';

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  tier_upgrade: Award,
  streak_bonus: Flame,
  referral: Gift,
  birthday_bonus: Cake,
  points_milestone: Sparkles,
};

const MILESTONE_COLORS: Record<string, string> = {
  tier_upgrade: 'border-l-cm-accent',
  streak_bonus: 'border-l-orange-500',
  referral: 'border-l-green-500',
  birthday_bonus: 'border-l-pink-500',
  points_milestone: 'border-l-yellow-500',
};

const MILESTONE_BG: Record<string, string> = {
  tier_upgrade: 'bg-cm-accent/10 text-cm-accent',
  streak_bonus: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  referral: 'bg-green-500/10 text-green-600 dark:text-green-400',
  birthday_bonus: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  points_milestone: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
};

function MilestoneEntry({ milestone, index }: { milestone: CustomerMilestone; index: number }) {
  const Icon = MILESTONE_ICONS[milestone.type] || Sparkles;
  const borderColor = MILESTONE_COLORS[milestone.type] || 'border-l-cm-border';
  const badgeBg = MILESTONE_BG[milestone.type] || 'bg-cm-border/50 text-cm-text-secondary';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={`relative flex gap-3 border-l-2 ${borderColor} pl-4 pb-6 last:pb-0`}
    >
      {/* Icon circle */}
      <div className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${badgeBg}`}>
        <Icon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-cm-text truncate">{milestone.label}</p>
          <span className="shrink-0 text-[10px] text-cm-text-secondary">{formatDate(milestone.date)}</span>
        </div>
        {milestone.details && (
          <p className="mt-0.5 text-xs text-cm-text-secondary">{milestone.details}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function CustomerTimeline({
  milestones = [],
  customer,
}: {
  milestones: CustomerMilestone[];
  customer: Customer | null;
}) {
  // Build static entries from customer data
  const allEntries: CustomerMilestone[] = [...milestones];

  // Add creation date as first entry (if exists)
  if (customer?.createdAt) {
    const createdTs = new Date(customer.createdAt).getTime();
    // Only add if not already covered by milestones
    const hasCreationEntry = milestones.some(
      (m) => m.type === 'tier_upgrade' && Math.abs(m.date - createdTs) < 86400000,
    );
    if (!hasCreationEntry) {
      allEntries.push({
        id: '__created',
        type: 'tier_upgrade',
        label: 'Cliente registrado',
        date: createdTs,
        icon: '🆕',
      });
    }
  }

  // Sort by date descending
  allEntries.sort((a, b) => b.date - a.date);

  // Empty state
  if (!allEntries.length) {
    return (
      <div className="rounded-xl border border-cm-border bg-cm-surface p-6 shadow-cm-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-cm-accent" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
            Línea de tiempo
          </h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <UserPlus className="h-8 w-8 text-cm-text-tertiary" />
          <p className="text-sm text-cm-text-secondary">Sin eventos registrados</p>
          <p className="text-xs text-cm-text-tertiary">Los hitos aparecerán cuando el cliente acumule actividad</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface p-6 shadow-cm-sm">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-4 w-4 text-cm-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
          Línea de tiempo
        </h3>
        <span className="text-[10px] text-cm-text-tertiary">({allEntries.length} eventos)</span>
      </div>

      <div className="space-y-0">
        <AnimatePresence>
          {allEntries.map((entry, idx) => (
            <MilestoneEntry key={entry.id} milestone={entry} index={idx} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
