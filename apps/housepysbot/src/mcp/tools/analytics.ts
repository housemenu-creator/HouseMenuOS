/**
 * Analytics MCP Tools — Business intelligence queries for the AI admin agent.
 *
 * Each tool reads directly from Firebase and returns structured data + formatted message.
 * The LLM uses these to answer natural language business questions.
 *
 * Data sources:
 *   - branches/{branchId}/orders/       → orders
 *   - customers/                         → customer profiles
 *   - branches/{branchId}/employees/     → staff data
 *   - branches/{branchId}/attendance/    → attendance records
 *   - branches/{branchId}/catalog/products/ → menu & stock
 *   - branches/{branchId}/logistics/     → ingredients & recipes
 */

import { initFirebase, ref, get, child } from "../../lib/firebase.js";
import { getCached } from "../../lib/analyticsCache.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

// ── Helpers ─────────────────────────────────────────────

function parseDate(dateStr: string): string {
  if (!dateStr || dateStr === "today") return new Date().toISOString().split("T")[0];
  if (dateStr === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  if (dateStr === "this-week") {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split("T")[0];
  }
  if (dateStr === "this-month") {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return dateStr;
}

function dateRange(daysBack: number): { desde: string; hasta: string } {
  const hasta = new Date().toISOString().split("T")[0];
  const desde = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  return { desde, hasta };
}

function inRange(dateStr: string, desde: string, hasta: string): boolean {
  const d = (dateStr || "").split("T")[0];
  return d >= desde && d <= hasta;
}

function fmtSoles(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

// ── Data fetchers ───────────────────────────────────────

async function fetchOrders(branchId: string, desde: string, hasta: string): Promise<any[]> {
  const cacheKey = `orders:${desde}:${hasta}`;
  return getCached<any[]>(branchId, cacheKey, async () => {
    const snap = await get(child(ref(db), `branches/${branchId}/orders`));
    if (!snap.exists()) return [];
    const orders = Object.values(snap.val()) as any[];
    return orders.filter((o: any) => {
      if (o.status === "cancelado") return false;
      return inRange(o.createdAt || "", desde, hasta);
    });
  }, { ttlMs: 60_000 });
}

async function fetchAllCustomers(): Promise<any[]> {
  return getCached<any[]>("_global", "customers", async () => {
    const snap = await get(child(ref(db), "customers"));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, c]) => ({ id, ...(c as any) }));
  }, { ttlMs: 120_000 });
}

async function fetchEmployees(branchId: string): Promise<any[]> {
  return getCached<any[]>(branchId, "employees", async () => {
    const snap = await get(child(ref(db), `branches/${branchId}/employees`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, e]) => ({ id, ...(e as any) }));
  }, { ttlMs: 120_000 });
}

async function fetchProducts(branchId: string): Promise<any[]> {
  return getCached<any[]>(branchId, "products", async () => {
    const snap = await get(child(ref(db), `branches/${branchId}/catalog/products`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, p]) => ({ id, ...(p as any) }));
  }, { ttlMs: 120_000 });
}

// ── Aggregation helpers ─────────────────────────────────

function aggregateProducts(orders: any[]): any[] {
  const map = new Map<string, { name: string; qty: number; revenue: number; count: number }>();
  for (const o of orders) {
    for (const item of o.items || []) {
      const key = item.productId || item.name;
      const existing = map.get(key) || { name: item.name || "?", qty: 0, revenue: 0, count: 0 };
      existing.qty += item.quantity || 1;
      existing.revenue += (item.price || 0) * (item.quantity || 1);
      existing.count++;
      map.set(key, existing);
    }
  }
  return Array.from(map.values());
}

function aggregatePaymentMethods(orders: any[]): Record<string, { count: number; total: number }> {
  const methods: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    const mp = o.metodo_pago || "efectivo";
    if (!methods[mp]) methods[mp] = { count: 0, total: 0 };
    methods[mp].count++;
    methods[mp].total += Number(o.total || 0);
  }
  return methods;
}

function topProducts(products: any[], limit: number): any[] {
  return products.sort((a, b) => b.qty - a.qty).slice(0, limit);
}

function bottomProducts(products: any[], limit: number): any[] {
  return products.sort((a, b) => a.qty - b.qty).slice(0, limit);
}

// ── TOOLS ───────────────────────────────────────────────

