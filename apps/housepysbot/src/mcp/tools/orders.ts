import { initFirebase, ref, get, child, push, set, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const STATUS_LABELS: Record<string, string> = {
  programado: "Programado",
  recibido: "Recibido",
  preparando: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const STATUS_FLOW: Record<string, string[]> = {
  programado: ["recibido"],
  recibido: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["en_camino", "entregado"],
  en_camino: ["entregado"],
  entregado: [],
  cancelado: [],
};

const STATUS_EMOJI: Record<string, string> = {
  recibido: "📥",
  preparando: "👨‍🍳",
  listo: "✅",
  en_camino: "🚚",
  entregado: "📦",
  cancelado: "❌",
  programado: "📅",
};

const or = (branchId: string) => `branches/${branchId}/orders`;

function fmtSoles(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

export const ordersTools: MCPTool[] = [
  {
    name: "crear_pedido",
    description: "Crea un nuevo pedido con productos del menú. Calcula automáticamente el costo de delivery según la zona si aplica.",
    parameters: {
      sucursal: { type: "string", description: "ID de sucursal donde crear el pedido (opcional, default la actual)" },
      cliente: { type: "string", description: "Nombre del cliente" },
      items: {
        type: "array",
        description: "Lista de productos con nombre y cantidad (el LLM determina los nombres desde el mensaje del usuario)",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre del producto tal como aparece en el menú" },
            quantity: { type: "number", description: "Cantidad del producto (default 1)" },
          },
          required: ["name"],
        },
      },
      direccion: { type: "string", description: "Dirección de entrega (opcional, solo para delivery)" },
      telefono: { type: "string", description: "Teléfono del cliente (opcional)" },
      metodo_pago: { type: "string", description: "Método de pago: efectivo, tarjeta, yape, plin (opcional, default efectivo)" },
      nota: { type: "string", description: "Nota adicional para el pedido (opcional)" },
      tipo: { type: "string", description: "Tipo de pedido: delivery, recojo, mesa (opcional, default delivery)" },
      fuente: { type: "string", description: "Canal por el que llegó el pedido: whatsapp, telegram, qr_menu, web (opcional, auto-detectado)" },
    },
    async execute(args, branchId) {
      try {
        const bid = String(args.sucursal || branchId);
        const catalogSnap = await get(child(ref(db), `branches/${bid}/catalog/products`));
        if (!catalogSnap.exists()) return { success: false, error: "El menú no está disponible" };
        const products = catalogSnap.val() as Record<string, any>;

        const rawItems: Array<{ name: string; quantity?: number }> = Array.isArray(args.items) ? args.items : [];
        const parsedItems: Array<{ productId: string; name: string; quantity: number; price: number }> = [];

        for (const item of rawItems) {
          const searchName = (item.name || "").toLowerCase().trim();
          if (!searchName) continue;
          const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

          const found = Object.entries(products).find(
            ([, p]: [string, any]) => p.name?.toLowerCase().includes(searchName)
          );
          if (!found) return { success: false, error: `No encontré "${item.name}" en el menú. Los productos disponibles son: ${Object.values(products).map((p: any) => p.name).join(", ")}` };
          const [prodId, prod] = found as [string, any];
          parsedItems.push({ productId: prodId, name: prod.name, quantity: qty, price: Number(prod.base_price ?? prod.price ?? 0) });
        }

        if (parsedItems.length === 0) return { success: false, error: "No se pudo identificar ningún producto del menú" };

        const subtotal = parsedItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const tipo = String(args.tipo || "delivery");
        let deliveryFee = 0;
        let freeThreshold = 0;

        if (tipo === "delivery") {
          const branchSnap = await get(child(ref(db), `branches_config/${bid}`));
          if (branchSnap.exists()) {
            const cfg = branchSnap.val();
            deliveryFee = Number(cfg.deliveryFee) || 0;
            freeThreshold = Number(cfg.freeThreshold) || 0;
          }
          if (freeThreshold > 0 && subtotal >= freeThreshold) deliveryFee = 0;
        }

        const ordersRef = child(ref(db), or(bid));
        const newRef = push(ordersRef);
        const timestamp = new Date().toISOString();

        const phoneRaw = String(args.telefono || "");
        const order = {
          id: newRef.key,
          items: parsedItems,
          cliente: String(args.cliente || "Cliente"),
          direccion: String(args.direccion || ""),
          telefono: phoneRaw,
          phone: phoneRaw, // ponytail: duplicado para orderNotifier que lee .phone
          metodo_pago: String(args.metodo_pago || "efectivo"),
          nota: String(args.nota || ""),
          tipo,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          status: "recibido",
          source: String(args.fuente || "whatsapp"),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await set(newRef, order);

        // Notificar al admin por Telegram
        (async () => {
          const adminChatId = process.env.ADMIN_CHAT_ID;
          if (!adminChatId) return;
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (!token) return;
          const itemsStr = order.items.map((i: any) => `• ${i.quantity}x ${i.name} — S/ ${(i.price * i.quantity).toFixed(2)}`).join("\n");
          const feeNote = deliveryFee > 0 ? `\n🚚 Delivery: S/ ${deliveryFee.toFixed(2)}` : deliveryFee === 0 && tipo === "delivery" ? "\n🚚 Delivery gratis" : "";
          const sourceIcon = order.source === "telegram" ? "✈️" : order.source === "qr_menu" ? "📱" : "💬";
          const msg = `${sourceIcon} *Nuevo pedido!*\n\n` +
            `👤 ${order.cliente}${order.telefono ? ` (${order.telefono})` : ""}\n` +
            `📋 #${order.id?.slice(-6).toUpperCase()}\n` +
            `━━━━━━━━━━━━\n${itemsStr}\n━━━━━━━━━━━━\n` +
            `💰 *S/ ${order.total.toFixed(2)}*${feeNote}\n` +
            `💳 ${order.metodo_pago}\n` +
            `📍 ${order.direccion || "Recojo en local"}\n` +
            `📡 ${order.source}`;
          try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: parseInt(adminChatId), text: msg, parse_mode: "Markdown" }),
            });
          } catch {}
        })();

        const feeNote = deliveryFee > 0 ? ` + S/ ${deliveryFee.toFixed(2)} delivery` : deliveryFee === 0 && tipo === "delivery" ? " (delivery gratis)" : "";
        return {
          success: true,
          data: { orderId: newRef.key, total: order.total, source: order.source },
          message: `Pedido #${newRef.key} creado: S/ ${order.total.toFixed(2)}${feeNote}`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al crear pedido: ${e.message}` };
      }
    },
  },
  {
    name: "consultar_pedido",
    description: "Consulta el estado actual de un pedido por su ID",
    parameters: {
      id: { type: "string", description: "ID del pedido" },
    },
    async execute(args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${or(branchId)}/${args.id}`));
        if (!snapshot.exists()) return { success: false, error: `No encontré el pedido "${args.id}"` };
        const o = snapshot.val();
        const items = (o.items || []).map((i: any) => `  • ${i.quantity}x ${i.name} — S/ ${(i.price * i.quantity).toFixed(2)}`).join("\n");
        return {
          success: true,
          data: o,
          message: [
            `📋 Pedido #${args.id}`,
            `Estado: ${STATUS_LABELS[o.status] || o.status}`,
            o.cliente ? `Cliente: ${o.cliente}` : "",
            items ? `\n${items}` : "",
            `Total: S/ ${Number(o.total).toFixed(2)}`,
            o.deliveryFee > 0 ? `Delivery: S/ ${Number(o.deliveryFee).toFixed(2)}` : "",
            o.tipo === "delivery" && o.direccion ? `Dirección: ${o.direccion}` : "",
            o.metodo_pago ? `Pago: ${o.metodo_pago}` : "",
            o.nota ? `Nota: ${o.nota}` : "",
          ].filter(Boolean).join("\n"),
        };
      } catch (e: any) {
        return { success: false, error: `Error al consultar pedido: ${e.message}` };
      }
    },
  },
  {
    name: "cambiar_estado_pedido",
    description: "Actualiza el estado de un pedido. Estados válidos: recibido, preparando, listo, en_camino, entregado, cancelado",
    parameters: {
      id: { type: "string", description: "ID del pedido" },
      estado: { type: "string", description: "Nuevo estado: recibido, preparando, listo, en_camino, entregado, cancelado" },
    },
async execute(args, branchId) {
      try {
        const estado = String(args.estado || "").toLowerCase();
        const validos = ["recibido", "preparando", "listo", "en_camino", "entregado", "cancelado"];
        if (!validos.includes(estado)) return { success: false, error: `Estado inválido: ${estado}. Válidos: ${validos.join(", ")}` };

        // Validate state transition (soft check)
        const refPath = child(ref(db), `${or(branchId)}/${args.id}`);
        const snap = await get(refPath);
        if (snap.exists()) {
          const current = snap.val();
          const allowed = STATUS_FLOW[current.status] || [];
          if (allowed.length > 0 && !allowed.includes(estado)) {
            const currentLabel = STATUS_LABELS[current.status] || current.status;
            const allowedLabels = allowed.map((s: string) => STATUS_LABELS[s] || s).join(", ");
            return { success: false, error: `Transición inválida: ${currentLabel} → ${STATUS_LABELS[estado]}. Solo permitido: ${allowedLabels}` };
          }
        }

        const now = new Date().toISOString();
        const timestampUpdates: Record<string, any> = {
          status: estado,
          updatedAt: now,
        };

        // Track preparation timestamps (matching InformalPos pattern)
        if (estado === "preparando") {
          timestampUpdates["statusTimestamps.recibido"] = timestampUpdates["statusTimestamps.recibido"] || snap.val()?.statusTimestamps?.recibido || now;
          timestampUpdates.preparationStartTime = now;
        }
        if (estado === "listo") {
          timestampUpdates.preparationEndTime = now;
          timestampUpdates["statusTimestamps.listo"] = now;
        }
        if (estado === "entregado") {
          timestampUpdates.completedAt = now;
          timestampUpdates["statusTimestamps.entregado"] = now;
        }
        if (estado === "cancelado") {
          timestampUpdates.cancelledAt = now;
          timestampUpdates.motivo_cancelacion = args.motivo || timestampUpdates.motivo_cancelacion;
        }

        await update(refPath, timestampUpdates);

        return { success: true, message: `Pedido #${args.id} actualizado a: ${STATUS_LABELS[estado] || estado}` };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar pedido: ${e.message}` };
      }
    },
  },
  {
    name: "ver_pendientes_cocina",
    description: "Muestra los pedidos pendientes que la cocina debe preparar. Lee de la cola de cocina y también busca pedidos en estado 'recibido' o 'preparando'.",
    parameters: {},
    async execute(_args, branchId) {
      try {
        // Try cocina queue first (real-time pushed by cocina watcher)
        const cocinaSnap = await get(child(ref(db), `branches/${branchId}/system/cocina/pendientes`));
        const cocinaOrders: string[] = [];

        if (cocinaSnap.exists()) {
          const entries = cocinaSnap.val();
          for (const [id, order] of Object.entries(entries) as [string, any][]) {
            cocinaOrders.push(
              `  🆔 #${id.slice(-6).toUpperCase()} — ${order.cliente || "?"} — S/ ${Number(order.total || 0).toFixed(2)} — ${order.items?.map?.((i: any) => `${i.quantity}x ${i.name}`).join(", ") || "sin items"}`
            );
          }
        }

        // Also scan orders for any in 'recibido' or 'preparando' not in cocina queue
        const ordersSnap = await get(child(ref(db), `branches/${branchId}/orders`));
        const extraOrders: string[] = [];

        if (ordersSnap.exists()) {
          const orders = ordersSnap.val();
          for (const [id, order] of Object.entries(orders) as [string, any][]) {
            if (!order.status) continue;
            if (order.status !== "recibido" && order.status !== "preparando") continue;
            // Skip if already in cocina queue
            if (cocinaSnap.exists() && cocinaSnap.val()[id]) continue;
            extraOrders.push(
              `  🆔 #${id.slice(-6).toUpperCase()} — ${order.cliente || "?"} — S/ ${Number(order.total || 0).toFixed(2)} — ${order.items?.map?.((i: any) => `${i.quantity}x ${i.name}`).join(", ") || "sin items"}`
            );
          }
        }

        const allOrders = [...cocinaOrders, ...extraOrders];
        if (allOrders.length === 0) {
          return { success: true, message: "🍳 *No hay pedidos pendientes* en cocina. ¡Todo al día!" };
        }

        return {
          success: true,
          data: { pendientes: allOrders.length },
          message: `🍳 *Pedidos Pendientes: ${allOrders.length}*\n\n${allOrders.join("\n")}`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al obtener pendientes: ${e.message}` };
      }
    },
  },
  {
    name: "consultar_pedidos",
    description: "Busca pedidos con filtros por estado, fecha, cliente. Devuelve resumen con cantidades, totales y lista de pedidos. Ideal para generar reportes diarios, semanales, o por estado.",
    parameters: {
      desde: { type: "string", description: "Fecha inicio (ISO o 'hoy', 'ayer', 'esta_semana', 'este_mes'). Default: 'hoy'" },
      hasta: { type: "string", description: "Fecha fin ISO. Default: ahora" },
      estado: { type: "string", description: "Filtrar por estado: recibido, preparando, listo, en_camino, entregado, cancelado. Opcional." },
      cliente: { type: "string", description: "Filtrar por nombre de cliente (búsqueda parcial). Opcional." },
      limite: { type: "string", description: "Máximo de resultados. Default: '50'" },
    },
    async execute(args, branchId) {
      try {
        const now = Date.now();
        const dayStart = (ts: number) => { const d = new Date(ts); d.setHours(0,0,0,0); return d.toISOString(); };

        // Parse date filters
        let desde: string;
        switch (String(args.desde || "hoy")) {
          case "hoy": desde = dayStart(now); break;
          case "ayer": desde = dayStart(now - 86400000); break;
          case "esta_semana": { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); desde = d.toISOString(); break; }
          case "este_mes": { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); desde = d.toISOString(); break; }
          default: desde = String(args.desde);
        }
        const hasta = String(args.hasta || new Date().toISOString());
        const estado = String(args.estado || "").toLowerCase().trim();
        const cliente = String(args.cliente || "").toLowerCase().trim();
        const limite = parseInt(String(args.limite || "50"));

        const snap = await get(child(ref(db), `branches/${branchId}/orders`));
        if (!snap.exists()) return { success: true, message: "No hay pedidos registrados.", data: [] };

        const orders = Object.entries(snap.val() as Record<string, any>)
          .map(([id, o]) => ({ id, ...o }))
          .filter((o: any) => {
            const date = o.createdAt || "";
            if (date < desde) return false;
            if (date > hasta) return false;
            if (estado && o.status !== estado) return false;
            if (cliente && !(o.cliente || "").toLowerCase().includes(cliente)) return false;
            return true;
          })
          .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""))
          .slice(0, limite);

        const totalVentas = orders
          .filter((o: any) => o.status !== "cancelado")
          .reduce((s: number, o: any) => s + Number(o.total || 0), 0);

        const porEstado: Record<string, number> = {};
        for (const o of orders) {
          porEstado[o.status || "sin_estado"] = (porEstado[o.status || "sin_estado"] || 0) + 1;
        }

        let msg = `📊 *Pedidos encontrados: ${orders.length}*\n`;
        msg += `💰 Total ventas: S/ ${totalVentas.toFixed(2)}\n\n`;
        msg += `*Por estado:*\n`;
        const STATUS_EMOJI: Record<string, string> = { recibido: "📥", preparando: "👨‍🍳", listo: "✅", en_camino: "🚚", entregado: "📦", cancelado: "❌" };
        for (const [est, cnt] of Object.entries(porEstado)) {
          msg += `  ${STATUS_EMOJI[est] || "📄"} ${STATUS_LABELS[est] || est}: ${cnt}\n`;
        }

        if (orders.length > 0) {
          msg += `\n*Últimos pedidos:*\n`;
          for (const o of orders.slice(0, 10)) {
            const emoji = STATUS_EMOJI[o.status] || "📄";
            const total = Number(o.total || 0).toFixed(2);
            const items = (o.items || []).map((i: any) => i.name).join(", ");
            msg += `  ${emoji} #${(o.id || "").slice(-6).toUpperCase()} — ${o.cliente || "?"} — S/ ${total} — ${items.slice(0, 60)}\n`;
          }
          if (orders.length > 10) msg += `  ... y ${orders.length - 10} más\n`;
        }

        return {
          success: true,
          data: { total: orders.length, totalVentas, porEstado, pedidos: orders },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al consultar pedidos: ${e.message}` };
      }
    },
  },
  {
    name: "cancelar_pedido",
    description: "Cancela un pedido existente",
    parameters: {
      id: { type: "string", description: "ID del pedido a cancelar" },
      motivo: { type: "string", description: "Motivo de la cancelación (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const refPath = child(ref(db), `${or(branchId)}/${args.id}`);
        const snap = await get(refPath);
        if (!snap.exists()) return { success: false, error: `No encontré el pedido "${args.id}"` };

await update(refPath, {
          status: "cancelado",
          motivo_cancelacion: String(args.motivo || ""),
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return { success: true, message: `Pedido #${args.id} cancelado${args.motivo ? ` (${args.motivo})` : ""}` };
      } catch (e: any) {
        return { success: false, error: `Error al cancelar pedido: ${e.message}` };
      }
    },
  },

  // ── 7. Stats del día ─────────────────────────────────────
  {
    name: "ordenes_stats_hoy",
    description: "Muestra estadísticas de pedidos del día: total de pedidos, ingresos, pedidos por estado, tiempo promedio de preparación, ticket promedio. Responde 'cómo vamos hoy', 'resumen del día', 'cuántos pedidos hoy'.",
    parameters: {},
    async execute(_args, branchId) {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startISO = startOfDay.toISOString();

        const snap = await get(child(ref(db), `branches/${branchId}/orders`));
        if (!snap.exists()) return { success: true, message: "📭 No hay pedidos registrados hoy.", data: { totalOrders: 0 } };

        const orders = (Object.values(snap.val()) as any[])
          .filter((o: any) => (o.createdAt || "") >= startISO && (o.status !== "cancelado" || o.createdAt >= startISO));

        if (orders.length === 0) return { success: true, message: "📭 No hay pedidos registrados hoy.", data: { totalOrders: 0 } };

        const totalRevenue = orders
          .filter((o: any) => o.status !== "cancelado")
          .reduce((s: number, o: any) => s + Number(o.total || 0), 0);

        // Status breakdown
        const porEstado: Record<string, number> = {};
        for (const o of orders) {
          const st = o.status || "desconocido";
          porEstado[st] = (porEstado[st] || 0) + 1;
        }

        // Kitchen times
        const prepTimes: number[] = [];
        for (const o of orders) {
          const ts = o.statusTimestamps;
          if (ts?.recibido && ts?.listo) {
            const diff = new Date(ts.listo).getTime() - new Date(ts.recibido).getTime();
            if (diff > 0) prepTimes.push(diff / 60000);
          }
        }
        const avgPrepTime = prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0;

        // Payment methods
        const metodos: Record<string, { count: number; total: number }> = {};
        for (const o of orders) {
          if (o.status === "cancelado") continue;
          const mp = o.metodo_pago || "efectivo";
          if (!metodos[mp]) metodos[mp] = { count: 0, total: 0 };
          metodos[mp].count++;
          metodos[mp].total += Number(o.total || 0);
        }

        const completados = orders.filter((o: any) => o.status === "entregado" || o.status === "listo").length;
        const pendientes = orders.filter((o: any) => o.status === "recibido" || o.status === "preparando").length;
        const avgTicket = orders.filter((o: any) => o.status !== "cancelado").length > 0
          ? totalRevenue / orders.filter((o: any) => o.status !== "cancelado").length : 0;

        let msg = `📊 *ESTADÍSTICAS DEL DÍA*\n`;
        msg += `📅 ${today.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}\n\n`;
        msg += `🛵 Pedidos: ${orders.length}\n`;
        msg += `💰 Ingresos: ${fmtSoles(totalRevenue)}\n`;
        msg += `🎫 Ticket prom: ${fmtSoles(avgTicket)}\n`;
        msg += `✅ Completados: ${completados} | ⏳ Pendientes: ${pendientes}\n`;
        if (prepTimes.length > 0) {
          msg += `🍳 Tiempo prom cocina: ${avgPrepTime.toFixed(1)} min (${prepTimes.length} muestras)\n`;
        }
        msg += `\n💳 *Pagos:*\n`;
        for (const [mp, d] of Object.entries(metodos)) {
          msg += `  • ${mp}: ${fmtSoles(d.total)} (${d.count} pedidos)\n`;
        }

        return {
          success: true,
          data: { totalOrders: orders.length, totalRevenue, avgTicket, completados, pendientes, porEstado, metodos, avgPrepTime },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en stats del día: ${e.message}` };
      }
    },
  },

  // ── 8. Stats semanales ───────────────────────────────────
  {
    name: "ordenes_stats_semana",
    description: "Muestra estadísticas de la última semana con breakdown diario: pedidos, ingresos y tendencia por día. Responde 'cómo fue la semana', 'resumen semanal', 'ventas esta semana'.",
    parameters: {
      dias: { type: "string", description: "Cantidad de días hacia atrás. Default: '7'" },
    },
    async execute(args, branchId) {
      try {
        const dias = parseInt(String(args.dias || "7"));
        const hoy = new Date();
        const desde = new Date(hoy);
        desde.setDate(desde.getDate() - dias + 1);
        desde.setHours(0, 0, 0, 0);
        const desdeISO = desde.toISOString();

        const snap = await get(child(ref(db), `branches/${branchId}/orders`));
        if (!snap.exists()) return { success: true, message: "📭 No hay pedidos en el período." };

        const orders = (Object.values(snap.val()) as any[])
          .filter((o: any) => (o.createdAt || "") >= desdeISO);

        // Build daily breakdown
        const dailyBreakdown: Record<string, { revenue: number; orders: number; avgTicket: number }> = {};
        for (let i = 0; i < dias; i++) {
          const d = new Date(hoy);
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const key = d.toISOString().split("T")[0];
          dailyBreakdown[key] = { revenue: 0, orders: 0, avgTicket: 0 };
        }

        for (const o of orders) {
          const d = (o.createdAt || "").split("T")[0];
          if (dailyBreakdown[d]) {
            dailyBreakdown[d].orders++;
            if (o.status !== "cancelado") {
              dailyBreakdown[d].revenue += Number(o.total || 0);
            }
          }
        }

        // Calculate avg ticket per day
        for (const day of Object.values(dailyBreakdown)) {
          day.avgTicket = day.orders > 0 ? day.revenue / day.orders : 0;
        }

        const sortedDays = Object.entries(dailyBreakdown).sort(([a], [b]) => a.localeCompare(b));

        const totalOrders = sortedDays.reduce((s, [, d]) => s + d.orders, 0);
        const totalRevenue = sortedDays.reduce((s, [, d]) => s + d.revenue, 0);
        const totalDays = sortedDays.filter(([, d]) => d.orders > 0).length;
        const dailyAvg = totalDays > 0 ? totalRevenue / totalDays : 0;

        // Find best and worst days
        const bestDay = sortedDays
          .filter(([, d]) => d.revenue > 0)
          .reduce((best, curr) => curr[1].revenue > best[1].revenue ? curr : best, sortedDays[0]);
        const worstDay = sortedDays
          .filter(([, d]) => d.orders > 0)
          .reduce((worst, curr) => curr[1].revenue < worst[1].revenue ? curr : worst, sortedDays[sortedDays.length - 1]);

        let msg = `📊 *ESTADÍSTICAS SEMANALES*\n`;
        msg += `📆 ${sortedDays[0][0]} → ${sortedDays[sortedDays.length - 1][0]}\n\n`;

        // Compact daily view
        for (const [date, d] of sortedDays) {
          const dayName = new Date(date + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short" });
          const bar = d.orders > 0 ? "█".repeat(Math.max(1, Math.round((d.revenue / Math.max(bestDay[1].revenue, 1)) * 15))) : "·";
          msg += `${dayName} ${bar} ${d.orders} ped | ${fmtSoles(d.revenue)}\n`;
        }

        msg += `\n📌 *Resumen:*\n`;
        msg += `  Pedidos: ${totalOrders} | Ingresos: ${fmtSoles(totalRevenue)}\n`;
        msg += `  Promedio diario: ${fmtSoles(dailyAvg)} | Días con ventas: ${totalDays}/${dias}\n`;
        if (bestDay[1].revenue > 0) msg += `  🏆 Mejor día: ${new Date(bestDay[0] + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long" })} — ${fmtSoles(bestDay[1].revenue)}\n`;

        return {
          success: true,
          data: { dias, totalOrders, totalRevenue, dailyAvg, dailyBreakdown: sortedDays.map(([date, d]) => ({ date, ...d })), bestDay: bestDay[0], worstDay: worstDay[0] },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en stats semanales: ${e.message}` };
      }
    },
  },
];
