import { Clock, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const PACING_STYLES = {
  overdue: {
    label: 'Atrasado',
    classes: 'text-cm-error bg-cm-error/10 border-cm-error/20',
    icon: AlertTriangle,
  },
  due: {
    label: 'Por vencer',
    classes: 'text-cm-warning bg-cm-warning/10 border-cm-warning/20',
    icon: Timer,
  },
  ahead: {
    label: 'A tiempo',
    classes: 'text-cm-muted bg-cm-muted/5 border-cm-border/20',
    icon: Clock,
  },
};

export default function PacingBadge({ status }) {
  const style = PACING_STYLES[status] || PACING_STYLES.ahead;
  const Icon = style.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.55rem] font-semibold border',
      style.classes,
    )}>
      <Icon className="w-2.5 h-2.5" />
      {style.label}
    </span>
  );
}
