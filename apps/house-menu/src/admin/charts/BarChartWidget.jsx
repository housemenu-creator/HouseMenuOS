export default function BarChartWidget({ data, dataKeys, xKey = 'name', title, height = 280, stacked = false }) {
  const pad = { t: 10, r: 16, b: 36, l: 50 };
  const w = 600;
  const h = height;

  if (!data?.length) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>
        <div className="h-[280px] flex items-center justify-center text-xs text-cm-text-secondary">Sin datos</div>
      </div>
    );
  }

  // Compute bounds
  let maxY = 0;
  data.forEach(d => {
    if (stacked) {
      const total = dataKeys.reduce((s, k) => s + (d[k.dataKey ?? k] ?? 0), 0);
      if (total > maxY) maxY = total;
    } else {
      dataKeys.forEach(k => {
        const v = d[k.dataKey ?? k] ?? 0;
        if (v > maxY) maxY = v;
      });
    }
  });
  const yMax = maxY * 1.15 || 1;
  const graphW = w - pad.l - pad.r;
  const graphH = h - pad.t - pad.b;
  const barGroupW = graphW / data.length;
  const barW = Math.min(barGroupW / (stacked ? 1 : dataKeys.length) * 0.7, 32);
  const barGap = (barGroupW - barW * (stacked ? 1 : dataKeys.length)) / 2;

  const xScale = (i) => pad.l + i * barGroupW + barGap;
  const yScale = (v) => h - pad.b - (v / yMax) * graphH;

  const gridLines = 5;
  const gridYs = Array.from({ length: gridLines }, (_, i) => (yMax / (gridLines - 1)) * i);

  const COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#DC2626', '#8B5CF6'];
  const textColor = '#98989D';

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>}
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid + Y labels */}
        {gridYs.map((v, i) => (
          <g key={`g-${i}`}>
            <line x1={pad.l} y1={yScale(v)} x2={w - pad.r} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={pad.l - 6} y={yScale(v) + 3} textAnchor="end" fill={textColor} fontSize="10">{Math.round(v)}</text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x0 = xScale(i);
          if (stacked) {
            let cumY = 0;
            return dataKeys.map((key, ki) => {
              const v = d[key.dataKey ?? key] ?? 0;
              if (v === 0) return null;
              const color = key.color || COLORS[ki % COLORS.length];
              const y0 = cumY;
              const y1 = cumY + v;
              cumY = y1;
              return (
                <rect
                  key={`${i}-${ki}`}
                  x={x0}
                  y={yScale(y1)}
                  width={barW}
                  height={yScale(y0) - yScale(y1)}
                  fill={color}
                  rx="3"
                />
              );
            });
          } else {
            return dataKeys.map((key, ki) => {
              const v = d[key.dataKey ?? key] ?? 0;
              if (v === 0) return null;
              const color = key.color || COLORS[ki % COLORS.length];
              const bx = x0 + ki * barW;
              return (
                <rect
                  key={`${i}-${ki}`}
                  x={bx}
                  y={yScale(v)}
                  width={barW}
                  height={yScale(0) - yScale(v)}
                  fill={color}
                  rx="3"
                />
              );
            });
          }
        })}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={xScale(i) + (stacked ? barW : dataKeys.length * barW) / 2} y={h - 10} textAnchor="middle" fill={textColor} fontSize="10">
            {d[xKey] || ''}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {!stacked && dataKeys.length > 1 && (
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