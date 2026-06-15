/**
 * MCP Server — expone todos los tools via stdio (MCP protocol) y provee loader para el registry.
 * Compatible con Claude Desktop, Cursor y otros MCP clients.
 *
 * Uso standalone:
 *   npx tsx src/mcp/server.ts
 *
 * Uso en el agente:
 *   import { loadTools } from "./server.js";
 *   loadTools();  // registra todos los tools en el registry global
 */
import { registry } from "./registry.js";
import { ordersTools } from "./tools/orders.js";
import { menuTools } from "./tools/menu.js";
import { inventoryTools } from "./tools/inventory.js";
import { deliveryTools } from "./tools/delivery.js";
import { cajaTools } from "./tools/caja.js";
import { sunatTools } from "./tools/sunat.js";
import { branchTools } from "./tools/branch.js";
import { analyticsTools } from "./tools/analytics.js";
import { customerTools } from "./tools/clientes.js";
import { predictTools } from "./tools/predict.js";
import { systemTools } from "./tools/system.js";
import { notificationTools } from "./tools/notificaciones.js";
import { staffTools } from "./tools/staff.js";

export function loadTools(): void {
  const all = [
    ...ordersTools,
    ...menuTools,
    ...inventoryTools,
    ...deliveryTools,
    ...cajaTools,
    ...sunatTools,
    ...branchTools,
    ...analyticsTools,
    ...customerTools,
    ...predictTools,
    ...systemTools,
    ...notificationTools,
    ...staffTools,
  ];
  for (const tool of all) {
    registry.register(tool);
  }
}

// ── Standalone MCP stdio server ─────────────────────────
// NOTE: loadTools() is NOT called at module level to avoid circular dependency:
//   server.ts → system.ts → whatsapp.ts → agent/index.ts → server.ts
// Entry points (http.ts, bot.ts) and agent/index.ts call loadTools() explicitly.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function startMcpServer() {
  loadTools(); // Llamado aquí para standalone, no a nivel módulo
  const server = new Server(
    { name: "housepysbot-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.toMcpDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = registry.get(name);
    if (!tool) {
      return { content: [{ type: "text", text: `Tool "${name}" no encontrado` }], isError: true };
    }
    const { getPrimaryBranchId } = await import("../lib/branch.js");
    const branchId = getPrimaryBranchId();
    const result = await tool.execute(args || {}, branchId);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      isError: !result.success,
    };
  });

  const transport = new StdioServerTransport();
  console.error("🚀 MCP Server iniciado (stdio)");
  await server.connect(transport);
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startMcpServer().catch(console.error);
}

export { startMcpServer, registry };
