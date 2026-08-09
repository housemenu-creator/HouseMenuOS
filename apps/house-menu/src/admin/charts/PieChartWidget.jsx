export default function PieChartWidget({ data, dataKey = 'value', nameKey = 'name', title, height = 300, colors = CHART_COLORS }) {
  if (!data?.length) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-xs text-cm-text-secondary">Sin datos</div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + (d[dataKey] || 0), 0);
  const radius = 75;
  const innerRadius = 45;
  const cx = 120;
  const cy = 100;
  const legendX = 280;

  // Build arc segments
  let cumulative = 0;
  const arcs = data.map((d, i) => {
    const value = d[dataKey] || 0;
    const percent = value / total;
    const startAngle = cumulative * 360;
    const endAngle = (cumulative + percent) * 360;
    cumulative += percent;

    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    const largeArc = percent > 0.5 ? 1 : 0;

    const path = [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');

    return { path, fill: colors[i % colors.length], label: d[nameKey] || '', percent, value };
  });

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>}
      <svg width="100%" height={height} viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
        {arcs.map((a, i) => (
          <g key={i}>
            <path d={a.path} fill={a.fill} stroke="#1C1C1E" strokeWidth="1" />
          </g>
        ))}
        {/* Legend as inline labels */}
        {arcs.map((a, i) => {
          const y = 16 + i * 22;
          return (
            <g key={`l-${i}`}>
              <rect x={legendX} y={y - 8} width="10" height="10" rx="5" fill={a.fill} />
              <text x={legendX + 16} y={y + 2} fill="#A1A1A6" fontSize="11" fontFamily="inherit">
                {a.label}
              </text>
              <text x={legendX + 16} y={y + 16} fill="#F5F5F7" fontSize="11" fontWeight="bold" fontFamily="inherit">
                {a.value} ({(a.percent * 100).toFixed(0)}%)
              </text>
            </g>
          );
        })}
        {/* Center total */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#F5F5F7" fontSize="20" fontWeight="900" fontFamily="inherit">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#A1A1A6" fontSize="10" fontFamily="inherit">
          total
        </text>
      </svg>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

const CHART_COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#DC2626', '#8B5CF6', '#0D9488', '#EC4899'];