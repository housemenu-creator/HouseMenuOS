/**
 * Predictive AI MCP Tools — demand forecasting, anomaly detection, churn prediction.
 *
 * Uses historical data + simple statistics (moving averages, day-of-week patterns)
 * to predict demand, detect anomalies, and identify customers at risk.
 *
 * All tools live in Firebase with no external ML dependencies — the math is
 * straightforward but effective for restaurant data.
 */

import { initFirebase, ref, get, child } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

// ── Helpers ─────────────────────────────────────────────

function fmtSoles(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

function inRange(dateStr: string, desde: string, hasta: string): boolean {
  const d = (dateStr || "").split("T")[0];
  return d >= desde && d <= hasta;
}

function getDayName(dateStr: string): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[new Date(dateStr).getDay()];
}

async function fetchAllOrders(branchId: string, daysBack: number): Promise<any[]> {
  const hasta = new Date().toISOString().split("T")[0];
  const desde = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  const snap = await get(child(ref(db), `branches/${branchId}/orders`));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as any[])
    .filter((o: any) => {
      if (o.status === "cancelado") return false;
      return inRange(o.createdAt || "", desde, hasta);
    });
}

async function fetchAllCustomers(): Promise<any[]> {
  const snap = await get(child(ref(db), "customers"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, c]) => ({ id, ...(c as any) }));
}

async function fetchProducts(branchId: string): Promise<any[]> {
  const snap = await get(child(ref(db), `branches/${branchId}/catalog/products`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, p]) => ({ id, ...(p as any) }));
}

/**
 * Compute day-of-week averages from historical orders.
 * Returns a map: { "lunes": { avgOrders, avgRevenue }, ... }
 */
function computeDayAverages(orders: any[]): Record<string, { avgOrders: number; avgRevenue: number; count: number }> {
  const byDay: Record<string, { orders: number; revenue: number; count: number }> = {};

  // Group orders by day of week
  const ordersByDate = new Map<string, any[]>();
  for (const o of orders) {
    const dateKey = (o.createdAt || "").split("T")[0];
    if (!dateKey) continue;
    if (!ordersByDate.has(dateKey)) ordersByDate.set(dateKey, []);
    ordersByDate.get(dateKey)!.push(o);
  }

  for (const [dateKey, dayOrders] of ordersByDate) {
    const dayName = getDayName(dateKey);
    if (!byDay[dayName]) byDay[dayName] = { orders: 0, revenue: 0, count: 0 };
    byDay[dayName].orders += dayOrders.length;
    byDay[dayName].revenue += dayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    byDay[dayName].count++;
  }

  const result: Record<string, { avgOrders: number; avgRevenue: number; count: number }> = {};
  for (const [day, data] of Object.entries(byDay)) {
    result[day] = {
      avgOrders: data.count > 0 ? Math.round((data.orders / data.count) * 10) / 10 : 0,
      avgRevenue: data.count > 0 ? data.revenue / data.count : 0,
      count: data.count,
    };
  }
  return result;
}

// ── TOOLS ───────────────────────────────────────────────

