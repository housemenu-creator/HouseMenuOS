import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, CartesianGrid,
} from "recharts";
import { useMetrics } from "../../hooks/useMetrics";

export default function UsageChart() {
  const { today, week, loading } = useMetrics();

  if (loading) return <div className="text-cm-text-secondary text-sm">Cargando...</div>;

  // Tools más usadas
  const toolsData = today?.toolsByType
    ? Object.entries(today.toolsByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name: name.slice(0, 15), count }))
    : [];

  // Tendencia 7 días
  const trend = week.map((d, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return { day: date.toLocaleDateString("es-PE", { weekday: "short" }), ventas: d.totalTools || 0 };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Tools más usadas hoy</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={toolsData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, background: "var(--cm-surface)", border: "1px solid var(--cm-border)" }} />
            <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Tendencia 7 días</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cm-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, background: "var(--cm-surface)", border: "1px solid var(--cm-border)" }} />
            <Area type="monotone" dataKey="ventas" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-cm-surface border border-cm-border rounded-xl p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold mb-4">Resumen del día</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cm-accent">{today?.totalTools || 0}</div>
            <div className="text-xs text-cm-text-secondary">Tools ejecutadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cm-success">{today?.totalMessages || 0}</div>
            <div className="text-xs text-cm-text-secondary">Mensajes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cm-error">{today?.totalErrors || 0}</div>
            <div className="text-xs text-cm-text-secondary">Errores</div>
          </div>
        </div>
      </div>
    </div>
  );
}