export const analyticsTools: MCPTool[] = [
  // ── 1. Resumen general ──────────────────────────────────
  {
    name: "analytics_resumen",
    description: "Resumen general de ventas para un período: ingresos totales, cantidad de pedidos, ticket promedio, métodos de pago, top productos. Ideal para 'cuánto vendimos ayer/esta semana/este mes'.",
    parameters: {
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD (o: 'today', 'yesterday', 'this-week', 'this-month'). Default: today" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const desde = parseDate(String(args.desde || "today"));
        const hasta = parseDate(String(args.hasta || "today"));
        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas entre ${desde} y ${hasta}.` };
        }

        const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
        const avgTicket = totalRevenue / orders.length;
        const methods = aggregatePaymentMethods(orders);
        const prods = aggregateProducts(orders);
        const top = topProducts(prods, 5);
        const statusCounts: Record<string, number> = {};
        for (const o of orders) {
          const st = o.status || "desconocido";
          statusCounts[st] = (statusCounts[st] || 0) + 1;
        }

        let msg = `📊 *RESUMEN ${desde} → ${hasta}*\n\n`;
        msg += `🛵 Pedidos: ${orders.length}\n`;
        msg += `💰 Total: ${fmtSoles(totalRevenue)}\n`;
        msg += `🎫 Ticket promedio: ${fmtSoles(avgTicket)}\n\n`;

        msg += `💳 *Por método de pago:*\n`;
        for (const [mp, d] of Object.entries(methods)) {
          msg += `  • ${mp}: ${fmtSoles(d.total)} (${d.count} pedidos)\n`;
        }

        msg += `\n🏆 *Top 5 productos:*\n`;
        for (const p of top) {
          msg += `  • ${p.name}: ${p.qty} uds — ${fmtSoles(p.revenue)}\n`;
        }

        msg += `\n📌 *Por estado:*\n`;
        for (const [st, count] of Object.entries(statusCounts)) {
          msg += `  • ${st}: ${count}\n`;
        }

        return {
          success: true,
          data: { desde, hasta, orders: orders.length, totalRevenue, avgTicket, methods, topProducts: top, statusCounts },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_resumen: ${e.message}` };
      }
    },
  },

  // ── 2. Tendencia (comparativa) ──────────────────────────
  {
    name: "analytics_tendencia",
    description: "Compara ventas entre el período actual y el anterior. Responde 'cómo vamos hoy vs ayer', 'esta semana vs la anterior', 'este mes vs el mes pasado'.",
    parameters: {
      periodo: { type: "string", description: "Período a comparar: 'dia' (hoy vs ayer), 'semana' (esta semana vs semana anterior), 'mes' (este mes vs mes anterior). Default: 'dia'" },
    },
    async execute(args, branchId) {
      try {
        const periodo = String(args.periodo || "dia");
        const now = new Date();
        const today = now.toISOString().split("T")[0];

        let currentStart: string, currentEnd: string, prevStart: string, prevEnd: string;

        if (periodo === "dia") {
          currentStart = today; currentEnd = today;
          const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
          prevStart = yesterday.toISOString().split("T")[0];
          prevEnd = prevStart;
        } else if (periodo === "semana") {
          const dow = now.getDay();
          currentStart = new Date(now.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000).toISOString().split("T")[0];
          currentEnd = today;
          const prevWeekStart = new Date(new Date(currentStart).getTime() - 7 * 86400000).toISOString().split("T")[0];
          prevStart = prevWeekStart;
          prevEnd = new Date(new Date(currentStart).getTime() - 86400000).toISOString().split("T")[0];
        } else { // mes
          currentStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          currentEnd = today;
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          prevStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
          prevEnd = prevMonthEnd.toISOString().split("T")[0];
        }

        const currentOrders = await fetchOrders(branchId, currentStart, currentEnd);
        const prevOrders = await fetchOrders(branchId, prevStart, prevEnd);

        const currRevenue = currentOrders.reduce((s, o) => s + Number(o.total || 0), 0);
        const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total || 0), 0);
        const currCount = currentOrders.length;
        const prevCount = prevOrders.length;
        const currAvg = currCount > 0 ? currRevenue / currCount : 0;
        const prevAvg = prevCount > 0 ? prevRevenue / prevCount : 0;

        const revenueChange = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        const ordersChange = prevCount > 0 ? ((currCount - prevCount) / prevCount) * 100 : 0;
        const avgChange = prevAvg > 0 ? ((currAvg - prevAvg) / prevAvg) * 100 : 0;

        const periodLabel = periodo === "dia" ? "hoy" : periodo === "semana" ? "esta semana" : "este mes";
        const prevLabel = periodo === "dia" ? "ayer" : periodo === "semana" ? "semana anterior" : "mes anterior";

        function arrow(v: number): string { return v > 0 ? "📈" : v < 0 ? "📉" : "➡️"; }

        let msg = `📊 *TENDENCIA: ${periodo === "dia" ? "Hoy vs Ayer" : periodo === "semana" ? "Esta semana vs Anterior" : "Este mes vs Anterior"}*\n\n`;
        msg += `*Ingresos:* ${fmtSoles(currRevenue)} ${arrow(revenueChange)} ${fmtSoles(prevRevenue)} (${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%)\n`;
        msg += `*Pedidos:* ${currCount} ${arrow(ordersChange)} ${prevCount} (${ordersChange >= 0 ? "+" : ""}${ordersChange.toFixed(1)}%)\n`;
        msg += `*Ticket prom:* ${fmtSoles(currAvg)} ${arrow(avgChange)} ${fmtSoles(prevAvg)} (${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)}%)\n`;

        return {
          success: true,
          data: {
            periodo,
            current: { desde: currentStart, hasta: currentEnd, revenue: currRevenue, orders: currCount, avgTicket: currAvg },
            previous: { desde: prevStart, hasta: prevEnd, revenue: prevRevenue, orders: prevCount, avgTicket: prevAvg },
            changes: { revenue: revenueChange, orders: ordersChange, avgTicket: avgChange },
          },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_tendencia: ${e.message}` };
      }
    },
  },

  // ── 3. Productos ────────────────────────────────────────
  {
    name: "analytics_productos",
    description: "Analiza productos: más vendidos, menos vendidos, por categoría. Responde 'qué producto se vende más', 'cuáles son los menos pedidos', 'ventas por categoría'.",
    parameters: {
      tipo: { type: "string", description: "Tipo de análisis: 'top' (más vendidos), 'bottom' (menos vendidos), 'categoria' (por categoría). Default: 'top'" },
      limite: { type: "string", description: "Cantidad máxima de resultados. Default: '10'" },
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: 30 días atrás" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
      categoria: { type: "string", description: "Filtrar por categoría (opcional). Ej: 'Bebidas', 'Platos de Fondo'" },
    },
    async execute(args, branchId) {
      try {
        const r = dateRange(30);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));
        const tipo = String(args.tipo || "top");
        const limite = parseInt(String(args.limite || "10"));
        const categoriaFiltro = String(args.categoria || "").toLowerCase().trim();

        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas entre ${desde} y ${hasta}.` };
        }

        let prods = aggregateProducts(orders);

        // Filter by category if specified
        if (categoriaFiltro) {
          const productMap = new Map<string, any>();
          const allProds = await fetchProducts(branchId);
          for (const p of allProds) {
            productMap.set(p.name?.toLowerCase(), p);
          }
          prods = prods.filter((p) => {
            const prod = productMap.get(p.name.toLowerCase());
            return prod?.category?.toLowerCase().includes(categoriaFiltro);
          });
        }

        if (prods.length === 0) {
          return { success: true, message: "No se encontraron productos para ese filtro." };
        }

        let results: any[];
        let title: string;

        if (tipo === "bottom") {
          results = bottomProducts(prods, limite);
          title = `🐢 *Productos MENOS vendidos* (${desde} → ${hasta})`;
        } else if (tipo === "categoria") {
          // Group by category
          const productMap = new Map<string, any>();
          const allProds = await fetchProducts(branchId);
          for (const p of allProds) {
            productMap.set(p.name?.toLowerCase(), p);
          }
          const byCat: Record<string, { qty: number; revenue: number; count: number }> = {};
          for (const p of prods) {
            const prod = productMap.get(p.name.toLowerCase());
            const cat = prod?.category || "Sin categoría";
            if (!byCat[cat]) byCat[cat] = { qty: 0, revenue: 0, count: 0 };
            byCat[cat].qty += p.qty;
            byCat[cat].revenue += p.revenue;
            byCat[cat].count += p.count;
          }
          results = Object.entries(byCat)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limite);
          title = `📂 *Ventas por Categoría* (${desde} → ${hasta})`;
        } else {
          results = topProducts(prods, limite);
          title = `🏆 *Productos MÁS vendidos* (${desde} → ${hasta})`;
        }

        let msg = `${title}\n\n`;
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const rank = tipo === "bottom" ? results.length - i : i + 1;
          msg += `${rank}. ${r.name} — ${r.qty} uds — ${fmtSoles(r.revenue)}\n`;
        }

        return {
          success: true,
          data: { tipo, desde, hasta, results },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_productos: ${e.message}` };
      }
    },
  },

  // ── 4. Ventas por hora ─────────────────────────────────
  {
    name: "analytics_por_hora",
    description: "Muestra la distribución de ventas agrupadas por hora del día. Responde 'a qué hora se vende más', 'cuál es la hora pico', 'ventas por hora'.",
    parameters: {
      fecha: { type: "string", description: "Fecha YYYY-MM-DD (opcional, default today)" },
    },
    async execute(args, branchId) {
      try {
        const fecha = parseDate(String(args.fecha || "today"));
        const orders = await fetchOrders(branchId, fecha, fecha);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas el ${fecha}.` };
        }

        const hours: Record<string, { count: number; revenue: number }> = {};
        for (const o of orders) {
          const h = o.createdAt ? new Date(o.createdAt).getHours() : 0;
          const key = `${String(h).padStart(2, "0")}:00`;
          if (!hours[key]) hours[key] = { count: 0, revenue: 0 };
          hours[key].count++;
          hours[key].revenue += Number(o.total || 0);
        }

        const sorted = Object.entries(hours).sort(([a], [b]) => a.localeCompare(b));
        const peak = sorted.reduce((max, curr) => curr[1].count > max[1].count ? curr : max, sorted[0]);

        let msg = `🕐 *VENTAS POR HORA — ${fecha}*\n\n`;
        for (const [h, d] of sorted) {
          const bar = "█".repeat(Math.round((d.count / peak[1].count) * 15));
          msg += `${h} ${bar} ${d.count} pedidos — ${fmtSoles(d.revenue)}\n`;
        }
        msg += `\n⏰ *Hora pico:* ${peak[0]} (${peak[1].count} pedidos, ${fmtSoles(peak[1].revenue)})`;

        return {
          success: true,
          data: { fecha, hours: sorted.map(([h, d]) => ({ hour: h, ...d })), peakHour: peak[0] },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_por_hora: ${e.message}` };
      }
    },
  },

  // ── 5. Clientes ────────────────────────────────────────
  {
    name: "analytics_clientes",
    description: "Analiza clientes: los más frecuentes, los que más gastan, nuevos clientes, historial de un cliente específico. Responde 'quién es el cliente que más pide', 'clientes nuevos esta semana', 'historial del cliente X'.",
    parameters: {
      tipo: { type: "string", description: "Tipo: 'frecuentes' (más pedidos), 'top_spenders' (más gasto), 'nuevos' (por fecha), 'historial' (de un cliente específico). Default: 'top_spenders'" },
      limite: { type: "string", description: "Cantidad máxima. Default: '10'" },
      cliente_id: { type: "string", description: "ID del cliente para 'historial' (opcional si usás cliente_telefono)" },
      cliente_telefono: { type: "string", description: "Teléfono del cliente para 'historial' (opcional)" },
      desde: { type: "string", description: "Fecha inicio para 'nuevos'. Default: 30 días atrás" },
      hasta: { type: "string", description: "Fecha fin. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const tipo = String(args.tipo || "top_spenders");
        const limite = parseInt(String(args.limite || "10"));
        const r = dateRange(30);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));

        const customers = await fetchAllCustomers();
        if (customers.length === 0) {
          return { success: true, message: "📭 No hay clientes registrados." };
        }

        if (tipo === "historial") {
          // Find customer by ID or phone
          let customer = customers.find((c) => c.id === args.cliente_id);
          if (!customer && args.cliente_telefono) {
            customer = customers.find((c) => c.phone === String(args.cliente_telefono));
          }
          if (!customer) {
            // Try to search by phone substring (common in WhatsApp)
            const phoneSearch = String(args.cliente_telefono || "").replace(/[^0-9]/g, "");
            customer = customers.find((c) => (c.phone || "").replace(/[^0-9]/g, "").includes(phoneSearch));
          }
          if (!customer) {
            return { success: false, error: `No encontré el cliente. IDs disponibles: ${customers.slice(0, 5).map((c) => `${c.id} (${c.name || "?"})`).join(", ")}...` };
          }

          // Get customer orders from all branches
          const ordersSnap = await get(child(ref(db), `branches/${branchId}/orders`));
          let customerOrders: any[] = [];
          if (ordersSnap.exists()) {
            const allOrders = Object.entries(ordersSnap.val()) as [string, any][];
            customerOrders = allOrders
              .filter(([, o]) => {
                const emailMatch = customer.email && o.customerEmail === customer.email;
                const phoneMatch = customer.phone && o.customerPhone === customer.phone;
                const nameMatch = customer.name && o.cliente?.toLowerCase().includes(customer.name?.toLowerCase());
                return emailMatch || phoneMatch || nameMatch;
              })
              .map(([id, o]) => ({ id, ...o }))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }

          let msg = `👤 *CLIENTE: ${customer.name || "Sin nombre"}*\n\n`;
          msg += `📞 Tel: ${customer.phone || "—"}\n`;
          msg += `📧 Email: ${customer.email || "—"}\n`;
          msg += `🛵 Pedidos totales: ${customer.orderCount || 0}\n`;
          msg += `💰 Gasto total: ${fmtSoles(customer.totalSpent || 0)}\n`;
          msg += `⭐ Puntos: ${customer.points || 0}\n`;
          msg += `📅 Último pedido: ${customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("es-PE") : "—"}\n`;

          if (customerOrders.length > 0) {
            msg += `\n📋 *Últimos pedidos:*\n`;
            for (const o of customerOrders.slice(0, 5)) {
              const items = (o.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
              msg += `  • ${new Date(o.createdAt).toLocaleDateString("es-PE")} — ${fmtSoles(Number(o.total || 0))} — ${items}\n`;
            }
          }

          return {
            success: true,
            data: { customer, orders: customerOrders },
            message: msg,
          };
        }

        if (tipo === "nuevos") {
          const nuevos = customers.filter((c) => {
            return inRange(c.createdAt || "", desde, hasta);
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          let msg = `🆕 *CLIENTES NUEVOS* (${desde} → ${hasta})\n\n`;
          if (nuevos.length === 0) {
            msg += "No hay clientes nuevos en este período.";
          } else {
            msg += `Total: ${nuevos.length} nuevos clientes\n\n`;
            for (const c of nuevos.slice(0, limite)) {
              msg += `  • ${c.name || "Sin nombre"} — ${new Date(c.createdAt).toLocaleDateString("es-PE")}${c.phone ? ` (${c.phone})` : ""}\n`;
            }
            if (nuevos.length > limite) msg += `\n... y ${nuevos.length - limite} más`;
          }

          return {
            success: true,
            data: { tipo, desde, hasta, clientes: nuevos.slice(0, limite), total: nuevos.length },
            message: msg,
          };
        }

        // frecuentes or top_spenders
        let sorted = [...customers];
        if (tipo === "frecuentes") {
          sorted.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
        } else {
          sorted.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        }

        const top = sorted.slice(0, limite);
        const title = tipo === "frecuentes" ? "🔄 *CLIENTES MÁS FRECUENTES*" : "💰 *CLIENTES QUE MÁS GASTAN*";

        let msg = `${title}\n\n`;
        for (let i = 0; i < top.length; i++) {
          const c = top[i];
          msg += `${i + 1}. ${c.name || "Sin nombre"} — ${c.orderCount || 0} pedidos — ${fmtSoles(c.totalSpent || 0)}${c.phone ? ` (${c.phone})` : ""}\n`;
        }

        return {
          success: true,
          data: { tipo, limite, clientes: top },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_clientes: ${e.message}` };
      }
    },
  },

  // ── 6. Staff ────────────────────────────────────────────
  {
    name: "analytics_staff",
    description: "Analiza el personal: productividad (pedidos procesados por empleado), asistencia (quién fichó hoy), vista general del equipo. Responde 'quién atendió más pedidos', 'quién no fichó hoy', 'productividad del staff'.",
    parameters: {
      tipo: { type: "string", description: "Tipo: 'productividad' (pedidos por empleado), 'asistencia' (quién fichó hoy). Default: 'productividad'" },
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD para productividad. Default: 7 días atrás" },
      hasta: { type: "string", description: "Fecha fin. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const tipo = String(args.tipo || "productividad");

        if (tipo === "asistencia") {
          const today = new Date().toISOString().split("T")[0];
          const snap = await get(child(ref(db), `branches/${branchId}/attendance`));
          if (!snap.exists()) {
            return { success: true, message: "📭 No hay registros de asistencia aún." };
          }

          const attendance = snap.val() as Record<string, any>;
          const todayAttendance: string[] = [];
          const noClockIn: string[] = [];

          const employees = await fetchEmployees(branchId);
          const empMap = new Map(employees.map((e) => [e.id, e.name || e.id]));

          for (const [empId, records] of Object.entries(attendance)) {
            const todayRecord = records[today];
            const empName = empMap.get(empId) || empId;
            if (todayRecord) {
              const clockIn = todayRecord.clockIn || "?";
              todayAttendance.push(`  ✅ ${empName} — fichó ${clockIn}`);
            } else {
              noClockIn.push(`  ❌ ${empName} — no fichó`);
            }
          }

          // Also check for employees not in attendance at all
          for (const emp of employees) {
            if (!attendance[emp.id] || !attendance[emp.id][today]) {
              if (!noClockIn.some((s) => s.includes(emp.name || emp.id))) {
                noClockIn.push(`  ❌ ${emp.name || emp.id} — no fichó`);
              }
            }
          }

          let msg = `📋 *ASISTENCIA — ${new Date(today).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}*\n\n`;
          if (todayAttendance.length > 0) {
            msg += `*✅ Presentes:*\n${todayAttendance.join("\n")}\n\n`;
          }
          if (noClockIn.length > 0) {
            msg += `*❌ Sin fichar:*\n${noClockIn.join("\n")}`;
          }
          if (todayAttendance.length === 0 && noClockIn.length === 0) {
            msg += "No hay empleados registrados.";
          }

          return {
            success: true,
            data: { fecha: today, presentes: todayAttendance.length, pendientes: noClockIn.length },
            message: msg,
          };
        }

        // Productividad
        const r = dateRange(7);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));
        const orders = await fetchOrders(branchId, desde, hasta);
        const employees = await fetchEmployees(branchId);

        const staffMap = new Map<string, { name: string; orders: number; revenue: number; tableOrders: number; deliveryOrders: number }>();
        for (const emp of employees) {
          const name = emp.name || emp.id;
          staffMap.set(name, { name, orders: 0, revenue: 0, tableOrders: 0, deliveryOrders: 0 });
          staffMap.set(emp.id || "", { name, orders: 0, revenue: 0, tableOrders: 0, deliveryOrders: 0 });
        }

        for (const o of orders) {
          const createdBy = o.createdBy || o.atendido_por || "";
          if (!createdBy) continue;
          const entry = staffMap.get(createdBy);
          if (entry) {
            entry.orders++;
            entry.revenue += Number(o.total || 0);
            if (o.tipo === "delivery" || o.driverId) entry.deliveryOrders++;
            else entry.tableOrders++;
          }
        }

        const sorted = Array.from(staffMap.values())
          .filter((s) => s.orders > 0)
          .sort((a, b) => b.orders - a.orders);

        let msg = `👥 *PRODUCTIVIDAD DEL STAFF* (${desde} → ${hasta})\n\n`;
        if (sorted.length === 0) {
          msg += "No hay datos de productividad para este período.";
        } else {
          for (const s of sorted) {
            msg += `• ${s.name}: ${s.orders} pedidos — ${fmtSoles(s.revenue)} (${s.tableOrders} mesa / ${s.deliveryOrders} delivery)\n`;
          }
        }

        return {
          success: true,
          data: { desde, hasta, staff: sorted },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_staff: ${e.message}` };
      }
    },
  },

  // ── 7. Cocina ───────────────────────────────────────────
  {
    name: "analytics_cocina",
    description: "Muestra el rendimiento de cocina: tiempo promedio de preparación, pedidos por hora, eficiencia. Responde 'cuánto se demora la cocina en promedio', 'tiempos de cocina hoy', 'rendimiento de cocina'.",
    parameters: {
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: today" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const desde = parseDate(String(args.desde || "today"));
        const hasta = parseDate(String(args.hasta || "today"));
        const orders = await fetchOrders(branchId, desde, hasta);

        if (orders.length === 0) {
          return { success: true, message: `📭 No hay pedidos entre ${desde} y ${hasta}.` };
        }

        const times: number[] = [];
        let conTimestamps = 0;
        let sinTimestamps = 0;

        for (const o of orders) {
          const ts = o.statusTimestamps;
          if (ts?.recibido && ts?.listo) {
            const start = new Date(ts.recibido).getTime();
            const end = new Date(ts.listo).getTime();
            if (end > start) {
              times.push((end - start) / 60000); // minutes
              conTimestamps++;
            } else {
              sinTimestamps++;
            }
          } else {
            sinTimestamps++;
          }
        }

        const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const min = times.length > 0 ? Math.min(...times) : 0;
        const max = times.length > 0 ? Math.max(...times) : 0;

        // Count by status
        const pendientes = orders.filter((o) => o.status === "recibido" || o.status === "preparando").length;
        const completados = orders.filter((o) => o.status === "listo" || o.status === "entregado").length;

        let msg = `🍳 *RENDIMIENTO DE COCINA* (${desde} → ${hasta})\n\n`;
        msg += `📊 Total pedidos: ${orders.length}\n`;
        msg += `⏳ Pendientes: ${pendientes}\n`;
        msg += `✅ Completados: ${completados}\n\n`;

        if (times.length > 0) {
          msg += `*Tiempos de preparación:*\n`;
          msg += `  Promedio: ${avg.toFixed(1)} min\n`;
          msg += `  Mínimo: ${min.toFixed(1)} min\n`;
          msg += `  Máximo: ${max.toFixed(1)} min\n`;
          msg += `  Muestras: ${times.length} pedidos\n`;
        } else {
          msg += "⏱ No hay datos de tiempos de preparación (faltan statusTimestamps).\n";
        }

        msg += `\n📌 Pedidos sin data de tiempo: ${sinTimestamps}`;

        return {
          success: true,
          data: { desde, hasta, totalOrders: orders.length, pendientes, completados, avgTime: avg, minTime: min, maxTime: max, samples: times.length, sinTimestamps },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_cocina: ${e.message}` };
      }
    },
  },

  // ── 8. Stock ────────────────────────────────────────────
  {
    name: "analytics_stock",
    description: "Estado del inventario: productos con stock bajo, valor total del inventario, alertas. Responde 'qué productos tienen stock bajo', 'cómo está el inventario', 'alertas de stock'.",
    parameters: {
      limite: { type: "string", description: "Umbral para considerar stock bajo. Default: '5'" },
    },
    async execute(args, branchId) {
      try {
        const limite = parseInt(String(args.limite || "5"));
        const products = await fetchProducts(branchId);
        const tracked = products.filter((p: any) => p.trackStock === true);

        if (tracked.length === 0) {
          return { success: true, message: "📦 Ningún producto tiene control de stock activado." };
        }

        const bajos = tracked.filter((p: any) => Number(p.stock || 0) <= limite);
        const agotados = tracked.filter((p: any) => Number(p.stock || 0) <= 0);
        const stockTotal = tracked.reduce((s, p) => s + Number(p.stock || 0), 0);
        const valorTotal = tracked.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.base_price || p.price || 0)), 0);

        let msg = `📦 *INVENTARIO*\n\n`;
        msg += `📊 Productos con stock: ${tracked.length}\n`;
        msg += `📦 Stock total: ${stockTotal} unidades\n`;
        msg += `💰 Valor inventario: ${fmtSoles(valorTotal)}\n\n`;

        if (agotados.length > 0) {
          msg += `🔴 *AGOTADOS (stock 0):*\n`;
          for (const p of agotados) {
            msg += `  • ${p.name}\n`;
          }
          msg += "\n";
        }

        if (bajos.length > 0) {
          msg += `🟡 *STOCK BAJO (≤ ${limite}):*\n`;
          for (const p of bajos) {
            const pct = p.stock > 0 ? "" : " 🔴";
            msg += `  • ${p.name}: ${p.stock} uds${pct}\n`;
          }
        }

        if (bajos.length === 0 && agotados.length === 0) {
          msg += "✅ Todos los productos tienen stock suficiente.";
        }

        return {
          success: true,
          data: { totalTracked: tracked.length, stockTotal, valorTotal, bajos, agotados },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_stock: ${e.message}` };
      }
    },
  },

  // ── 9. Reporte completo ─────────────────────────────────
  {
    name: "analytics_report",
    description: "Genera un reporte completo del negocio para un período: ventas, productos, clientes, cocina, staff, stock. Ideal para 'dame el reporte del día', 'reporte semanal', 'cómo cerró el mes'.",
    parameters: {
      tipo: { type: "string", description: "Tipo de reporte: 'diario' (hoy), 'semanal' (7 días), 'mensual' (30 días). Default: 'diario'" },
      fecha: { type: "string", description: "Fecha específica YYYY-MM-DD para reporte diario. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const tipo = String(args.tipo || "diario");
        let desde: string, hasta: string, label: string;

        if (tipo === "mensual") {
          const r = dateRange(30);
          desde = r.desde; hasta = r.hasta;
          label = "mensual";
        } else if (tipo === "semanal") {
          const r = dateRange(7);
          desde = r.desde; hasta = r.hasta;
          label = "semanal";
        } else {
          const fecha = parseDate(String(args.fecha || "today"));
          desde = fecha; hasta = fecha;
          label = `del ${fecha}`;
        }

        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay datos para el reporte ${label}.` };
        }

        const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
        const avgTicket = totalRevenue / orders.length;
        const methods = aggregatePaymentMethods(orders);
        const prods = aggregateProducts(orders);
        const top = topProducts(prods, 5);

        // Kitchen
        const times: number[] = [];
        for (const o of orders) {
          const ts = o.statusTimestamps;
          if (ts?.recibido && ts?.listo) {
            const diff = new Date(ts.listo).getTime() - new Date(ts.recibido).getTime();
            if (diff > 0) times.push(diff / 60000);
          }
        }
        const kitchenAvg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

        // Staff
        const staffCount = new Set(orders.map((o) => o.createdBy || o.atendido_por || "").filter(Boolean)).size;

        const statusCounts: Record<string, number> = {};
        for (const o of orders) {
          const st = o.status || "desconocido";
          statusCounts[st] = (statusCounts[st] || 0) + 1;
        }

        let msg = `📋 *REPORTE ${label.toUpperCase()}*\n\n`;
        msg += `┌─────────────────────────────────────\n`;
        msg += `│ 📊 *VENTAS*\n`;
        msg += `│ Pedidos: ${orders.length}\n`;
        msg += `│ Ingresos: ${fmtSoles(totalRevenue)}\n`;
        msg += `│ Ticket prom: ${fmtSoles(avgTicket)}\n`;
        msg += `│ Staff activo: ${staffCount} personas\n`;
        msg += `├─────────────────────────────────────\n`;
        msg += `│ 💳 *Métodos de pago*\n`;
        for (const [mp, d] of Object.entries(methods)) {
          const pct = ((d.total / totalRevenue) * 100).toFixed(1);
          msg += `│ ${mp}: ${fmtSoles(d.total)} (${pct}%)\n`;
        }
        msg += `├─────────────────────────────────────\n`;
        msg += `│ 🏆 *Top 5 productos*\n`;
        for (const p of top) {
          const pct = ((p.revenue / totalRevenue) * 100).toFixed(1);
          msg += `│ ${p.name}: ${p.qty} uds — ${fmtSoles(p.revenue)} (${pct}%)\n`;
        }
        msg += `├─────────────────────────────────────\n`;
        msg += `│ 🍳 *Cocina*\n`;
        msg += `│ Tiempo prom: ${kitchenAvg > 0 ? kitchenAvg.toFixed(1) + " min" : "sin datos"}\n`;
        msg += `│ Pendientes: ${statusCounts["recibido"] || 0 + statusCounts["preparando"] || 0}\n`;
        msg += `├─────────────────────────────────────\n`;
        msg += `│ 📌 *Estados*\n`;
        for (const [st, count] of Object.entries(statusCounts)) {
          msg += `│ ${st}: ${count}\n`;
        }
        msg += `└─────────────────────────────────────\n`;

        return {
          success: true,
          data: {
            tipo, desde, hasta,
            orders: orders.length, totalRevenue, avgTicket, staffCount,
            methods, topProducts: top, kitchenAvg, statusCounts,
          },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_report: ${e.message}` };
      }
    },
  },

  // ── 10. Rentabilidad ─────────────────────────────────────
  {
    name: "analytics_rentabilidad",
    description: "Analiza la rentabilidad del negocio: ingresos totales, costos, ganancia neta, margen de ganancia, ROI. Requiere que los productos tengan definido 'costPrice' o 'costo' en Firebase. Responde 'cuál es mi margen de ganancia', 'qué tan rentable es el negocio', 'análisis de rentabilidad'.",
    parameters: {
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: 30 días atrás" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const r = dateRange(30);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));

        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas entre ${desde} y ${hasta}.` };
        }

        const products = await fetchProducts(branchId);
        const costMap = new Map<string, number>();
        for (const p of products) {
          const cost = Number(p.costPrice || p.costo || p.base_price || p.price || 0);
          costMap.set(p.name?.toLowerCase(), cost);
          costMap.set(p.id, cost);
        }

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let orderCount = 0;

        for (const o of orders) {
          const orderTotal = Number(o.total || 0);
          totalRevenue += orderTotal;

          let orderCost = 0;
          for (const item of o.items || []) {
            const searchKey = item.productId || item.name?.toLowerCase() || "";
            const unitCost = costMap.get(searchKey) || 0;
            orderCost += unitCost * (item.quantity || 1);
          }

          totalCost += orderCost;
          totalProfit += orderTotal - orderCost;
          orderCount++;
        }

        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        const avgProfitPerOrder = orderCount > 0 ? totalProfit / orderCount : 0;

        let msg = `💰 *ANÁLISIS DE RENTABILIDAD*\n`;
        msg += `📆 ${desde} → ${hasta}\n\n`;
        msg += `📊 *Resumen:*\n`;
        msg += `  Ingresos: ${fmtSoles(totalRevenue)}\n`;
        msg += `  Costos: ${fmtSoles(totalCost)}\n`;
        msg += `  Ganancia neta: ${fmtSoles(totalProfit)}\n`;
        msg += `  Pedidos: ${orderCount}\n\n`;
        msg += `📈 *Métricas:*\n`;
        msg += `  Margen de ganancia: ${profitMargin.toFixed(1)}%\n`;
        msg += `  ROI: ${roi.toFixed(1)}%\n`;
        msg += `  Ganancia x pedido: ${fmtSoles(avgProfitPerOrder)}\n`;

        if (profitMargin < 10) {
          msg += `\n⚠️ *Margen bajo* — revisar costos o precios de venta.`;
        } else if (profitMargin > 40) {
          msg += `\n✅ *Margen saludable* — buena rentabilidad.`;
        }

        return {
          success: true,
          data: { desde, hasta, totalRevenue, totalCost, totalProfit, profitMargin, roi, avgProfitPerOrder, orderCount },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_rentabilidad: ${e.message}` };
      }
    },
  },

  // ── 11. Desempeño por producto (con márgenes) ────────────
  {
    name: "analytics_desempeno_productos",
    description: "Analiza el desempeño de cada producto: unidades vendidas, ingresos, ganancia, margen por producto, rentabilidad individual. Similar al top productos pero con datos de costo. Responde 'qué producto deja más ganancia', 'cuál es el más rentable', 'desempeño por producto'.",
    parameters: {
      limite: { type: "string", description: "Cantidad de productos a mostrar. Default: '20'" },
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: 30 días atrás" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
      ordenar: { type: "string", description: "Ordenar por: 'ganancia' (más rentable), 'ventas' (más vendido), 'margen' (mejor margen). Default: 'ganancia'" },
    },
    async execute(args, branchId) {
      try {
        const r = dateRange(30);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));
        const limite = parseInt(String(args.limite || "20"));
        const ordenar = String(args.ordenar || "ganancia");

        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas entre ${desde} y ${hasta}.` };
        }

        const products = await fetchProducts(branchId);
        const costMap = new Map<string, { cost: number; category?: string }>();
        for (const p of products) {
          const cost = Number(p.costPrice || p.costo || p.base_price || p.price || 0);
          costMap.set(p.name?.toLowerCase(), { cost, category: p.category });
          costMap.set(p.id, { cost, category: p.category });
        }

        // Aggregate product performance
        const perfMap = new Map<string, {
          name: string; qty: number; revenue: number; cost: number; profit: number; orders: number; category?: string;
        }>();

        for (const o of orders) {
          for (const item of o.items || []) {
            const key = item.productId || item.name || "?";
            const existing = perfMap.get(key) || {
              name: item.name || "?",
              qty: 0, revenue: 0, cost: 0, profit: 0, orders: 0, category: undefined,
            };
            const searchKey = item.productId || item.name?.toLowerCase() || "";
            const costInfo = costMap.get(searchKey);
            const unitCost = costInfo?.cost || 0;

            existing.qty += item.quantity || 1;
            existing.revenue += (item.price || 0) * (item.quantity || 1);
            existing.cost += unitCost * (item.quantity || 1);
            existing.orders++;
            if (costInfo?.category) existing.category = costInfo.category;
            perfMap.set(key, existing);
          }
        }

        // Calculate profits
        const results = Array.from(perfMap.values()).map(p => ({
          ...p,
          profit: p.revenue - p.cost,
          margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
        }));

        // Sort by selected metric
        if (ordenar === "ventas") {
          results.sort((a, b) => b.qty - a.qty);
        } else if (ordenar === "margen") {
          results.sort((a, b) => b.margin - a.margin);
        } else {
          results.sort((a, b) => b.profit - a.profit);
        }

        const top = results.slice(0, limite);
        const sortLabel = ordenar === "ventas" ? "más vendidos" : ordenar === "margen" ? "mejor margen" : "más rentables";

        let msg = `📊 *DESEMPEÑO DE PRODUCTOS* (${desde} → ${hasta})\n`;
        msg += `🏆 Top por: ${sortLabel}\n\n`;

        for (let i = 0; i < top.length; i++) {
          const p = top[i];
          const marginStr = p.margin >= 0 ? `+${p.margin.toFixed(1)}%` : `${p.margin.toFixed(1)}%`;
          const profitIcon = p.profit >= 0 ? "🟢" : "🔴";
          msg += `${i + 1}. ${p.name}\n`;
          msg += `   Vendidos: ${p.qty} | Ingreso: ${fmtSoles(p.revenue)} | ${profitIcon} Ganancia: ${fmtSoles(p.profit)} (${marginStr})\n`;
          if (p.category) msg += `   📂 ${p.category}\n`;
        }

        // Summary
        const totalRevenue = results.reduce((s, p) => s + p.revenue, 0);
        const totalProfit = results.reduce((s, p) => s + p.profit, 0);
        const topRevenue = top.reduce((s, p) => s + p.revenue, 0);
        const topConcentration = totalRevenue > 0 ? (topRevenue / totalRevenue) * 100 : 0;

        msg += `\n📌 *Resumen:* ${results.length} productos únicos | Concentración top ${limite}: ${topConcentration.toFixed(1)}% de ingresos`;

        return {
          success: true,
          data: { desde, hasta, ordenar, productos: top, totalProductos: results.length, topConcentration },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_desempeno_productos: ${e.message}` };
      }
    },
  },

  // ── 12. Análisis por categoría ───────────────────────────
  {
    name: "analytics_categorias",
    description: "Analiza ventas agrupadas por categoría de producto: ingresos por categoría, cantidad vendida, porcentaje del total, productos únicos por categoría. Responde 'qué categoría vende más', 'ventas por categoría', 'qué categoría es más rentable'.",
    parameters: {
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: 30 días atrás" },
      hasta: { type: "string", description: "Fecha fin YYYY-MM-DD. Default: today" },
    },
    async execute(args, branchId) {
      try {
        const r = dateRange(30);
        const desde = parseDate(String(args.desde || r.desde));
        const hasta = parseDate(String(args.hasta || "today"));

        const orders = await fetchOrders(branchId, desde, hasta);
        if (orders.length === 0) {
          return { success: true, message: `📭 No hay ventas entre ${desde} y ${hasta}.` };
        }

        const products = await fetchProducts(branchId);
        const prodCatMap = new Map<string, string>();
        for (const p of products) {
          const cat = p.category || "Sin categoría";
          prodCatMap.set(p.name?.toLowerCase(), cat);
          prodCatMap.set(p.id, cat);
        }

        const catMap = new Map<string, { qty: number; revenue: number; products: Set<string>; orders: number }>();

        for (const o of orders) {
          for (const item of o.items || []) {
            const searchKey = item.productId || item.name?.toLowerCase() || "";
            const cat = prodCatMap.get(searchKey) || "Sin categoría";

            const existing = catMap.get(cat) || { qty: 0, revenue: 0, products: new Set(), orders: 0 };
            existing.qty += item.quantity || 1;
            existing.revenue += (item.price || 0) * (item.quantity || 1);
            existing.products.add(item.name || searchKey);
            catMap.set(cat, existing);
          }
        }

        // Count orders per category (unique orders that had items in that category)
        for (const o of orders) {
          const catsInOrder = new Set<string>();
          for (const item of o.items || []) {
            const searchKey = item.productId || item.name?.toLowerCase() || "";
            const cat = prodCatMap.get(searchKey) || "Sin categoría";
            catsInOrder.add(cat);
          }
          for (const cat of catsInOrder) {
            const existing = catMap.get(cat)!;
            existing.orders++;
          }
        }

        const totalRevenue = Array.from(catMap.values()).reduce((s, c) => s + c.revenue, 0);
        const totalQty = Array.from(catMap.values()).reduce((s, c) => s + c.qty, 0);

        const sorted = Array.from(catMap.entries())
          .map(([name, data]) => ({
            name,
            qty: data.qty,
            revenue: data.revenue,
            uniqueProducts: data.products.size,
            orders: data.orders,
            revenuePct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
            qtyPct: totalQty > 0 ? (data.qty / totalQty) * 100 : 0,
            avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue);

        let msg = `📂 *VENTAS POR CATEGORÍA* (${desde} → ${hasta})\n\n`;
        for (const cat of sorted) {
          const bar = "█".repeat(Math.max(1, Math.round((cat.revenue / sorted[0].revenue) * 20)));
          msg += `*${cat.name}*\n`;
          msg += `  ${bar} ${fmtSoles(cat.revenue)} (${cat.revenuePct.toFixed(1)}%)\n`;
          msg += `  📦 ${cat.qty} uds (${cat.qtyPct.toFixed(1)}%) | 🏷️ ${cat.uniqueProducts} productos | 🛵 ${cat.orders} pedidos\n`;
        }

        msg += `\n📌 *Total:* ${fmtSoles(totalRevenue)} | ${totalQty} unidades | ${sorted.length} categorías`;
        msg += `\n🏆 *Categoría top:* ${sorted[0]?.name || "N/A"} (${fmtSoles(sorted[0]?.revenue || 0)})`;

        return {
          success: true,
          data: { desde, hasta, categorias: sorted, totalRevenue, totalQty, topCategory: sorted[0]?.name },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error en analytics_categorias: ${e.message}` };
      }
    },
  },
];
