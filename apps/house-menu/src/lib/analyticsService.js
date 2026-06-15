/**
 * Analytics Service — agrega datos de orders para reportes.
 * Trabaja sobre colecciones ya cargadas (allOrders, allDrivers, etc.)
 * para evitar lecturas extra a Firebase.
 */

/** Agrupa orders por rango de tiempo */
export function groupOrdersByPeriod(orders, period = 'day') {
  const groups = {};
  for (const o of orders) {
    const d = new Date(o.createdAt);
    let key;
    if (period === 'hour') key = `${d.getHours()}:00`;
    else if (period === 'day') key = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
    else if (period === 'month') key = d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
    else if (period === 'week') {
      // ISO week
      const start = new Date(d);
      start.setDate(start.getDate() - start.getDay() + 1);
      key = `Sem ${start.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`;
    } else key = d.toDateString();

    if (!groups[key]) groups[key] = { count: 0, revenue: 0, orders: [] };
    groups[key].count++;
    groups[key].revenue += o.financials?.total || 0;
    groups[key].orders.push(o);
  }
  return Object.entries(groups).map(([label, data]) => ({ label, ...data }));
}

/** Filtra orders por rango de fechas */
export function filterOrdersByDate(orders, daysAgo) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  cutoff.setHours(0, 0, 0, 0);
  return orders.filter(o => new Date(o.createdAt) >= cutoff);
}

/** Orders de hoy */
export function todayOrders(orders) {
  const now = new Date();
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.toDateString() === now.toDateString();
  });
}

/** Orders de una fecha específica */
export function ordersOnDate(orders, date) {
  return orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.toDateString() === date.toDateString();
  });
}

/** KPIs con comparativa vs período anterior */
export function computeKpis(orders, previousOrders) {
  const revenue = orders.reduce((s, o) => s + (o.financials?.total || 0), 0);
  const prevRevenue = previousOrders.reduce((s, o) => s + (o.financials?.total || 0), 0);
  const count = orders.length;
  const prevCount = previousOrders.length;
  const avgTicket = count > 0 ? revenue / count : 0;
  const prevAvgTicket = prevCount > 0 ? prevRevenue / prevCount : 0;

  return {
    revenue: { value: revenue, prev: prevRevenue, change: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0 },
    orders: { value: count, prev: prevCount, change: prevCount ? ((count - prevCount) / prevCount) * 100 : 0 },
    avgTicket: { value: avgTicket, prev: prevAvgTicket, change: prevAvgTicket ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0 },
  };
}

/** Top productos más vendidos */
export function topProducts(orders, limit = 10) {
  const products = {};
  for (const o of orders) {
    for (const item of (o.items || [])) {
      if (!products[item.productId || item.name]) {
        products[item.productId || item.name] = { name: item.name, qty: 0, revenue: 0, count: 0 };
      }
      products[item.productId || item.name].qty += item.quantity || 1;
      products[item.productId || item.name].revenue += (item.price || 0) * (item.quantity || 1);
      products[item.productId || item.name].count++;
    }
  }
  return Object.values(products)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

/** Bottom productos (menos vendidos, con ventas > 0) */
export function bottomProducts(orders, limit = 10) {
  const products = {};
  for (const o of orders) {
    for (const item of (o.items || [])) {
      if (!products[item.productId || item.name]) {
        products[item.productId || item.name] = { name: item.name, qty: 0, revenue: 0, count: 0 };
      }
      products[item.productId || item.name].qty += item.quantity || 1;
      products[item.productId || item.name].revenue += (item.price || 0) * (item.quantity || 1);
      products[item.productId || item.name].count++;
    }
  }
  return Object.values(products)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, limit);
}

/** Ventas por método de pago */
export function salesByPaymentMethod(orders) {
  const methods = {};
  for (const o of orders) {
    const method = o.payment_method || 'Pendiente';
    if (!methods[method]) methods[method] = { name: method, value: 0, count: 0 };
    methods[method].value += o.financials?.total || 0;
    methods[method].count++;
  }
  return Object.values(methods).sort((a, b) => b.value - a.value);
}

/** Ventas por categoría de producto */
export function salesByCategory(orders) {
  const cats = {};
  for (const o of orders) {
    for (const item of (o.items || [])) {
      const cat = item.category || 'Sin categoría';
      if (!cats[cat]) cats[cat] = { name: cat, value: 0, qty: 0 };
      cats[cat].value += (item.price || 0) * (item.quantity || 1);
      cats[cat].qty += item.quantity || 1;
    }
  }
  return Object.values(cats).sort((a, b) => b.value - a.value);
}

/** Productividad del staff — pedidos procesados por hora */
export function staffProductivity(orders) {
  const staff = {};
  for (const o of orders) {
    const name = o.createdBy || 'Anónimo';
    if (!staff[name]) staff[name] = { name, orders: 0, revenue: 0, tableOrders: 0, deliveryOrders: 0 };
    staff[name].orders++;
    staff[name].revenue += o.financials?.total || 0;
    if (o.type === 'delivery' || o.driverId) staff[name].deliveryOrders++;
    else staff[name].tableOrders++;
  }
  return Object.values(staff).sort((a, b) => b.orders - a.orders);
}

/** Tiempos promedio por estado (cocina) */
export function kitchenTimes(orders) {
  const times = [];
  for (const o of orders) {
    if (o.statusTimestamps?.recibido && o.statusTimestamps?.listo) {
      const start = new Date(o.statusTimestamps.recibido).getTime();
      const end = new Date(o.statusTimestamps.listo).getTime();
      if (end > start) times.push((end - start) / 60000); // minutos
    }
  }
  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  return { avg: Math.round(avg * 10) / 10, min: Math.round(Math.min(...times) * 10) / 10 || 0, max: Math.round(Math.max(...times) * 10) / 10 || 0, samples: times.length };
}

/** Prepara data para el reporte diario */
export function dailyReport(orders) {
  const today = todayOrders(orders);
  const revenue = today.reduce((s, o) => s + (o.financials?.total || 0), 0);
  const byMethod = salesByPaymentMethod(today);
  const byCategory = salesByCategory(today);

  return {
    date: new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    totalOrders: today.length,
    revenue,
    avgTicket: today.length > 0 ? revenue / today.length : 0,
    byMethod,
    byCategory,
    topProducts: topProducts(today, 5),
    statusCounts: {
      recibido: today.filter(o => o.status === 'recibido').length,
      preparando: today.filter(o => o.status === 'preparando').length,
      listo: today.filter(o => o.status === 'listo').length,
      en_camino: today.filter(o => o.status === 'en_camino').length,
      entregado: today.filter(o => o.status === 'entregado').length,
      cancelado: today.filter(o => o.status === 'cancelado').length,
    },
  };
}
