export default function LineChartWidget({ data, dataKeys, xKey = 'name', title, height = 280, yFormatter }) {
  if (!data?.length) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>
        <div className="h-[280px] flex items-center justify-center text-xs text-cm-text-secondary">Sin datos</div>
      </div>
    );
  }

  const pad = 40;
  const graphW = 600;
  const graphH = height - 20;
  const w = graphW;
  const h = graphH;

  // Compute bounds across ALL keys
  let minY = Infinity, maxY = -Infinity;
  data.forEach(d => {
    dataKeys.forEach(k => {
      const v = d[k.dataKey ?? k] ?? 0;
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    });
  });
  const range = maxY - minY || 1;
  const padY = range * 0.1;
  const yMin = Math.max(0, minY - padY);
  const yMax = maxY + padY;
  const yRange = yMax - yMin || 1;

  const xScale = (i) => pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
  const yScale = (v) => h - pad - ((v - yMin) / yRange) * (h - pad * 2);

  const gridLines = 5;
  const gridYs = Array.from({ length: gridLines }, (_, i) => yMin + (yRange / (gridLines - 1)) * i);

  const COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#8B5CF6'];

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>}
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {gridYs.map((v, i) => (
          <g key={`g-${i}`}>
            <line x1={pad} y1={yScale(v)} x2={w - pad} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={pad - 6} y={yScale(v) + 3} textAnchor="end" fill="#98989D" fontSize="10">{yFormatter ? yFormatter(v) : Math.round(v)}</text>
          </g>
        ))}

        {/* Lines */}
        {dataKeys.map((key, ki) => {
          const color = key.color || COLORS[ki % COLORS.length];
          const dk = key.dataKey ?? key;
          const pts = data.map((d, i) => ({ x: xScale(i), y: yScale(d[dk] ?? 0) }));

          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const labelY = pts.reduce((min, p) => p.y < min.y ? p : min, pts[0]);

          return (
            <g key={dk}>
              <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#1C1C1E" strokeWidth="1" />
              ))}
              {/* LabelList equivalent: value above last point */}
              <text x={pts[pts.length - 1].x} y={labelY.y - 10} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                {yFormatter ? yFormatter(data[data.length - 1][dk] ?? 0) : Math.round(data[data.length - 1][dk] ?? 0)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {data.map((d, i) => (
          <text key={i} x={xScale(i)} y={h - 4} textAnchor="middle" fill="#98989D" fontSize="10">
            {d[xKey] || ''}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {dataKeys.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-2 justify-center">
          {dataKeys.map((key, i) => {
            const color = key.color || COLORS[i % COLORS.length];
            return (
              <span key={key.dataKey ?? key} className="flex items-center gap-1.5 text-xs text-cm-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {key.name || key.dataKey || key}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}