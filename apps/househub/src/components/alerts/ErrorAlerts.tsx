import { motion } from "framer-motion";
import { AlertTriangle, XCircle } from "lucide-react";
import { useErrorAlerts } from "../../hooks/useErrorAlerts";

export default function ErrorAlerts() {
  const errors = useErrorAlerts();
  const active = errors.filter((e) => !e.resolved).slice(0, 10);

  if (active.length === 0) return null;

  return (
    <div className="bg-hub-card border border-hub-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-hub-warning" />
        <span className="font-semibold text-sm">Alertas activas ({active.length})</span>
      </div>
      <div className="space-y-2">
        {active.map((err, i) => (
          <motion.div
            key={err.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-hub-error/5 border border-hub-error/20 text-sm"
          >
            <XCircle size={14} className="text-hub-error mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{err.agentId}{err.tool ? ` / ${err.tool}` : ""}</p>
              <p className="text-xs text-hub-muted truncate">{err.message}</p>
            </div>
            <span className="text-[10px] text-hub-muted shrink-0">
              {err.timestamp ? formatErrTime(err.timestamp) : ""}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function formatErrTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "ahora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}
