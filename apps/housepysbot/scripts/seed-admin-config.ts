// Seed admin agent config with a trimmed toolset that fits Groq free-tier limits.
// Root cause: admin default has 44 tools (~7.5k tokens of definitions) + big prompt
// = ~8.8k tokens per call, exceeding llama-3.1-8b-instant TPM limit of 6k.
import "dotenv/config";
import { initFirebase, authenticateBot, ref, child, update } from "../src/lib/firebase.js";
import { AGENTS } from "../src/agents/config.js";

const db = initFirebase();
const branchId = process.env.HOUSEPYSBOT_BRANCH_ID || "monteverde";

const ADMIN_TOOLS = [
  // Orders / kitchen (launch day essentials)
  "ver_menu", "buscar_producto", "crear_pedido",
  "consultar_pedido", "consultar_pedidos", "ver_pendientes_cocina",
  "cambiar_estado_pedido", "cancelar_pedido",
  // Sales / cash
  "resumen_dia", "ventas_por_metodo", "abrir_turno", "cerrar_turno",
  // Menu / stock (minimal)
  "ver_stock", "alertas_stock_bajo",
  // Info / misc
  "info_restaurante", "ver_sucursales", "calcular_costo_zona",
  "generar_cpe", "kds_url",
];

async function main() {
  await authenticateBot();
  const defaultCfg = AGENTS.admin;
  const basePrompt = defaultCfg.systemPrompt;

  // Trim prompt: drop analytics/predictive sections whose tools are not granted.
  const analyticsIdx = basePrompt.indexOf("HERRAMIENTAS DE ANALYTICS");
  const predictiveIdx = basePrompt.indexOf("HERRAMIENTAS PREDICTIVAS");
  let prompt = basePrompt;
  if (analyticsIdx !== -1) {
    prompt = prompt.slice(0, analyticsIdx);
  } else if (predictiveIdx !== -1) {
    prompt = prompt.slice(0, predictiveIdx);
  }
  prompt = prompt.trim() + "\n\n- Para preguntas de negocio avanzadas (tendencias, clientes, staff, cocina, predicciones), la herramienta correspondiente puede no estar habilitada; respondé con los datos disponibles o indicá que esa función se habilita en la versión completa.";

  await update(child(ref(db), `branches/${branchId}/system/agents/admin`), {
    name: defaultCfg.name,
    systemPrompt: prompt,
    allowedTools: ADMIN_TOOLS,
    updatedAt: Date.now(),
  });
  console.log(`✅ admin config seeded (${ADMIN_TOOLS.length} tools, prompt ${prompt.length} chars)`);
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
