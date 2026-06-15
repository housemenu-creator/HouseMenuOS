import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Search, Filter, Calendar, AlertTriangle } from "lucide-react";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useSounds } from "../../hooks/useSounds";
import type { ActivityLog } from "../../types";

const TOOL_LABELS: Record<string, string> = {
  ver_ordenes: "Ver Órdenes",
  crear_pedido: "Crear Pedido",
  ver_menu: "Ver Menú",
  info_cliente: "Info Cliente",
  info_restaurante: "Info Restaurante",
  enviar_whatsapp: "Enviar WhatsApp",
  historial_cpes: "Historial CPEs",
  ver_pendientes_cocina: "Pendientes Cocina",
  consultar_pedido: "Consultar Pedido",
  cambiar_estado_pedido: "Cambiar Estado",
  sistema_estado: "Estado Sistema",
  ver_rate_limits: "Rate Limits",
  resetear_rate_limit: "Reset Rate Limit",
  recargar_config_agente: "Recargar Config",
  kds_url: "KDS URL",
  fallback_model: "Fallback Model",
  report_tool_call: "Report Tool Call",
};

interface Filters {
  agentId: string;
  tool: string;
  result: string;
  search: string;
  dateRange: "all" | "today" | "yesterday" | "week";
  impact: "all" | "critical" | "info";
}

export default function ActivityFeed({ compact }: { compact?: boolean }) {
  const { logs, loading } = useActivityLog(compact ? 10 : 100);
  const { playSound } = useSounds();
  const [filters, setFilters] = useState<Filters>({ 
    agentId: "", 
    tool: "", 
    result: "", 
    search: "",
    dateRange: "all",
    impact: "all"
  });

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filters.agentId && l.agentId !== filters.agentId) return false;
      if (filters.tool && l.tool !== filters.tool) return false;
      if (filters.result && l.result !== filters.result) return false;
      if (filters.search && !l.message?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      // Date Range Filter
      const logDate = new Date(l.timestamp).toDateString();
      const today = new Date().toDateString();
      if (filters.dateRange === "today" && logDate !== today) return false;
      
      // Impact Filter
      if (filters.impact === "critical" && l.result !== "error") return false;
      
      return true;
    });
  }, [logs, filters]);

  const updateFilter = (newFilters: Partial<Filters>) => {
    setFilters(f => ({ ...f, ...newFilters }));
    playSound("click");
  };

  const uniqueTools = useMemo(() => [...new Set(logs.map((l) => l.tool))], [logs]);

  if (loading) return <div className="text-cm-text-secondary text-sm p-4">Cargando actividad...</div>;

  return (
    <div className="glass border border-cm-border rounded-2xl overflow-hidden shadow-lg">
      {!compact && (
        <div className="p-4 border-b border-cm-border bg-cm-surface/30 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-cm-bg/50 border border-cm-border rounded-xl px-3 py-1.5">
              <Filter size={12} className="text-cm-text-secondary" />
              <select
                className="text-[10px] font-black uppercase tracking-wider bg-transparent outline-none"
                value={filters.agentId}
                onChange={(e) => updateFilter({ agentId: e.target.value })}
              >
                <option value="">Agentes</option>
                <option value="atencion">Atención</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-cm-bg/50 border border-cm-border rounded-xl px-3 py-1.5">
              <Calendar size={12} className="text-cm-text-secondary" />
              <select
                className="text-[10px] font-black uppercase tracking-wider bg-transparent outline-none"
                value={filters.dateRange}
                onChange={(e) => updateFilter({ dateRange: e.target.value as any })}
              >
                <option value="all">Tiempo</option>
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="week">Semana</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-cm-bg/50 border border-cm-border rounded-xl px-3 py-1.5">
              <AlertTriangle size={12} className="text-cm-text-secondary" />
              <select
                className="text-[10px] font-black uppercase tracking-wider bg-transparent outline-none"
                value={filters.impact}
                onChange={(e) => updateFilter({ impact: e.target.value as any })}
              >
                <option value="all">Impacto</option>
                <option value="critical">Crítico</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cm-text-secondary" />
              <input
                className="w-full text-xs font-medium bg-cm-bg/50 border border-cm-border rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-cm-accent/30 transition-all"
                placeholder="Buscar en el registro..."
                value={filters.search}
                onChange={(e) => updateFilter({ search: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`divide-y divide-cm-border/50 ${compact ? "max-h-[400px] overflow-y-auto" : ""}`}>
        {filtered.slice(0, compact ? 10 : 100).map((log, i) => (
          <motion.div
            key={log.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-start gap-4 px-5 py-4 text-sm hover:bg-cm-accent/5 transition-colors group"
          >
            <div className="mt-1">
              {log.result === "success" ? (
                <div className="p-1 rounded-full bg-cm-success/10 text-cm-success">
                  <CheckCircle size={14} />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-cm-error/10 text-cm-error">
                  <XCircle size={14} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs tracking-tight uppercase">{TOOL_LABELS[log.tool] || log.tool}</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                  log.agentId === "admin" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"
                }`}>
                  {log.agentId}
                </span>
              </div>
              <p className="text-xs text-cm-text-secondary font-medium line-clamp-1 group-hover:line-clamp-none transition-all">
                {log.message}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cm-text-secondary shrink-0 opacity-60">
              <Clock size={10} />
              {formatLogTime(log.timestamp)}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-cm-text-secondary">
            <Search size={32} className="mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Sin actividad reciente</p>
          </div>
        )}
      </div>

      {!compact && filtered.length > 0 && (
        <div className="p-4 border-t border-cm-border bg-cm-surface/30 flex justify-between items-center">
          <span className="text-[10px] font-bold text-cm-text-secondary uppercase tracking-widest">{filtered.length} registros</span>
          <button
            onClick={() => exportCSV(filtered)}
            className="text-[10px] font-bold text-cm-accent hover:text-cm-accent-hover uppercase tracking-widest transition-colors flex items-center gap-1.5"
          >
            Descargar Reporte CSV
          </button>
        </div>
      )}
    </div>
  );
}

function formatLogTime(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = Date.now();
  if (now - ts < 60000) return "ahora";
  if (now - ts < 3600000) return `${Math.floor((now - ts) / 60000)}m`;
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function exportCSV(logs: ActivityLog[]) {
  const headers = ["timestamp", "agentId", "tool", "result", "message", "duration"];
  const rows = logs.map((l) => [
    new Date(l.timestamp).toISOString(),
    l.agentId,
    l.tool,
    l.result,
    `"${(l.message || "").replace(/"/g, '""')}"`,
    l.duration || 0,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `househub-logs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
