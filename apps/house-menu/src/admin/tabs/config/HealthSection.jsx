/**
 * Health Section — system metrics, DB stats, data export.
 */

import { useState, useEffect } from 'react';
import { Bot, Database, Download, Loader2, Activity, RefreshCw } from 'lucide-react';
import { subscribeTasks, subscribeAudit, getDbStats, exportCollection } from './configService';

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-cm-bg-alt rounded-xl p-3.5 border border-cm-border/50">
      <div className="text-[0.55rem] text-cm-text-tertiary uppercase font-semibold tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${color || 'text-cm-text'}`}>{value ?? '—'}</div>
      {sub && <div className="text-[0.5rem] text-cm-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

export default function HealthSection() {
  const [tasks, setTasks] = useState(null);
  const [auditLogs, setAuditLogs] = useState(null);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const unsubTasks = subscribeTasks(setTasks);
    const unsubAudit = subscribeAudit(setAuditLogs);
    getDbStats().then(setStats);
    return () => { unsubTasks(); unsubAudit(); };
  }, []);

  const handleExport = async (type) => {
    setExporting(type);
    setStatusMessage(null);
    try {
      const data = await exportCollection(type);
      if (!data || data.length === 0) {
        setStatusMessage({ type: 'warning', text: `No hay datos de ${type} para exportar.` });
        return;
      }

      const headers = type === 'customers'
        ? 'Nombre,Email,Teléfono,Pedidos,Gasto Total,Puntos,Último Pedido,Creado'
        : 'Tarea,Resultado,Timestamp,Canal,Instrucción';

      const rows = type === 'customers'
        ? data.map(c => [
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.phone || '').replace(/"/g, '""')}"`,
            c.orderCount || 0,
            c.totalSpent || 0,
            c.points || 0,
            `"${c.lastOrderAt || ''}"`,
            `"${c.createdAt || ''}"`,
          ].join(','))
        : data.map(l => [
            `"${(l.task_id || '').replace(/"/g, '""')}"`,
            l.resultado || '',
            `"${new Date(l.ejecucion).toISOString()}"`,
            l.canal || '',
            `"${(l.instruccion || '').replace(/"/g, '""').slice(0, 100)}"`,
          ].join(','));

      const csv = '\uFEFF' + headers + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `house-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: `${data.length} registros exportados correctamente.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Error al exportar: ${err.message}` });
    } finally {
      setExporting(null);
    }
  };

  const taskEntries = tasks ? Object.entries(tasks) : [];
  const activeTasks = taskEntries.filter(([, t]) => t.activa !== false).length;

  const auditArray = auditLogs || [];
  const lastExecution = auditArray.length > 0
    ? Math.max(...auditArray.map(l => l.ejecucion || 0))
    : null;
  const successCount = auditArray.filter(l => l.resultado === 'ok').length;
  const successRate = auditArray.length > 0
    ? Math.round((successCount / auditArray.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Agent Status */}
      <div>
        <h4 className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Bot className={`w-4 h-4 ${taskEntries.length > 0 ? 'text-cm-success' : 'text-cm-text-tertiary'}`} />
          Estado del Agente
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Tareas" value={taskEntries.length} sub={`${activeTasks} activas`} />
          <MetricCard label="Ejecuciones" value={auditArray.length} sub="totales" />
          <MetricCard
            label="Tasa de éxito"
            value={successRate !== null ? `${successRate}%` : '—'}
            color={successRate >= 80 ? 'text-cm-success' : successRate >= 50 ? 'text-cm-warning' : successRate === null ? '' : 'text-cm-error'}
          />
          <MetricCard label="Última ejecución" value={lastExecution ? fmtTime(lastExecution).split(',')[1]?.trim() || fmtTime(lastExecution) : '—'} sub={lastExecution ? fmtTime(lastExecution).split(',')[0] : ''} />
        </div>
      </div>

      {/* Database */}
      <div className="border-t border-cm-border/50 pt-4">
        <h4 className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-cm-info" /> Base de Datos
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Clientes" value={stats?.customers ?? '—'} />
          <MetricCard label="Sucursales" value={stats?.branches ?? '—'} />
          <MetricCard label="Empleados" value={stats?.employees ?? '—'} />
        </div>
      </div>

      {/* Data Export */}
      <div className="border-t border-cm-border/50 pt-4">
        <h4 className="text-xs font-bold text-cm-text mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-cm-info" /> Exportar Datos
        </h4>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleExport('customers')} disabled={exporting !== null}
            className="flex items-center gap-2 px-3.5 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-xs font-medium text-cm-text hover:bg-cm-accent/5 hover:border-cm-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-cm-sm">
            {exporting === 'customers' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar Clientes (CSV)
          </button>
          <button onClick={() => handleExport('audit')} disabled={exporting !== null}
            className="flex items-center gap-2 px-3.5 py-2 bg-cm-bg-alt border border-cm-border rounded-lg text-xs font-medium text-cm-text hover:bg-cm-accent/5 hover:border-cm-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-cm-sm">
            {exporting === 'audit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar Auditoría (CSV)
          </button>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className={`mt-3 text-[0.55rem] px-3 py-2 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-cm-success/10 text-cm-success' :
            statusMessage.type === 'warning' ? 'bg-cm-warning/10 text-cm-warning' :
            'bg-cm-error/10 text-cm-error'
          }`}>
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
