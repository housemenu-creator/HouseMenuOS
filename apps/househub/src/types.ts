export interface AgentStatus {
  status: "online" | "offline" | "error";
  lastSeen: number;
  messagesToday: number;
  toolsExecuted: number;
  version: string;
}

export interface SystemStatus {
  firebase: "ok" | "error";
  openrouter: "ok" | "error";
  uptime: number;
  lastHeartbeat: number;
}

export interface ActivityLog {
  id: string;
  agentId: string;
  tool: string;
  args?: unknown;
  result: "success" | "error";
  message: string;
  duration: number;
  chatId?: string;
  timestamp: number;
}

export interface ErrorAlert {
  id: string;
  agentId: string;
  tool?: string;
  message: string;
  resolved: boolean;
  timestamp: number;
}

export interface DailyMetric {
  totalMessages: number;
  totalTools: number;
  totalErrors: number;
  toolsByType: Record<string, number>;
  messagesByHour: number[];
}

export interface BranchSystemData {
  agents: {
    atencion?: AgentStatus;
    admin?: AgentStatus;
  };
  system?: SystemStatus;
}

export interface Order {
  id: string;
  cliente: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  direccion: string;
  telefono: string;
  metodo_pago: string;
  nota: string;
  tipo: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt?: number;
}
