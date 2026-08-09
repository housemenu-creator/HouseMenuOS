// Reproduce the Telegram error locally.
import "dotenv/config";
import { processMessage } from "../src/agent/processMessage.js";

async function main() {
  console.log("=== Test 1: pedido simple ===");
  const r1 = await processMessage("quiero pedir un ceviche", "monteverde", [], "atencion");
  console.log("RESP:", r1.slice(0, 300));
  console.log();
  console.log("=== Test 2: hola ===");
  const r2 = await processMessage("hola", "monteverde", [], "atencion");
  console.log("RESP:", r2.slice(0, 300));
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
