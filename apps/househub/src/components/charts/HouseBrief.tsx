import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, X } from "lucide-react";
import { useMetrics } from "../../hooks/useMetrics";
import { useErrorAlerts } from "../../hooks/useErrorAlerts";

export default function HouseBrief() {
  const { today, week, loading } = useMetrics();
  const errors = useErrorAlerts();
  const [visible, setVisible] = useState(true);

  if (loading || !today) return null;
  if (!visible) return null;

  const yesterday = week.length > 1 ? week[week.length - 2] : null;
  const diff = yesterday ? today.totalTools - yesterday.totalTools : 0;
  const diffPct = yesterday && yesterday.totalTools > 0 ? ((diff / yesterday.totalTools) * 100).toFixed(1) : "0";
  const activeErrors = errors.filter((e: any) => !e.resolved);
  const topTool = Object.entries(today.toolsByType).sort(([, a], [, b]) => (b as number) - (a as number))[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[2rem] p-8 border border-hub-border relative overflow-hidden group shadow-xl"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-hub-accent/5 blur-[100px] rounded-full pointer-events-none" />
      
      <button
        onClick={() => setVisible(false)}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-hub-border/50 text-hub-muted transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-hub-warning/10 text-hub-warning">
          <Sparkles size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">HouseBrief</h2>
          <p className="text-xs text-hub-muted font-medium uppercase tracking-widest">Resumen de operaciones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-hub-muted tracking-widest">Actividad vs ayer</div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tracking-tighter">{today.totalTools}</span>
            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              diff >= 0 ? "bg-hub-success/10 text-hub-success" : "bg-hub-error/10 text-hub-error"
            }`}>
              {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {diff >= 0 ? "+" : ""}{diffPct}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-hub-muted tracking-widest">Tool más usada</div>
          <div className="text-xl font-bold tracking-tight">{topTool?.[0]?.replace(/_/g, " ") || "—"}</div>
          <div className="text-xs text-hub-muted font-medium">{(topTool?.[1] as number) || 0} ejecuciones hoy</div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-hub-muted tracking-widest">Estado Alertas</div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold tracking-tighter ${activeErrors.length > 0 ? "text-hub-error" : "text-hub-success"}`}>
              {activeErrors.length}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${activeErrors.length > 0 ? "text-hub-error" : "text-hub-success"}`}>
              {activeErrors.length > 0 ? "Requiere Atención" : "Sistema Estable"}
            </span>
          </div>
        </div>
      </div>

      {activeErrors.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 p-4 rounded-2xl bg-hub-error/5 border border-hub-error/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-hub-error animate-pulse" />
            <p className="text-xs font-bold text-hub-error uppercase tracking-wider">
              Errores Críticos
            </p>
          </div>
          <div className="space-y-2">
            {activeErrors.slice(0, 2).map((e: any) => (
              <p key={e.id} className="text-sm text-hub-text font-medium flex items-center gap-2">
                <span className="text-hub-error opacity-50">•</span> {e.message}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
