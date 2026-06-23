/**
 * Predictive Ops — Motor de Análisis
 *
 * Computa métricas de demanda, staff, stock y pricing.
 * Los resultados alimentan getLLMInsights() para generar recomendaciones
 * accionables usando el LLM (Kimi K2.6).
 */
import { get, ref } from '../lib/firebase.js';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DemandMetrics {
  todayOrders: number;
  todayRevenue: number;
  todayItems: number;
  avgTicket: number;
  weeklyOrders: number[];
  weeklyRevenue: number[];
  peakHour: string;
  peakDay: string;
  trend: number; // % vs last week
  hourlyBreakdown: Record<string, number>;
}

export interface StaffMetrics {
  totalStaff: number;
  activeToday: number;
  coverageByHour: Record<string, { orders: number; staff: number; ratio: number }>;
  understaffedHours: string[];
  overstaffedHours: string[];
}

export interface StockMetrics {
  totalProducts: number;
  outOfStock: string[];
  lowStock: Array<{ name: string; stock: number; dailyConsumption: number; daysLeft: number }>;
  nearOut: string[];
}

export interface PricingMetrics {
  avgMargin: number;
  topRevenueProducts: Array<{ name: string; revenue: number; margin: number }>;
  underperformers: Array<{ name: string; orders: number; revenue: number }>;
}

export interface PredictiveReport {
  demand: DemandMetrics;
  staff: StaffMetrics;
  stock: StockMetrics;
  pricing: PricingMetrics;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getDayName(dayIndex: number): string {
  return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function avg(arr: number[]): number {
  return arr.length > 0 ? sum(arr) / arr.length : 0;
}

// ── Demand ───────────────────────────────────────────────────────────────────

export async function computeDemandMetrics(branchId: string, days = 7): Promise<DemandMetrics> {
  const db = await import('../lib/firebase.js').then(m => m.initFirebase());
  const ordersRef = ref(db, `branches/${branchId}/orders`);

  let snap: any;
  try {
    snap = await get(ordersRef);
  } catch {
    return emptyDemand();
  }

  if (!snap.exists()) return emptyDemand();

  const allOrders = Object.values(snap.val() || {}) as any[];
  const now = Date.now();
  const dayMs = 86400000;

  // Daily aggregates
  const dailyOrders: number[] = [];
  const dailyRevenue: number[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now - d * dayMs;
    const dayEnd = dayStart + dayMs;
    const dayData = allOrders.filter((o: any) => {
      const t = o.createdAt;
      return t >= dayStart && t < dayEnd;
    });
    dailyOrders.push(dayData.length);
    dailyRevenue.push(dayData.reduce((s: number, o: any) => s + Number(o.total || 0), 0));
  }

  const todayOrders = dailyOrders[dailyOrders.length - 1] || 0;
  const todayRevenue = dailyRevenue[dailyRevenue.length - 1] || 0;
  const todayItems = allOrders
    .filter((o: any) => {
      const t = o.createdAt;
      const todayStart = now - dayMs;
      return t >= todayStart && t < now;
    })
    .reduce((s: number, o: any) => s + (o.items?.reduce((ss: number, i: any) => ss + (i.quantity || 1), 0) || 0), 0);

  // Hourly breakdown
  const hourlyBreakdown: Record<string, number> = {};
  const todayStart = now - dayMs;
  allOrders
    .filter((o: any) => (o.createdAt || 0) >= todayStart)
    .forEach((o: any) => {
      if (!o.createdAt) return;
      const h = new Date(o.createdAt).getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      hourlyBreakdown[key] = (hourlyBreakdown[key] || 0) + 1;
    });

  // Peak hour
  const peakHour = Object.entries(hourlyBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || '12:00';

  // Peak day of week (from all historical)
  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  allOrders.forEach((o: any) => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt).getDay();
    dayCounts[d]++;
  });
  const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const peakDay = getDayName(peakDayIdx);

  // Trend: compare last 3 days avg vs prior 4 days avg
  const last3 = avg(dailyOrders.slice(-3));
  const prior4 = avg(dailyOrders.slice(0, 4));
  const trend = prior4 > 0 ? Math.round(((last3 - prior4) / prior4) * 100) : 0;

  return {
    todayOrders,
    todayRevenue,
    todayItems,
    avgTicket: todayOrders > 0 ? todayRevenue / todayOrders : 0,
    weeklyOrders: dailyOrders,
    weeklyRevenue: dailyRevenue,
    peakHour,
    peakDay,
    trend,
    hourlyBreakdown,
  };
}

function emptyDemand(): DemandMetrics {
  return {
    todayOrders: 0, todayRevenue: 0, todayItems: 0, avgTicket: 0,
    weeklyOrders: [0, 0, 0, 0, 0, 0, 0],
    weeklyRevenue: [0, 0, 0, 0, 0, 0, 0],
    peakHour: '12:00', peakDay: '—', trend: 0, hourlyBreakdown: {},
  };
}

// ── Staff ────────────────────────────────────────────────────────────────────

export async function computeStaffMetrics(branchId: string): Promise<StaffMetrics> {
  const db = await import('../lib/firebase.js').then(m => m.initFirebase());

  let snapOrders: any, snapStaff: any;
  try {
    [snapOrders, snapStaff] = await Promise.all([
      get(ref(db, `branches/${branchId}/orders`)),
      get(ref(db, `branches/${branchId}/staff`)),
    ]);
  } catch {
    return emptyStaff();
  }

  const allOrders = Object.values(snapOrders?.val() || {} as any[]);
  const allStaff = Object.values(snapStaff?.val() || {} as any[]);

  const now = new Date();
  const dayIndex = now.getDay();
  const todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];

