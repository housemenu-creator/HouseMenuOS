import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CHART_COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#8B5CF6'];

export default function LineChartWidget({ data, dataKeys, xKey = 'name', title, height = 280, yFormatter }) {
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
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1C1C1E' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: isDark ? '#F5F5F7' : '#1D1D1F',
            }}
            formatter={(value) => [yFormatter ? yFormatter(value) : value]}
          />
          {dataKeys.map((key, i) => (
            <Line
              key={key.dataKey || key}
              type="monotone"
              dataKey={key.dataKey || key}
              name={key.name || key}
              stroke={key.color || CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: key.color || CHART_COLORS[i % CHART_COLORS.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
          {dataKeys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
