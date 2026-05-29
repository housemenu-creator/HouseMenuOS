const barColorMap = {
  'bg-red-400':    'var(--cm-error)',
  'bg-yellow-400': 'var(--cm-warning)',
  'bg-orange-400': 'var(--cm-accent)',
  'bg-blue-400':   'var(--cm-info)',
  'bg-green-400':  'var(--cm-success)',
};

export default function FunnelRow({ icon, label, count, barColor, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barCssVar = barColorMap[barColor] || 'var(--cm-accent)';

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-cm-text">
          <span className="p-1 rounded bg-cm-accent/10 text-cm-accent">{icon}</span>
          {label}
        </span>
        <span className="text-sm font-bold text-cm-text">{count}</span>
      </div>
      <div className="h-2 bg-cm-accent/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: barCssVar }}
        />
      </div>
    </div>
  );
}
