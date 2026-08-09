import "dotenv/config";
import { loadTools, registry } from "../src/mcp/server.js";
import { createAdapter } from "../src/mcp/adapter.js";
try {
  loadTools();
  const all = registry.getAll();
  console.log("registered tools:", Object.keys(all).length);
  const adapter = createAdapter(() => all);
  const tools = adapter.toOpenAiTools();
  console.log("openai tools:", tools.length);
  console.log("json bytes:", JSON.stringify(tools).length);
  console.log("names:", tools.map(t => t.function.name).join(", "));
  process.exit(0);
} catch (e) { console.error("ERR:", e.message); process.exit(1); }
