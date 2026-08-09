// Test admin agent flow (the one Telegram owner chat uses).
import "dotenv/config";
import { processMessage } from "../src/agent/processMessage.js";

async function main() {
  const t0 = Date.now();
  const r = await processMessage(
    "cuánto vendimos hoy",
    "monteverde",
    [
      { role: "user", content: "quiero pedir un ceviche" },
      { role: "assistant", content: "Claro, tenemos Ceviche de Pota (S/ 25), Ceviche de Filete (S/ 28) y Ceviche Mixto (S/ 32). ¿Cuál te gustaría? Además, ¿deseas algo para tomar?" },
      { role: "user", content: "uno mixto, pago al retirar" },
      { role: "assistant", content: "Perfecto, tu pedido está confirmado. Ceviche Mixto, pago al retirar. ¡Gracias!" },
    ],
    "admin",
    { phone: "51999999999", platform: "telegram" },
  );
  console.log(`RESP (${Date.now() - t0}ms):`, r.slice(0, 300));
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
