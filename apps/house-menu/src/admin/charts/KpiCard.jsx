import { motion } from 'framer-motion';

const ICON_COLORS = {
  accent: 'bg-cm-accent/10 text-cm-accent',
  success: 'bg-cm-success/10 text-cm-success',
  warning: 'bg-cm-warning/10 text-cm-warning',
  error: 'bg-cm-error/10 text-cm-error',
  info: 'bg-cm-info/10 text-cm-info',
};

export default function KpiCard({ label, value, sublabel, icon: Icon, color = 'accent', trend, trendLabel }) {
  const trendUp = trend > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cm-surface border border-cm-border rounded-xl p-4 space-y-2"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${ICON_COLORS[color] || ICON_COLORS.accent}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-cm-text tracking-tight">{value}</div>
      {(sublabel || trend !== undefined) && (
        <div className="flex items-center gap-2 text-xs text-cm-text-secondary">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 font-semibold ${trendUp ? 'text-cm-success' : trend < 0 ? 'text-cm-error' : 'text-cm-text-secondary'}`}>
              {trendUp ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sublabel && <span>{sublabel}</span>}
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
