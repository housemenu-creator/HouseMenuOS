/**
 * Task Scheduler — periodic loop that reads AGENT_TASKS from Firebase
 * and executes due tasks using the LLM executor + MCP tools.
 *
 * Runs every 30 seconds. Designed to never throw or crash the main process.
 */

import { initFirebase, ref, get, child, update, push, set } from "../lib/firebase.js";
import { executeTask } from "../agent/executor.js";
import { sendTelegramMessage } from "./telegram-sender.js";
import { getPrimaryBranchId } from "../lib/branch.js";
import logger from "../lib/logger.js";

// ── Helpers ────────────────────────────────────────────

/** Recursively convert undefined → null for Firebase RTDB */
function sanitize(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = sanitize(v);
    }
    return cleaned;
  }
  return obj;
}

// ── Condition evaluator ───────────────────────────────

interface ConditionResult {
  triggered: boolean;
  context?: {
    message: string;
    [key: string]: unknown;
  };
  triggeredItems?: Array<{ path: string; id: string }>;
  reason?: string;
}

/**
 * Evaluate a condition-based task. Returns whether the condition is met
 * and the items that triggered it (for marking as notified).
 */
async function evaluateCondition(
  db: ReturnType<typeof initFirebase>,
  task: Record<string, any>,
  branchId: string,
  taskId: string,
): Promise<ConditionResult> {
  const { condicion_tipo, condicion_params } = task;

  switch (condicion_tipo) {
    case "pedido_demorado": {
      const estado = condicion_params?.estado || "preparando";
      const minutos = parseInt(condicion_params?.minutos || "30", 10);
      const cutoff = Date.now() - minutos * 60 * 1000;

      const snap = await get(child(ref(db), `branches/${branchId}/orders`));
      if (!snap.exists()) return { triggered: false, reason: "no hay pedidos en la sucursal" };

      const orders = snap.val() as Record<string, any>;
      const now = Date.now();
      const delayed: Array<{ id: string; path: string; data: Record<string, any> }> = [];

      for (const [id, order] of Object.entries(orders)) {
        if (order.status !== estado) continue;
        // Skip if already notified for this task
        if (order.alertas_notificadas?.[taskId]) continue;
        const updatedAt = new Date(order.updatedAt || order.createdAt).getTime();
        if (updatedAt < cutoff) {
          delayed.push({ id, path: `branches/${branchId}/orders/${id}`, data: order });
        }
      }

      if (delayed.length > 0) {
        const ordersDetail = delayed.map((d) => ({
          id: d.id,
          cliente: d.data.cliente || "?",
          total: d.data.total || 0,
          items: (d.data.items || []).map((i: any) => i.name).join(", "),
          demora_min: Math.floor((now - new Date(d.data.updatedAt || d.data.createdAt).getTime()) / 60000),
          telefono: d.data.phone || d.data.customerPhone || "",
        }));

        return {
          triggered: true,
          context: {
            message: `⚠️ ${delayed.length} pedido(s) demorado(s) en estado "${estado}" por más de ${minutos} min.\n\nDetalle:\n${
              ordersDetail.map((o) => `• #${o.id.slice(-6).toUpperCase()} — ${o.cliente} — S/ ${Number(o.total).toFixed(2)} — ${o.items.slice(0, 50)} — ${o.demora_min}min`).join("\n")
            }`,
            cantidad: delayed.length,
            estado,
            minutos_maximo: minutos,
            orders: ordersDetail,
          },
          triggeredItems: delayed.map((d) => ({ path: d.path, id: d.id })),
        };
      }
      const prepCount = Object.values(orders).filter((o: any) => o.status === "preparando").length;
      return { triggered: false, reason: `${delayed.length} demorados de ${prepCount} en preparando (>${minutos}min)` };
    }

    default:
      return { triggered: false, reason: `tipo de condición "${condicion_tipo}" no soportado` };
  }
}

// ── Seed tasks ─────────────────────────────────────────

const SEED_TASKS: Record<string, Record<string, unknown>> = {
  "seed-promo-inactivos": {
    instruccion:
      "Mandale un mensaje por WhatsApp a los clientes que no hicieron ningún pedido en los últimos 15 días, " +
      "ofreciéndoles un cupón de 10% de descuento en su próxima compra. " +
      "Personalizá el mensaje con el nombre del cliente si está disponible. " +
      "Si no tiene nombre, usá un saludo genérico.",
    tipo: "programada",
    cada_minutos: 10080, // 7 días
    activa: true,
    canal: "telegram",
    tools_permitidas: ["clientes_inactivos", "enviar_whatsapp", "generar_cupon", "promocionar_telegram"],
    ultima_ejecucion: null,
    proxima_ejecucion: null,
    // branch_id omitido → automáticamente usa el branch primario (getPrimaryBranchId())
  },

  "seed-alerta-demorados": {
    instruccion:
      "Los siguientes pedidos están demorados en preparación. " +
      "SIEMPRE: primero avisá al cliente por WhatsApp informando que su pedido va a demorar un poco más y disculpate. " +
      "DESPUÉS: avisale al supervisor por Telegram con el detalle de cada pedido demorado.",
    tipo: "condicion",
    condicion_tipo: "pedido_demorado",
    condicion_params: {
      estado: "preparando",
      minutos: 20,
    },
    activa: true,
    canal: "telegram",
    tools_permitidas: ["enviar_whatsapp", "enviar_telegram", "consultar_pedidos", "consultar_staff"],
    ultima_ejecucion: null,
    proxima_ejecucion: null,
    // branch_id omitido → automáticamente usa el branch primario (getPrimaryBranchId())
  },

  "seed-reporte-diario": {
    instruccion:
      "Generá un resumen de las ventas del día de hoy: total facturado, cantidad de pedidos, " +
      "pedidos por estado, y ticket promedio. " +
      "Si el total es mayor a S/ 500, felicitá al equipo. " +
      "Enviale el reporte al administrador por Telegram.",
    tipo: "programada",
    cada_minutos: 1440, // 24 h
    activa: true,
    canal: "telegram",
    tools_permitidas: ["consultar_pedidos"],
    ultima_ejecucion: null,
    proxima_ejecucion: null,
    // branch_id omitido → automáticamente usa el branch primario (getPrimaryBranchId())
  },

  "seed-ventas-pico": {
    instruccion:
      "Analizá los pedidos de hoy. Si el total de pedidos en los últimos 60 minutos supera los 15, " +
      "avisale al administrador por Telegram que estamos en hora pico y podría haber demoras. " +
      "Incluí el número de pedidos en el período y el ticket promedio.",
    tipo: "programada",
    cada_minutos: 60, // 1 h
    activa: true,
    canal: "telegram",
    tools_permitidas: ["consultar_pedidos"],
    ultima_ejecucion: null,
    proxima_ejecucion: null,
    // branch_id omitido → automáticamente usa el branch primario (getPrimaryBranchId())
  },

  "seed-apertura-caja": {
    instruccion:
      "Es hora de arrancar el día. Informale al administrador por Telegram que la caja está abierta " +
      "y listo para recibir pedidos. Incluí un saludo motivacional corto para el equipo.",
    tipo: "programada",
    cada_minutos: 1440, // 24 h
    activa: true,
    canal: "telegram",
    tools_permitidas: [],
    ultima_ejecucion: null,
    proxima_ejecucion: null,
    // branch_id omitido → automáticamente usa el branch primario (getPrimaryBranchId())
  },
};

async function ensureSeedTasks(db: ReturnType<typeof initFirebase>, branchId: string): Promise<void> {
  try {
    const snap = await get(child(ref(db), "agent_tasks"));
    const existingTasks = snap.exists() ? (snap.val() as Record<string, any>) : {};

    for (const [id, task] of Object.entries(SEED_TASKS)) {
      if (!existingTasks[id]) {
        await set(child(ref(db), `agent_tasks/${id}`), task as Record<string, unknown>);
        logger.info(`📋 Scheduler: tarea seed "${id}" creada`);
      }
    }

    // ── Migration: fix existing tasks ──
    for (const [id, existingTask] of Object.entries(existingTasks)) {
      const updates: Record<string, unknown> = {};

      // Fix branch_id "default" → real branch
      if (existingTask.branch_id === "default") {
        updates.branch_id = branchId;
      }

      // Add consultar_staff to seed-alerta-demorados tools
      if (id === "seed-alerta-demorados") {
        const tools = (existingTask.tools_permitidas || []) as string[];
        if (!tools.includes("consultar_staff")) {
          updates.tools_permitidas = [...tools, "consultar_staff"];
        }
      }

      if (Object.keys(updates).length > 0) {
        await update(child(ref(db), `agent_tasks/${id}`), updates);
        logger.info(`📋 Scheduler: migrada tarea "${id}" — ${Object.keys(updates).join(", ")}`);
      }
    }
  } catch (e) {
    logger.warn(e, "⚠️ Scheduler: error al crear seed tasks:");
  }
}

// ── Seed test employee for Portal Empleados ────────────

const TEST_EMPLOYEE = {
  name: "Demo",
  email: "demo@houseportal.local",
  phone: "+51999000001",
  role: "mozo",
  pin: "123456",
  active: true,
  startDate: new Date().toISOString(),
  hourlyRate: 0,
  notes: "Empleado de prueba para Portal Empleados",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schedule: {
    lunes:    { start: "09:00", end: "17:00", active: true },
    martes:   { start: "09:00", end: "17:00", active: true },
    miércoles:{ start: "09:00", end: "17:00", active: true },
    jueves:   { start: "09:00", end: "17:00", active: true },
    viernes:  { start: "09:00", end: "17:00", active: true },
    sábado:   { start: "10:00", end: "14:00", active: true },
    domingo:  { start: "",      end: "",       active: false },
  },
  goals: {
    "goal-bienvenida": {
      title: "Completar inducción",
      description: "Revisar los materiales de bienvenida y familiarizarse con el sistema",
      completed: false,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    "goal-ventas": {
      title: "Meta de ventas semanales",
      description: "Alcanzar S/ 2,000 en ventas esta semana",
      completed: false,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    "goal-feedback": {
      title: "Encuestas de satisfacción",
      description: "Obtener al menos 5 reseñas positivas esta semana",
      completed: false,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  },
};

async function ensureTestEmployee(db: ReturnType<typeof initFirebase>, branchId: string): Promise<void> {
  try {
    const snap = await get(child(ref(db), `branches/${branchId}/employees`));
    if (snap.exists()) {
      const employees = snap.val() as Record<string, any>;
      const hasAny = Object.values(employees).some((e: any) => e.active !== false);
      if (hasAny) return; // At least one active employee exists
    }

    // No active employees → create test employee
    const empRef = push(child(ref(db), `branches/${branchId}/employees`));
    await set(empRef, sanitize(TEST_EMPLOYEE));
    logger.info(`👤 Scheduler: empleado de prueba creado (PIN: 123456) — ${empRef.key}`);
  } catch (e) {
    logger.warn(e, "⚠️ Scheduler: error al crear empleado de prueba:");
  }
}

// ── Seed test data (orders + customers) ───────────────

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const TEST_ORDERS: Array<Record<string, any>> = [
  // 2 delayed orders (preparando + >20 min) — will trigger seed-alerta-demorados
  { status: "preparando", cliente: "Carlos García", customerPhone: "+51999000011",
    total: 45.50, items: [{ name: "Lomo Saltado", quantity: 1, price: 28 }, { name: "Inka Kola 500ml", quantity: 1, price: 5 }],
    createdAt: ago(35), updatedAt: ago(35), type: "delivery", address: "Av. Principal 123" },
  { status: "preparando", cliente: "María López", customerPhone: "+51999000022",
    total: 62.00, items: [{ name: "Ceviche Mixto", quantity: 1, price: 35 }, { name: "Arroz con Mariscos", quantity: 1, price: 27 }],
    createdAt: ago(25), updatedAt: ago(25), type: "delivery", address: "Jr. Las Flores 456" },
  // 1 recent order in preparando (won't trigger — <20 min)
  { status: "preparando", cliente: "Pedro Sánchez", customerPhone: "+51999000033",
    total: 28.00, items: [{ name: "Pollo a la Brasa 1/4", quantity: 1, price: 28 }],
    createdAt: ago(5), updatedAt: ago(5), type: "delivery", address: "Calle Los Olivos 789" },
  // 2 delivered orders
  { status: "entregado", cliente: "Ana Torres", customerPhone: "+51999000044",
    total: 33.50, items: [{ name: "Tallarín Rojo", quantity: 1, price: 22 }, { name: "Chicha Morada", quantity: 1, price: 6 }],
    createdAt: ago(1440), updatedAt: ago(1380), type: "delivery" },
  { status: "entregado", cliente: "Luis Mendoza", customerPhone: "+51999000055",
    total: 78.00, items: [{ name: "Parrilla para 2", quantity: 1, price: 65 }, { name: "Cerveza", quantity: 2, price: 13 }],
    createdAt: ago(2880), updatedAt: ago(2820), type: "delivery" },
  // 1 cancelled order
  { status: "cancelado", cliente: "Rosa Flores", customerPhone: "+51999000066",
    total: 55.00, items: [{ name: "Ají de Gallina", quantity: 1, price: 32 }, { name: "Arroz con Leche", quantity: 1, price: 8 }],
    createdAt: ago(720), updatedAt: ago(700), type: "delivery", motivo: "Cliente canceló" },
];

const TEST_CUSTOMERS: Array<Record<string, any>> = [
  // 2 inactive (lastOrder > 7 days ago)
  { name: "Carlos García", phone: "+51999000011", email: "carlos@example.com",
    totalSpent: 320.00, orderCount: 8, points: 32,
    lastOrderAt: ago(10080), createdAt: ago(518400), notas: "Cliente inactivo desde hace 7 días" },
  { name: "María López", phone: "+51999000022", email: "maria@example.com",
    totalSpent: 180.50, orderCount: 5, points: 18,
    lastOrderAt: ago(21600), createdAt: ago(259200), notas: "Cliente inactivo desde hace 15 días" },
  // 1 active customer
  { name: "Ana Torres", phone: "+51999000044", email: "ana@example.com",
    totalSpent: 450.00, orderCount: 12, points: 45,
    lastOrderAt: ago(1440), createdAt: ago(777600), notas: "Cliente frecuente" },
  // 1 new customer (never ordered)
  { name: "Jorge Ruiz", phone: "+51999000077", email: "jorge@example.com",
    totalSpent: 0, orderCount: 0, points: 0,
    lastOrderAt: "", createdAt: ago(43200), notas: "Nuevo registro, aún sin pedidos" },
];

async function ensureTestData(db: ReturnType<typeof initFirebase>, branchId: string): Promise<void> {
  try {
    // ── Check / flag: has delayed orders? ──
    const orderSnap = await get(child(ref(db), `branches/${branchId}/orders`));
    let hasDelayedOrders = false;
    if (orderSnap.exists()) {
      const orders = Object.values(orderSnap.val()) as any[];
      const now = Date.now();
      // Check if any order is "preparando" AND updated > 20 min ago
      hasDelayedOrders = orders.some((o: any) => {
        if (o.status !== "preparando") return false;
        const updatedAt = new Date(o.updatedAt || o.createdAt).getTime();
        return (now - updatedAt) > 20 * 60 * 1000;
      });
    }

    if (!hasDelayedOrders) {
      for (const o of TEST_ORDERS) {
        const ordRef = push(child(ref(db), `branches/${branchId}/orders`));
        await set(ordRef, sanitize(o));
        logger.info(`📦 Test data: pedido #${ordRef.key?.slice(-6).toUpperCase()} — ${o.cliente} (${o.status})`);
      }
    }

    // ── Customers — check for test customers by phone ──
    const custSnap = await get(child(ref(db), "customers"));
    const testPhones = new Set(TEST_CUSTOMERS.map((c) => c.phone));
    let hasTestCustomers = false;
    if (custSnap.exists()) {
      const customers = Object.values(custSnap.val()) as any[];
      hasTestCustomers = customers.some((c: any) => testPhones.has(c.phone));
    }

    if (!hasTestCustomers) {
      for (const c of TEST_CUSTOMERS) {
        const custRef = push(child(ref(db), "customers"));
        await set(custRef, sanitize(c));
        logger.info(`👤 Test data: cliente "${c.name}" creado`);
      }
    }
  } catch (e) {
    logger.warn(e, "⚠️ Scheduler: error al crear test data:");
  }
}

// ── Main scheduler ────────────────────────────────────

export function startScheduler(): () => void {
  const db = initFirebase();
  const branchId = getPrimaryBranchId();

  // Ensure seed tasks + test employee + test orders exist on startup
  ensureSeedTasks(db, branchId).catch(() => {});
  ensureTestEmployee(db, branchId).catch(() => {});
  ensureTestData(db, branchId).catch(() => {});

  let running = false;
  let stopped = false;

  const tick = async () => {
    if (running || stopped) return;
    running = true;

    try {
      const snap = await get(child(ref(db), "agent_tasks"));
      if (!snap.exists()) {
        logger.info("⏱️ Scheduler tick: no hay agent_tasks aún");
        running = false;
        return;
      }

      const tasks = snap.val() as Record<string, any>;
      const now = Date.now();
      const activeCount = Object.values(tasks).filter((t: any) => t.activa !== false).length;
      logger.info(`⏱️ Scheduler tick: ${Object.keys(tasks).length} tareas (${activeCount} activas) — ${new Date(now).toLocaleTimeString("es-PE")}`);

      for (const [id, task] of Object.entries(tasks)) {
        try {
          if (!task.activa) continue;

          const taskBranch = task.branch_id || branchId;

          // Determine execution trigger per task type
          let shouldRun = false;
          let condResult: ConditionResult | null = null;

          if (task.tipo === "condicion") {
            condResult = await evaluateCondition(db, task, taskBranch, id);
            shouldRun = condResult.triggered;
            if (!shouldRun) {
              logger.info(`  ⏳ "${id}": condición no gatillada (${condResult.reason || "sin coincidencias"})`);
            }
          } else {
            const isFirstRun = task.proxima_ejecucion == null;
            const isDue = !isFirstRun && task.proxima_ejecucion <= now;
            shouldRun = isFirstRun || isDue;
          }

          if (!shouldRun) continue;

          // ── Execute ──────────────────────────────────
          // Inject condition context into instruction when triggered by condition
          const instruccionFinal = condResult?.context
            ? `${task.instruccion}\n\n📋 CONTEXTO DE LA CONDICIÓN:\n${condResult.context.message}`
            : task.instruccion;

          logger.info(`▶️ Scheduler: ejecutando "${id}" (${instruccionFinal.slice(0, 80)}...)`);
          const allowedTools: string[] = task.tools_permitidas || [];

          const result = await executeTask(
            instruccionFinal,
            allowedTools,
            taskBranch,
          );

          logger.info(`  ✅ Resultado: ${result.success ? "ok" : "error"} — ${(result.summary || result.error || "").slice(0, 120)}`);

          // ── Log to AGENT_AUDIT ──────────────────────
          const auditEntry = {
            task_id: id,
            ejecucion: now,
            tipo: task.tipo || "programada",
            instruccion: instruccionFinal,
            canal: task.canal || null,
            resultado: result.success ? "ok" : "error",
            resumen: result.summary || result.error || "",
            herramientas: result.toolCalls.map((tc) => ({
              herramienta: tc.herramienta,
              args: tc.args,
              resultado: tc.resultado,
              duracion_ms: tc.duracion_ms,
              success: tc.success,
            })),
            branch_id: taskBranch,
          };

          const auditRef = push(child(ref(db), "agent_audit"));
          await set(auditRef, sanitize(auditEntry));

          // ── Update task ──────────────────────────────
          const nextRun = task.cada_minutos ? now + task.cada_minutos * 60000 : null;
          await update(child(ref(db), `agent_tasks/${id}`), {
            ultima_ejecucion: now,
            proxima_ejecucion: nextRun,
            ultimo_resultado: sanitize({
              estado: result.success ? "ok" : "error",
              resumen: result.summary || result.error || "",
              timestamp: now,
            }),
          });

          // ── Mark triggered items as notified ────────
          if (condResult?.triggeredItems) {
            for (const item of condResult.triggeredItems) {
              await update(child(ref(db), `${item.path}`), {
                [`alertas_notificadas/${id}`]: true,
              }).catch(() => {});
            }
            logger.info(`  🔔 Marcados ${condResult.triggeredItems.length} items como notificados`);
          }

          // ── Notify ───────────────────────────────────
          if (result.summary || result.error) {
            const notificationText = result.success
              ? `✅ *Tarea completada:* ${id}\n\n${result.summary}`
              : `❌ *Tarea falló:* ${id}\n\n${result.error}`;

            if (task.canal === "telegram" && task.canal_destino) {
              await sendTelegramMessage(task.canal_destino, notificationText).catch(() => {});
            } else if (task.canal === "telegram") {
              // No explicit destino → try env var
              const defaultChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
              if (defaultChat) {
                await sendTelegramMessage(defaultChat, notificationText).catch(() => {});
              }
            }
          }
        } catch (taskErr: any) {
          logger.error(`❌ Scheduler: error en tarea "${id}":`, taskErr);
        }
      }
    } catch (e: any) {
      logger.error(e, "❌ Scheduler tick error:");
    }

    running = false;
  };

  // Run immediately, then every 30s
  tick();
  const interval = setInterval(tick, 30000);

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
