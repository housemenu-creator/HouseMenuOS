/**
 * Cliente 360 MCP Tools — customer personalization for the atencion agent.
 *
 * These tools help the agent provide personalized service:
 *   - Recommend products based on order history
 *   - Check loyalty points and rewards
 *   - Quick customer lookup
 */

import { initFirebase, ref, get, child } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

// ── Helpers ─────────────────────────────────────────────

async function getCustomerByPhone(phone: string): Promise<any | null> {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return null;
  const snap = await get(child(ref(db), "customers"));
  if (!snap.exists()) return null;
  const customers = snap.val() as Record<string, any>;
  for (const [id, c] of Object.entries(customers)) {
    const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
    if (custPhone && custPhone.includes(cleaned.slice(-9))) {
      return { id, ...c };
    }
  }
  return null;
}

async function getCustomerOrders(phone: string, branchId: string): Promise<any[]> {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const customer = await getCustomerByPhone(cleaned);
  if (!customer) return [];

  // Try reverse index first (customer_orders / phone → { orderId: true })
  const indexSnap = await get(child(ref(db), `branches/${branchId}/customer_orders/${customer.phone}`));
  if (indexSnap.exists()) {
    const orderIds = Object.keys(indexSnap.val());
    const orders = await Promise.all(
      orderIds.map(async (id) => {
        const o = await get(child(ref(db), `branches/${branchId}/orders/${id}`));
        return o.exists() ? { id, ...o.val() } : null;
      }),
    );
    return orders.filter(Boolean).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // Fallback: full scan (migration window)
  const snap = await get(child(ref(db), `branches/${branchId}/orders`));
  if (!snap.exists()) return [];

  return (Object.values(snap.val()) as any[])
    .filter((o: any) => {
      if (customer.email && o.customerEmail === customer.email) return true;
      if (customer.phone && o.customerPhone === customer.phone) return true;
      return false;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getProductCategories(branchId: string): Promise<any[]> {
  // We'll fetch from products to build category info
  return fetchProducts(branchId);
}

async function fetchProducts(branchId: string): Promise<any[]> {
  const snap = await get(child(ref(db), `branches/${branchId}/catalog/products`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, p]) => ({ id, ...(p as any) }));
}

// ── TOOLS ───────────────────────────────────────────────

export const customerTools: MCPTool[] = [
  // ── 1. Recommend products ──────────────────────────────
  {
    name: "cliente_recomendar",
    description: "Recomienda productos a un cliente basado en su historial de pedidos. Sugiere platos que ya pidió antes y productos similares de la misma categoría. Ideal para upselling y personalización.",
    parameters: {
      telefono: { type: "string", description: "Teléfono del cliente para buscar su historial (con o sin código de país)" },
      limite: { type: "string", description: "Cantidad máxima de recomendaciones. Default: '5'" },
    },
    async execute(args, branchId) {
      try {
        const telefono = String(args.telefono || "");
        const limite = parseInt(String(args.limite || "5"));
        if (!telefono) return { success: false, error: "Necesito el teléfono del cliente para recomendarle." };

        const customer = await getCustomerByPhone(telefono);
        if (!customer) {
          return { success: true, message: "No encontré al cliente en la base de datos. Podés sugerirle los productos más populares del menú." };
        }

        const orders = await getCustomerOrders(telefono, branchId);
        const products = await fetchProducts(branchId);
        const categoryMap = new Map(products.map((p) => [p.name?.toLowerCase(), p]));

        // Get customer's most-ordered products
        const productCount = new Map<string, { name: string; qty: number; category: string }>();
        for (const o of orders) {
          for (const item of (o.items || [])) {
            const name = item.name || "?";
            const existing = productCount.get(name) || { name, qty: 0, category: item.category || "" };
            existing.qty += item.quantity || 1;
            productCount.set(name, existing);
          }
        }

        const topProducts = Array.from(productCount.values())
          .sort((a, b) => b.qty - a.qty);

        // Find preferred categories
        const preferredCategories = new Set<string>();
        for (const p of topProducts) {
          const prod = categoryMap.get(p.name.toLowerCase());
          if (prod?.category) preferredCategories.add(prod.category);
        }

        // Get available products that match preferred categories (excluding what they already order a lot of)
        const alreadyOrdered = new Set(topProducts.map((p) => p.name.toLowerCase()));
        const recommendations = products
          .filter((p: any) => {
            if (p.available === false) return false;
            if (alreadyOrdered.has(p.name?.toLowerCase())) return false;
            if (preferredCategories.size > 0 && p.category && preferredCategories.has(p.category)) return true;
            return false;
          })
          .slice(0, limite);

        // If not enough category matches, add popular items
        if (recommendations.length < 3) {
          const popular = products
            .filter((p: any) => {
              if (p.available === false) return false;
              if (alreadyOrdered.has(p.name?.toLowerCase())) return false;
              if (recommendations.find((r) => r.id === p.id)) return false;
              return true;
            })
            .slice(0, limite - recommendations.length);
          recommendations.push(...popular);
        }

        let msg = `🎯 *Recomendaciones para ${customer.name || "el cliente"}*\n\n`;

        if (topProducts.length > 0) {
          msg += `*Basado en su historial (${customer.orderCount || 0} pedidos):*\n`;
          for (const p of topProducts.slice(0, 3)) {
            msg += `  • ${p.name} (lo pidió ${p.qty} veces)\n`;
          }
          msg += "\n";
        }

        if (recommendations.length > 0) {
          msg += `*Te recomendamos probar:*\n`;
          for (const p of recommendations) {
            const price = Number(p.base_price ?? p.price ?? 0);
            msg += `  • ${p.name} — ${price > 0 ? `S/ ${price.toFixed(2)}` : "consultar precio"}\n`;
          }
        } else {
          msg += "No hay recomendaciones adicionales por ahora.";
        }

        return {
          success: true,
          data: { customer: { name: customer.name, orderCount: customer.orderCount }, topProducts: topProducts.slice(0, 3), recommendations },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al recomendar: ${e.message}` };
      }
    },
  },

  // ── 2. Points balance ─────────────────────────────────
  {
    name: "cliente_puntos",
    description: "Consulta los puntos de fidelidad de un cliente y su saldo disponible para canjes. Responde 'cuántos puntos tengo', 'puntos de fidelidad', 'beneficios'.",
    parameters: {
      telefono: { type: "string", description: "Teléfono del cliente" },
    },
    async execute(args, branchId) {
      try {
        const telefono = String(args.telefono || "");
        if (!telefono) return { success: false, error: "Necesito el teléfono del cliente." };

        const customer = await getCustomerByPhone(telefono);
        if (!customer) {
          return { success: true, message: "No encontré al cliente. ¿Es su primera vez? Podés explicarle que acumula 1 punto por cada S/10 en pedidos." };
        }

        const points = customer.points || 0;
        const totalSpent = customer.totalSpent || 0;
        const estimatedPoints = Math.floor(totalSpent / 10);

        let msg = `⭐ *Puntos de Fidelidad*\n\n`;
        msg += `Cliente: ${customer.name || "—"}\n`;
        msg += `Puntos actuales: ${points}\n`;

        if (totalSpent > 0) {
          msg += `Gasto total: S/ ${totalSpent.toFixed(2)}\n`;
          msg += `Puntos estimados acumulados: ${estimatedPoints}\n`;
        }

        msg += `\n*Beneficios disponibles:*\n`;
        if (points >= 10) {
          const descuento = Math.min(points, 50);
          msg += `  🎉 S/ ${descuento}.00 de descuento en su próximo pedido (10 pts = S/ 10)\n`;
        } else {
          const faltan = 10 - points;
          msg += `  Le faltan ${faltan} puntos para S/ 10 de descuento\n`;
        }
        msg += `  💰 1 punto por cada S/ 10 de consumo\n`;

        return {
          success: true,
          data: { name: customer.name, points, totalSpent, estimatedPoints },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al consultar puntos: ${e.message}` };
      }
    },
  },

  // ── 3. Inactive customers (for CRM campaigns) ─────────
  {
    name: "clientes_inactivos",
    description: "Busca clientes que no hicieron pedidos en los últimos N días. Devuelve una lista con nombre, teléfono, último pedido y total gastado. Ideal para campañas de recuperación.",
    parameters: {
      dias: { type: "string", description: "Cantidad de días de inactividad mínima. Ej: '15'" },
      limite: { type: "string", description: "Máximo de resultados. Default: '50'" },
      sucursal: { type: "string", description: "ID de sucursal para filtrar. Opcional." },
    },
    async execute(args, branchId) {
      try {
        const dias = parseInt(String(args.dias || "15"));
        const limite = parseInt(String(args.limite || "50"));
        const branch = String(args.sucursal || branchId);
        const cutoff = Date.now() - dias * 86400000;

        const snap = await get(child(ref(db), "customers"));
        if (!snap.exists()) {
          return { success: true, message: "No hay clientes registrados.", data: [] };
        }

        const customers = snap.val() as Record<string, any>;
        const inactivos: any[] = [];

        for (const [id, c] of Object.entries(customers)) {
          const lastOrder = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
          if (lastOrder === 0 || lastOrder < cutoff) {
            // Check if customer has orders in this branch
            const branchSnap = await get(child(ref(db), `branches/${branch}/orders`));
            let hasBranchOrders = false;
            if (branchSnap.exists()) {
              const orders = Object.values(branchSnap.val()) as any[];
              hasBranchOrders = orders.some((o: any) => {
                if (c.email && o.customerEmail === c.email) return true;
                if (c.phone && o.customerPhone === c.phone) return true;
                return false;
              });
            }
            if (hasBranchOrders || branch === branchId) {
              inactivos.push({
                id,
                nombre: c.name || "",
                telefono: c.phone || "",
                email: c.email || "",
                totalGastado: c.totalSpent || 0,
                pedidos: c.orderCount || 0,
                ultimoPedido: c.lastOrderAt || null,
                diasInactivo: lastOrder > 0 ? Math.floor((Date.now() - lastOrder) / 86400000) : null,
              });
            }
          }
        }

        // Sort by most inactive first
        inactivos.sort((a, b) => (b.diasInactivo || 999) - (a.diasInactivo || 999));
        const resultados = inactivos.slice(0, limite);

        return {
          success: true,
          data: resultados,
          message: `Encontré ${resultados.length} clientes inactivos (de ${inactivos.length} totales) con más de ${dias} días sin pedir.`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al buscar inactivos: ${e.message}` };
      }
    },
  },

  // ── 4. Quick customer lookup ──────────────────────────
  {
    name: "cliente_buscar",
    description: "Busca un cliente por teléfono o nombre. Devuelve su perfil completo: datos, frecuencia, gasto total, puntos. Ideal para 'quién es este cliente', 'búscame al cliente X'.",
    parameters: {
      telefono: { type: "string", description: "Teléfono del cliente (sin guiones, con o sin código de país)" },
      nombre: { type: "string", description: "Nombre del cliente para buscar (opcional si ya tenés teléfono)" },
    },
    async execute(args, branchId) {
      try {
        const telefono = String(args.telefono || "").trim();
        const nombre = String(args.nombre || "").trim().toLowerCase();

        if (!telefono && !nombre) {
          return { success: false, error: "Necesito el teléfono o nombre del cliente." };
        }

        const snap = await get(child(ref(db), "customers"));
        if (!snap.exists()) {
          return { success: true, message: "No hay clientes registrados en el sistema." };
        }

        const customers = snap.val() as Record<string, any>;
        let match: [string, any] | null = null;

        if (telefono) {
          const cleaned = telefono.replace(/[^0-9]/g, "");
          for (const [id, c] of Object.entries(customers)) {
            const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
            if (custPhone && custPhone.includes(cleaned.slice(-9))) {
              match = [id, c];
              break;
            }
          }
        }

        if (!match && nombre) {
          for (const [id, c] of Object.entries(customers)) {
            if ((c.name || "").toLowerCase().includes(nombre)) {
              match = [id, c];
              break;
            }
          }
        }

        if (!match) {
          return { success: true, message: telefono
            ? `No encontré un cliente con teléfono ${telefono}.`
            : `No encontré un cliente con nombre "${nombre}".` };
        }

        const [id, c] = match;
        const lastOrder = c.lastOrderAt
          ? `${Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)} días atrás`
          : "nunca";

        let msg = `👤 *Cliente encontrado*\n\n`;
        msg += `Nombre: ${c.name || "—"}\n`;
        msg += `Teléfono: ${c.phone || "—"}\n`;
        msg += `Email: ${c.email || "—"}\n`;
        msg += `Pedidos: ${c.orderCount || 0}\n`;
        msg += `Gasto total: S/ ${(c.totalSpent || 0).toFixed(2)}\n`;
        msg += `Puntos: ${c.points || 0}\n`;
        msg += `Último pedido: ${lastOrder}\n`;
        msg += `Cliente desde: ${c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-PE") : "—"}`;

        return {
          success: true,
          data: { id, name: c.name, phone: c.phone, email: c.email, orderCount: c.orderCount, totalSpent: c.totalSpent, points: c.points },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al buscar cliente: ${e.message}` };
      }
    },
  },
];
