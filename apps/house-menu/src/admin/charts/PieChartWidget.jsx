import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CHART_COLORS = ['#C2410C', '#059669', '#2563EB', '#D97706', '#DC2626', '#8B5CF6', '#0D9488', '#EC4899'];

export default function PieChartWidget({ data, dataKey = 'value', nameKey = 'name', title, height = 300, colors = CHART_COLORS }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data?.length) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-xs text-cm-text-secondary">Sin datos</div>
      </div>
    );
  }

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
      {title && <h3 className="text-sm font-semibold text-cm-text mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: isDark ? '#1C1C1E' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: isDark ? '#F5F5F7' : '#1D1D1F',
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
