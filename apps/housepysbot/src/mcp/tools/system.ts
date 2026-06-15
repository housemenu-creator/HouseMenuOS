import { getRateLimitStats, resetRateLimit } from "../../lib/rateLimit.js";
import { getWhatsAppStatus } from "../../lib/wa-status.js";
import type { MCPTool } from "../registry.js";

export const systemTools: MCPTool[] = [
  {
    name: "sistema_estado",
    description: "Muestra el estado general del sistema: conexión WhatsApp, uso de rate limits",
    parameters: {},
    async execute(_args, _branchId) {
      const waStatus = JSON.parse(getWhatsAppStatus());
      return {
        success: true,
        message: [
          "📊 *Estado del Sistema*",
          "",
          `📱 WhatsApp: ${waStatus.status === "connected" ? "✅ Conectado" : "❌ Desconectado"}`,
          waStatus.number ? `   Número: ${waStatus.number}` : "",
          `⚡ Modelo IA: ${process.env.OPENROUTER_MODEL || "qwen/qwen3.6-flash"}`,
          process.env.OPENROUTER_FALLBACK ? `   Fallback: ${process.env.OPENROUTER_FALLBACK}` : "",
        ].filter(Boolean).join("\n"),
      };
    },
  },
  {
    name: "ver_rate_limits",
    description: "Muestra las estadísticas de rate limiting para todos los usuarios activos",
    parameters: {
      key: { type: "string", description: "Key específica a consultar (opcional), ej: \"tg:12345:admin\" o \"admin\" para ver solo admins" },
    },
    async execute(args, _branchId) {
      const filter = String(args.key || "").toLowerCase();
      return {
        success: true,
        message: "Usá los comandos del bot para monitorear rate limits. El sistema está configurado con límites por tipo de agente.",
      };
    },
  },
  {
    name: "resetear_rate_limit",
    description: "Resetea el rate limit de un usuario específico (admin override)",
    parameters: {
      usuario: { type: "string", description: "Usuario o key a resetear, ej: \"tg:12345:admin\" o un chat ID" },
    },
    async execute(args, _branchId) {
      const key = String(args.usuario || "");
      if (!key) {
        return { success: false, error: "Especificá el usuario a resetear. Ej: 'tg:12345:admin'" };
      }
      resetRateLimit(key);
      return { success: true, message: `✅ Rate limit reseteado para: ${key}` };
    },
  },
  {
    name: "kds_url",
    description: "Muestra la URL de la Pantalla de Cocina (KDS) para abrir en un monitor o tablet",
    parameters: {},
    async execute(_args, branchId) {
      const host = process.env.HOST || `http://localhost:${process.env.PORT || 3000}`;
      const url = `${host}/kds?branch=${branchId}`;
      return {
        success: true,
        message: `🖥 *Pantalla de Cocina (KDS)*\n\nAbrí esta URL en el monitor de la cocina:\n\`${url}\`\n\nActualiza automáticamente con cada pedido nuevo.`,
        data: { url, branchId },
      };
    },
  },
  {
    name: "recargar_config_agente",
    description: "Limpia el cache de configuración de agentes y fuerza recarga desde Firebase",
    parameters: {
      agente: { type: "string", description: "ID del agente a recargar (opcional). Si se omite, recarga todos." },
    },
    async execute(args, _branchId) {
      const { clearAgentConfigCache } = await import("../../lib/agentConfig.js");
      const agentId = String(args.agente || "").trim();
      if (agentId) {
        clearAgentConfigCache(_branchId, agentId);
        return { success: true, message: `✅ Cache de "${agentId}" limpiado. Se recargará desde Firebase en el próximo mensaje.` };
      }
      clearAgentConfigCache(_branchId);
      return { success: true, message: "✅ Cache de todos los agentes limpiado. Se recargarán desde Firebase." };
    },
  },
];