  // Staff scheduled today
  const activeToday = allStaff.filter((e: any) => {
    if (!e.active) return false;
    const sched = e.schedule;
    if (Array.isArray(sched)) return sched.includes(todayName);
    if (typeof sched === 'string') return sched.includes(todayName);
    return true; // no schedule = assume always available
  }).length;

  // Orders per hour today
  const dayStart = now.setHours(0, 0, 0, 0);
  const ordersByHour: Record<number, number> = {};
  allOrders
    .filter((o: any) => (o.createdAt || 0) >= dayStart)
    .forEach((o: any) => {
      if (!o.createdAt) return;
      const h = new Date(o.createdAt).getHours();
      ordersByHour[h] = (ordersByHour[h] || 0) + 1;
    });

  // Coverage: staff per hour vs orders per hour
  const coverageByHour: Record<string, { orders: number; staff: number; ratio: number }> = {};
  const understaffed: string[] = [];
  const overstaffed: string[] = [];

  for (let h = 8; h <= 22; h++) {
    const key = `${String(h).padStart(2, '0')}:00`;
    const orders = ordersByHour[h] || 0;
    // Simple coverage model: 1 staff per 5 orders/hour
    const needed = Math.max(1, Math.ceil(orders / 5));
    const available = Math.min(activeToday, needed);
    const ratio = needed > 0 ? available / needed : 1;

    coverageByHour[key] = { orders, staff: available, ratio };

    if (orders > 0 && ratio < 0.5) understaffed.push(key);
    else if (ratio > 1.5) overstaffed.push(key);
  }

  return {
    totalStaff: allStaff.length,
    activeToday,
    coverageByHour,
    understaffedHours: understaffed,
    overstaffedHours: overstaffed,
  };
}

function emptyStaff(): StaffMetrics {
  return {
    totalStaff: 0, activeToday: 0,
    coverageByHour: {},
    understaffedHours: [], overstaffedHours: [],
  };
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function computeStockMetrics(branchId: string): Promise<StockMetrics> {
  const db = await import('../lib/firebase.js').then(m => m.initFirebase());

  let snapProducts: any, snapOrders: any;
  try {
    [snapProducts, snapOrders] = await Promise.all([
      get(ref(db, `branches/${branchId}/catalog/products`)),
      get(ref(db, `branches/${branchId}/orders`)),
    ]);
  } catch {
    return emptyStock();
  }

  const products = Object.values(snapProducts?.val() || {} as any[]);
  const orders = Object.values(snapOrders?.val() || {} as any[]);

  // Daily item consumption
  const itemConsumption: Record<string, { name: string; qty: number; stock: number }> = {};

  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const key = item.name || '?';
      if (!itemConsumption[key]) {
        itemConsumption[key] = { name: key, qty: 0, stock: 0 };
      }
      itemConsumption[key].qty += item.quantity || 1;
    });
  });

  // Map stock from products
  const productMap: Record<string, any> = {};
  products.forEach((p: any) => { productMap[p.name] = p; });

  const outOfStock: string[] = [];
  const lowStock: Array<{ name: string; stock: number; dailyConsumption: number; daysLeft: number }> = [];
  const nearOut: string[] = [];

  Object.values(itemConsumption).forEach((entry: any) => {
    const product = productMap[entry.name];
    const stock = product?.stock ?? null;
    const dailyConsumption = entry.qty / 7; // per day avg

    if (stock === 0) {
      outOfStock.push(entry.name);
    } else if (stock !== null && stock <= 5) {
      const daysLeft = dailyConsumption > 0 ? Math.round(stock / dailyConsumption) : 999;
      lowStock.push({ name: entry.name, stock, dailyConsumption: Math.round(dailyConsumption * 10) / 10, daysLeft });
      if (daysLeft <= 2) nearOut.push(entry.name);
    }
  });

  // Sort low stock by days left ascending
  lowStock.sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    totalProducts: products.length,
    outOfStock,
    lowStock,
    nearOut,
  };
}

