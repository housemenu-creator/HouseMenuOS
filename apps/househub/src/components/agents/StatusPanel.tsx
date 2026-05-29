import { AgentCard, SystemCard } from "./AgentCard";
import { useAgentStatus } from "../../hooks/useAgentStatus";

export default function StatusPanel() {
  const { agents, system, loading } = useAgentStatus();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AgentCard id="atencion" name="Atención al Cliente" status={agents.atencion} />
      <AgentCard id="admin" name="Administración" status={agents.admin} />
      <SystemCard system={system} />
      <WhatsAppCard status={agents.atencion?.status} />
    </div>
  );
}

function WhatsAppCard({ status }: { status?: string }) {
  const connected = status === "online";
  return (
    <div className="bg-hub-card border border-hub-border rounded-xl p-4">
      <div className="font-semibold text-sm mb-3">💬 WhatsApp</div>
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-hub-muted">Conexión</span>
        <span className={connected ? "text-hub-success" : "text-hub-warning"}>{connected ? "Conectado" : "Desconocido"}</span>
      </div>
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-hub-muted">Sesión</span>
        <span className="font-medium">Activa</span>
      </div>
    </div>
  );
}
