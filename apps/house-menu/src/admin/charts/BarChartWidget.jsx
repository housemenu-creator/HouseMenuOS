import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CHART_COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#DC2626', '#8B5CF6'];

export default function BarChartWidget({ data, dataKeys, xKey = 'name', title, height = 280, stacked = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#98989D' : '#86868B';

  if (!data?.length) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>
        <div className="h-[280px] flex items-center justify-center text-xs text-cm-text-secondary">Sin datos</div>
      </div>
    );
  }

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1C1C1E' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: isDark ? '#F5F5F7' : '#1D1D1F',
            }}
          />
          {dataKeys.map((key, i) => (
            <Bar
              key={key.dataKey || key}
              dataKey={key.dataKey || key}
              name={key.name || key}
              fill={key.color || CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
          {!stacked && dataKeys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