function emptyStock(): StockMetrics {
  return { totalProducts: 0, outOfStock: [], lowStock: [], nearOut: [] };
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export async function computePricingMetrics(branchId: string): Promise<PricingMetrics> {
  const db = await import('../lib/firebase.js').then(m => m.initFirebase());

  let snapProducts: any, snapOrders: any;
  try {
    [snapProducts, snapOrders] = await Promise.all([
      get(ref(db, `branches/${branchId}/catalog/products`)),
      get(ref(db, `branches/${branchId}/orders`)),
    ]);
  } catch {
    return emptyPricing();
  }

  const products = snapProducts?.val() || {};
  const orders = Object.values(snapOrders?.val() || {} as any[]);

  // Revenue per product
  const productRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const key = item.name || '?';
      if (!productRevenue[key]) {
        productRevenue[key] = { name: key, revenue: 0, orders: 0 };
      }
      const price = item.price || 0;
      productRevenue[key].revenue += price * (item.quantity || 1);
      productRevenue[key].orders += item.quantity || 1;
    });
  });

  const entries = Object.values(productRevenue) as any[];
  entries.sort((a, b) => b.revenue - a.revenue);

  const topRevenue = entries.slice(0, 5).map((e: any) => {
    const product = Object.values(products).find((p: any) => p.name === e.name) as any;
    return {
      name: e.name,
      revenue: Math.round(e.revenue * 100) / 100,
      margin: product ? (product.margin ?? 0.35) : 0.35,
    };
  });

  const avgMargin = topRevenue.length > 0
    ? Math.round(avg(topRevenue.map((p: any) => p.margin)) * 100)
    : 35;

  const underperformers = entries
    .filter((e: any) => e.revenue < 50)
    .slice(0, 5)
    .map((e: any) => ({ name: e.name, orders: e.orders, revenue: Math.round(e.revenue * 100) / 100 }));

  return { avgMargin, topRevenueProducts: topRevenue, underperformers };
}

function emptyPricing(): PricingMetrics {
  return { avgMargin: 35, topRevenueProducts: [], underperformers: [] };
}

// ── Full Report ───────────────────────────────────────────────────────────────

export async function computePredictiveReport(branchId: string): Promise<PredictiveReport> {
  const [demand, staff, stock, pricing] = await Promise.all([
    computeDemandMetrics(branchId),
    computeStaffMetrics(branchId),
    computeStockMetrics(branchId),
    computePricingMetrics(branchId),
  ]);
  return { demand, staff, stock, pricing };
}

// ── Formatters (para alimentar el LLM) ────────────────────────────────────────

export function formatDemandForLLM(d: DemandMetrics): string {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weekly = d.weeklyOrders.map((v, i) => `${days[i]}: ${v} pedidos`).join(', ');
  return `HOY: ${d.todayOrders} pedidos, S/ ${d.todayRevenue.toFixed(2)}, ticket promedio S/ ${d.avgTicket.toFixed(2)}.
SEMANA: [${weekly}]
TENDENCIA: ${d.trend > 0 ? '+' : ''}${d.trend}% vs semana pasada.
PICO: hora ${d.peakHour}, día ${d.peakDay}.
POR HORA: ${JSON.stringify(d.hourlyBreakdown)}`;
}

export function formatStaffForLLM(s: StaffMetrics): string {
  return `STAFF TOTAL: ${s.totalStaff}, ACTIVOS HOY: ${s.activeToday}.
HORAS SIN COBERTURA: ${s.understaffedHours.join(', ') || 'ninguna'}.
HORAS SOBRECARGADOS: ${s.overstaffedHours.join(', ') || 'ninguna'}.`;
}

export function formatStockForLLM(s: StockMetrics): string {
  const low = s.lowStock.slice(0, 5)
    .map(p => `${p.name} (stock: ${p.stock}, ~${p.daysLeft} días)`)
    .join('; ');
  return `SIN STOCK: ${s.outOfStock.join(', ') || 'ninguno'}.
BAJO STOCK: ${low || 'ninguno'}.
ALERTAS CRÍTICAS: ${s.nearOut.join(', ') || 'ninguna'}.`;
}

export function formatPricingForLLM(p: PricingMetrics): string {
  const top = p.topRevenueProducts.slice(0, 3).map(pr => `${pr.name} (S/ ${pr.revenue}, margen ${Math.round(pr.margin * 100)}%)`).join('; ');
  const under = p.underperformers.map(u => `${u.name} (S/ ${u.revenue})`).join('; ');
  return `MARGEN PROMEDIO: ${p.avgMargin}%.
TOP INGRESOS: ${top || 'sin datos'}.
BAJO RENDIMIENTO: ${under || 'ninguno'}.`;
}