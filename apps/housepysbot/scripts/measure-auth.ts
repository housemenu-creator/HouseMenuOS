import "dotenv/config";
import { initFirebase, authenticateBot } from "../src/lib/firebase.js";
import { getAgentConfigCached } from "../src/lib/agentConfig.js";
import { buildSystemPrompt } from "../src/agent/prompt-builder.js";
import { loadTools, registry } from "../src/mcp/server.js";
import { createAdapter } from "../src/mcp/adapter.js";

async function main() {
  await authenticateBot();
  loadTools();
  const adapter = createAdapter(() => registry.getAll());
  const config = await getAgentConfigCached("monteverde", "admin");
  const filteredTools = adapter.toOpenAiTools().filter(t => config.allowedTools.includes(t.function.name));
  const prompt = await buildSystemPrompt("monteverde", "admin", "hola", { phone: "51999999999", platform: "telegram" });
  const toolsTokens = JSON.stringify(filteredTools).length / 4;
  const promptTokens = prompt.length / 4;
  console.log("tools:", filteredTools.length, "≈", Math.round(toolsTokens), "tokens");
  console.log("prompt ≈", Math.round(promptTokens), "tokens");
  console.log("TOTAL ≈", Math.round(toolsTokens + promptTokens + 100));
  process.exit(0);
}
main().catch(e => { console.error("ERR:", e.message); process.exit(1); });
