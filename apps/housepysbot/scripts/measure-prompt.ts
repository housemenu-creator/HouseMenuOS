// Measure actual prompt size (system + tools + history + message).
import "dotenv/config";
import { loadTools, registry } from "../src/mcp/server.js";
import { createAdapter } from "../src/mcp/adapter.js";
import { getAgentConfigCached } from "../src/lib/agentConfig.js";
import { buildSystemPrompt } from "../src/agent/prompt-builder.js";

async function main() {
  loadTools();
  const adapter = createAdapter(() => registry.getAll());
  const config = await getAgentConfigCached("monteverde", "admin");
  const allTools = adapter.toOpenAiTools();
  const allowedSet = new Set(config.allowedTools);
  const filteredTools = allTools.filter((t) => allowedSet.has(t.function.name));

  const systemPrompt = await buildSystemPrompt("monteverde", "admin", "cuánto vendimos hoy", {
    phone: "51999999999",
    platform: "telegram",
  });

  const toolsJson = JSON.stringify(filteredTools);
  console.log("allowedTools:", config.allowedTools.length);
  console.log("tools json bytes:", toolsJson.length, "≈", Math.round(toolsJson.length / 4), "tokens");
  console.log("system prompt chars:", systemPrompt.length, "≈", Math.round(systemPrompt.length / 4), "tokens");
  const history = [
    { role: "user", content: "quiero pedir un ceviche" },
    { role: "assistant", content: "Claro, tenemos Ceviche de Pota (S/ 25), Ceviche de Filete (S/ 28) y Ceviche Mixto (S/ 32). ¿Cuál te gustaría? Además, ¿deseas algo para tomar?" },
    { role: "user", content: "uno mixto, pago al retirar" },
    { role: "assistant", content: "Perfecto, tu pedido está confirmado. Ceviche Mixto, pago al retirar. ¡Gracias!" },
  ];
  const historyTokens = JSON.stringify(history).length / 4;
  console.log("history ≈", Math.round(historyTokens), "tokens");
  console.log("TOTAL ≈", Math.round(toolsJson.length / 4 + systemPrompt.length / 4 + historyTokens + 50));
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
