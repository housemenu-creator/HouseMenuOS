import { motion } from "framer-motion";
import { Wifi, WifiOff, AlertTriangle, Settings } from "lucide-react";
import type { AgentStatus, SystemStatus } from "../../types";

interface AgentCardProps {
  id: string;
  name: string;
  status?: AgentStatus;
}

export function AgentCard({ id, name, status }: AgentCardProps) {
  const isOnline = status?.status === "online";
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="glass p-5 rounded-2xl border border-cm-border transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-cm-success" : "bg-cm-error"}`} />
            {isOnline && <div className="absolute inset-0 w-3 h-3 rounded-full bg-cm-success animate-ping opacity-40" />}
          </div>
          <span className="font-bold text-sm tracking-tight">{name}</span>
        </div>
        <Icon size={16} className={isOnline ? "text-cm-success" : "text-cm-error"} />
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-cm-text-secondary tracking-widest">Estado</span>
          <p className={`text-xs font-semibold ${isOnline ? "text-cm-success" : "text-cm-error"}`}>
            {isOnline ? "En línea" : "Desconectado"}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-cm-text-secondary tracking-widest">Mensajes</span>
          <p className="text-xs font-semibold">{status?.messagesToday || 0}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-cm-text-secondary tracking-widest">Tools</span>
          <p className="text-xs font-semibold">{status?.toolsExecuted || 0}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-cm-text-secondary tracking-widest">Últ. vez</span>
          <p className="text-xs font-semibold">
            {status?.lastSeen ? formatTime(status.lastSeen) : "—"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "ahora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}

export function SystemCard({ system }: { system?: SystemStatus }) {
  const services = [
    { name: "Firebase", ok: system?.firebase === "ok" },
    { name: "OpenRouter", ok: system?.openrouter === "ok" },
  ];

  return (
    <div className="glass p-5 rounded-2xl border border-cm-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
          <Settings size={14} />
        </div>
        <span className="font-bold text-sm tracking-tight">Sistema</span>
      </div>
      
      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-xs">
            <span className="text-cm-text-secondary font-medium">{s.name}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-cm-success" : "bg-cm-error"}`} />
              <span className={`font-bold ${s.ok ? "text-cm-success" : "text-cm-error"}`}>
                {s.ok ? "OK" : "ERROR"}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-cm-border flex items-center justify-between text-xs">
        <span className="text-cm-text-secondary font-medium">Uptime</span>
        <span className="font-bold text-cm-text">{system?.uptime ? formatUptime(system.uptime) : "—"}</span>
      </div>
    </div>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}