export const predictTools: MCPTool[] = [
  // ── 1. Demand forecast ─────────────────────────────────
  {
    name: "predict_demanda",
    description: "Predice la demanda para mañana o los próximos días basado en el historial de pedidos. Usa promedios por día de semana + tendencia reciente. Responde 'cuántos pedidos vendremos mañana', 'pronóstico de ventas', 'qué esperar esta semana'.",
    parameters: {
      dias: { type: "string", description: "Cantidad de días a pronosticar. Default: '1' (mañana)" },
    },
    async execute(args, branchId) {
      try {
        const dias = Math.min(7, Math.max(1, parseInt(String(args.dias || "1"))));
        const orders = await fetchAllOrders(branchId, 90); // 90 days of history

        if (orders.length < 7) {
          return { success: true, message: "📭 No hay suficientes datos históricos para hacer un pronóstico (necesito al menos 7 días de pedidos)." };
        }

        const dayAverages = computeDayAverages(orders);

        // Compute recent trend (last 7 days vs 7 days before that)
        const now = new Date();
        const recent7Start = new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0];
        const recent7End = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        const prev7Start = new Date(now.getTime() - 21 * 86400000).toISOString().split("T")[0];
        const prev7End = new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0];

        const recentOrders = orders.filter((o) => inRange(o.createdAt || "", recent7Start, recent7End));
        const prevOrders = orders.filter((o) => inRange(o.createdAt || "", prev7Start, prev7End));

        const recentAvg = recentOrders.length / 7;
        const prevAvg = prevOrders.length / 7;
        const trend = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

        // Generate forecast for next N days
        const forecast: Array<{ date: string; day: string; predictedOrders: number; predictedRevenue: number; confidence: string }> = [];

        for (let i = 1; i <= dias; i++) {
          const futureDate = new Date(now.getTime() + i * 86400000);
          const dateKey = futureDate.toISOString().split("T")[0];
          const dayName = getDayName(dateKey);
          const avg = dayAverages[dayName];

          if (avg) {
            // Base prediction: day-of-week average + trend adjustment
            const baseOrders = avg.avgOrders;
            const trendAdjustment = baseOrders * trend * 0.5; // 50% weight to trend
            const predictedOrders = Math.round((baseOrders + trendAdjustment) * 10) / 10;
            const predictedRevenue = avg.avgRevenue * (predictedOrders / (avg.avgOrders || 1));

            // Confidence based on data volume
            const confidence = avg.count >= 8 ? "alta" : avg.count >= 4 ? "media" : "baja";

            forecast.push({ date: dateKey, day: dayName, predictedOrders, predictedRevenue, confidence });
          }
        }

        let msg = `🔮 *PRONÓSTICO DE DEMANDA*\n\n`;
        msg += `Basado en ${orders.length} pedidos de los últimos 90 días\n`;
        msg += `Tendencia reciente: ${trend > 0 ? "📈" : "📉"} ${(trend * 100).toFixed(1)}%\n\n`;
        msg += `*Pronóstico para los próximos ${dias} día(s):*\n\n`;

        for (const f of forecast) {
          const confEmoji = f.confidence === "alta" ? "🟢" : f.confidence === "media" ? "🟡" : "🟠";
          msg += `${f.day} ${f.date}:\n`;
          msg += `  Pedidos estimados: ~${f.predictedOrders}\n`;
          msg += `  Ingreso estimado: ${fmtSoles(f.predictedRevenue)}\n`;
          msg += `  Confianza: ${confEmoji} ${f.confidence}\n\n`;
        }

        msg += `*Promedios históricos por día:*\n`;
        const dayOrder = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
        for (const day of dayOrder) {
          const avg = dayAverages[day];
          if (avg) {
            msg += `  ${day}: ~${avg.avgOrders} pedidos — ${fmtSoles(avg.avgRevenue)} (${avg.count} semanas)\n`;
          }
        }

        return {
          success: true,
          data: { totalHistory: orders.length, trend, forecast, dayAverages },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en predict_demanda: ${e.message}` };
      }
    },
  },

  // ── 2. Stock suggestions ───────────────────────────────
  {
    name: "predict_stock",
    description: "Sugiere qué productos reordenar basado en el pronóstico de demanda y el stock actual. Ayuda a responder 'qué debo comprar', 'qué productos se van a acabar', 'reposición de inventario'.",
    parameters: {},
    async execute(args, branchId) {
      try {
        const products = await fetchProducts(branchId);
        const tracked = products.filter((p: any) => p.trackStock === true);

        if (tracked.length === 0) {
          return { success: true, message: "📦 Ningún producto tiene control de stock activado. Activá trackStock en los productos para usar esta función." };
        }

        // Get sales data for the last 7 days to estimate daily usage
        const orders = await fetchAllOrders(branchId, 7);
        const productUsage = new Map<string, number>();
        for (const o of orders) {
          for (const item of (o.items || [])) {
            const name = item.name || "";
            productUsage.set(name, (productUsage.get(name) || 0) + (item.quantity || 1));
          }
        }

        // Build a map from product name to product
        const productByName = new Map(tracked.map((p) => [p.name?.toLowerCase(), p]));

        const suggestions: Array<{ name: string; currentStock: number; dailyUsage: number; daysRemaining: number; suggestedOrder: number }> = [];

        for (const [name, usage] of productUsage) {
          const prod = productByName.get(name.toLowerCase());
          if (!prod) continue;

          const stock = Number(prod.stock || 0);
          const dailyUsage = usage / 7; // avg per day
          const daysRemaining = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 999;

          // Suggest order if less than 7 days of stock
          if (daysRemaining < 7) {
            const suggestedOrder = Math.ceil((14 - daysRemaining) * dailyUsage); // order enough for 14 days
            suggestions.push({
              name: prod.name,
              currentStock: stock,
              dailyUsage: Math.round(dailyUsage * 10) / 10,
              daysRemaining,
              suggestedOrder: Math.max(suggestedOrder, 1),
            });
          }
        }

        suggestions.sort((a, b) => a.daysRemaining - b.daysRemaining);

        if (suggestions.length === 0) {
          return { success: true, message: "✅ Todos los productos tienen stock para más de 7 días según la demanda actual." };
        }

        let msg = `📋 *SUGERENCIAS DE COMPRA*\n\n`;
        msg += `Basado en ventas de los últimos 7 días\n\n`;

        for (const s of suggestions) {
          const emoji = s.daysRemaining <= 2 ? "🔴" : s.daysRemaining <= 4 ? "🟡" : "🟠";
          msg += `${emoji} *${s.name}*\n`;
          msg += `  Stock actual: ${s.currentStock} uds\n`;
          msg += `  Consumo diario: ~${s.dailyUsage} uds\n`;
          msg += `  Días restantes: ${s.daysRemaining}\n`;
          msg += `  Sugerido comprar: ${s.suggestedOrder} uds\n\n`;
        }

        return {
          success: true,
          data: { suggestions, generatedAt: new Date().toISOString() },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en predict_stock: ${e.message}` };
      }
    },
  },

  // ── 3. Anomaly detection ───────────────────────────────
  {
    name: "predict_anomalias",
    description: "Detecta anomalías en las ventas del día: si vamos muy por debajo o encima de lo normal, pico de cancelaciones, o patrones inusuales. Responde 'algo raro en ventas hoy', 'detección de anomalías', 'cómo vamos hoy'.",
    parameters: {},
    async execute(args, branchId) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const todayDayName = getDayName(today);

        const orders = await fetchAllOrders(branchId, 60);
        if (orders.length < 7) {
          return { success: true, message: "📭 No hay suficientes datos históricos para detectar anomalías." };
        }

        const dayAverages = computeDayAverages(orders);
        const todayAvg = dayAverages[todayDayName];

        // Today's orders so far
        const todayOrders = orders.filter((o) => (o.createdAt || "").split("T")[0] === today);
        const todayCount = todayOrders.length;
        const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
        const todayCancellations = todayOrders.filter((o) => o.status === "cancelado").length;

        const anomalies: string[] = [];

        if (todayAvg && todayAvg.count >= 3) {
          // Check if today is significantly different
          const expectedCount = todayAvg.avgOrders;
          const ratio = expectedCount > 0 ? todayCount / expectedCount : 1;

          if (ratio < 0.5) {
            anomalies.push(`🔴 *Ventas muy por debajo de lo normal*: hoy llevamos ${todayCount} pedidos vs ~${expectedCount} que es el promedio de los ${todayAvg.count} ${todayDayName} anteriores (${Math.round((1 - ratio) * 100)}% menos)`);
          } else if (ratio > 1.5) {
            anomalies.push(`🟢 *Ventas muy por encima de lo normal*: hoy llevamos ${todayCount} pedidos vs ~${expectedCount} del promedio (${Math.round((ratio - 1) * 100)}% más)`);
          } else {
            anomalies.push(`✅ *Ventas normales*: ${todayCount} pedidos vs ~${expectedCount} del promedio (dentro del rango esperado)`);
          }

          // Check revenue anomaly
          const expectedRevenue = todayAvg.avgRevenue;
          const revRatio = expectedRevenue > 0 ? todayRevenue / expectedRevenue : 1;
          if (revRatio < 0.4 && ratio > 0.7) {
            anomalies.push(`🟡 *Ticket promedio bajo*: los pedidos de hoy tienen montos más bajos de lo habitual. Revenue: ${fmtSoles(todayRevenue)} vs ${fmtSoles(expectedRevenue)} esperado.`);
          }
        } else {
          anomalies.push(`📊 No hay suficiente data de ${todayDayName}s anteriores para comparar (${todayAvg?.count || 0} registros).`);
        }

        // Cancellation anomaly
        if (todayCount > 0) {
          const cancelRate = (todayCancellations / todayCount) * 100;
          if (cancelRate > 20) {
            anomalies.push(`🔴 *Alta tasa de cancelaciones*: ${todayCancellations}/${todayCount} pedidos cancelados (${cancelRate.toFixed(0)}%). Revisar qué está pasando.`);
          } else if (cancelRate > 10) {
            anomalies.push(`🟡 *Cancelaciones elevadas*: ${todayCancellations}/${todayCount} (${cancelRate.toFixed(0)}%). Monitorear.`);
          }
        }

        // Busy hour anomaly (if we have today's hourly data)
        if (todayOrders.length >= 3) {
          const hours = todayOrders.map((o) => o.createdAt ? new Date(o.createdAt).getHours() : 0);
          const currentHour = new Date().getHours();
          const ordersLastHour = hours.filter((h) => h === currentHour).length;
          if (ordersLastHour >= 5) {
            anomalies.push(`⚡ *Hora pico ahora*: ${ordersLastHour} pedidos en la última hora.`);
          }
        }

        let msg = `🔍 *ANOMALÍAS — ${today} (${todayDayName})*\n\n`;
        msg += `Pedidos hoy: ${todayCount}\n`;
        msg += `Ingresos: ${fmtSoles(todayRevenue)}\n`;
        msg += `Cancelados: ${todayCancellations}\n\n`;

        msg += `*Análisis:*\n`;
        for (const a of anomalies) {
          msg += `${a}\n\n`;
        }

        if (anomalies.length === 0) {
          msg += "✅ Todo dentro de los parámetros normales.";
        }

        return {
          success: true,
          data: { fecha: today, todayCount, todayRevenue, todayCancellations, anomalies },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en predict_anomalias: ${e.message}` };
      }
    },
  },

  // ── 4. Customer churn prediction ───────────────────────
  {
    name: "predict_clientes_riesgo",
    description: "Identifica clientes que podrían estar por irse (churn): no pidieron en los últimos 30 días pero solían pedir regularmente. Sugiere acciones de retención. Responde 'clientes que no vuelven', 'quién dejó de pedir', 'retención de clientes'.",
    parameters: {
      dias_sin_pedido: { type: "string", description: "Días sin pedido para considerar en riesgo. Default: '30'" },
      limite: { type: "string", description: "Cantidad máxima de clientes a mostrar. Default: '10'" },
    },
    async execute(args, branchId) {
      try {
        const diasSinPedido = parseInt(String(args.dias_sin_pedido || "30"));
        const limite = parseInt(String(args.limite || "10"));
        const cutoffDate = new Date(Date.now() - diasSinPedido * 86400000);

        const customers = await fetchAllCustomers();

        if (customers.length === 0) {
          return { success: true, message: "📭 No hay clientes registrados." };
        }

        // Filter customers who:
        // 1. Have ordered before (orderCount > 0)
        // 2. Last order was more than `diasSinPedido` days ago
        // 3. Haven't churned permanently (orderCount >= 2 — they were regulars)
        const atRisk = customers
          .filter((c) => {
            if (!c.orderCount || c.orderCount < 2) return false; // not a regular
            if (!c.lastOrderAt) return false;
            const lastOrder = new Date(c.lastOrderAt);
            return lastOrder < cutoffDate;
          })
          .map((c) => {
            const lastOrder = new Date(c.lastOrderAt);
            const daysSince = Math.floor((Date.now() - lastOrder.getTime()) / 86400000);
            const frequency = c.orderCount / Math.max(1, daysSince + 30); // rough frequency
            const avgOrderValue = c.totalSpent / c.orderCount;
            // Risk score: higher = more at risk (regular + high value + long silence)
            const riskScore = (daysSince / diasSinPedido) * (frequency * 10) * (avgOrderValue / 50);
            return {
              id: c.id,
              name: c.name || "Sin nombre",
              phone: c.phone || "",
              orderCount: c.orderCount,
              totalSpent: c.totalSpent || 0,
              daysSince,
              frequency: Math.round(frequency * 100) / 100,
              avgOrderValue,
              riskScore,
            };
          })
          .filter((c) => c.daysSince >= diasSinPedido)
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, limite);

        if (atRisk.length === 0) {
          return { success: true, message: `✅ No hay clientes regulares que hayan dejado de pedir por más de ${diasSinPedido} días.` };
        }

        let msg = `⚠️ *CLIENTES EN RIESGO DE CHURN*\n\n`;
        msg += `Clientes que no piden hace ${diasSinPedido}+ días:\n\n`;

        for (const c of atRisk) {
          const emoji = c.daysSince > 60 ? "🔴" : c.daysSince > 45 ? "🟡" : "🟠";
          msg += `${emoji} *${c.name}* — ${c.phone || "sin teléfono"}\n`;
          msg += `  🛵 ${c.orderCount} pedidos — ${fmtSoles(c.totalSpent)} gastados\n`;
          msg += `  📅 Último pedido: hace ${c.daysSince} días\n`;
          if (c.phone) {
            msg += `  💡 Acción: enviarle un WhatsApp con un descuento especial\n`;
          }
          msg += "\n";
        }

        msg += `\n*Recomendaciones:*\n`;
        msg += `• Ofrecé descuentos personalizados a los clientes de mayor valor\n`;
        msg += `• Enviá promociones por WhatsApp recordándoles el restaurante\n`;
        msg += `• Preguntales si quieren repetir sus platos favoritos`;

        return {
          success: true,
          data: { totalAtRisk: atRisk.length, threshold: diasSinPedido, customers: atRisk },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en predict_clientes_riesgo: ${e.message}` };
      }
    },
  },
];
