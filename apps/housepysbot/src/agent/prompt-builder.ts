/**
 * Prompt Builder — builds the full system prompt with context from:
 *   - Branch info (name, address, schedule, delivery)
 *   - Agent config (templates, tools)
 *   - Customer 360 profile (lookup, orders, favorites)
 *   - RAG retrieval (menu, policies)
 */
import { getBranchInfo } from "../lib/branch.js";
import { getAgentConfigCached } from "../lib/agentConfig.js";
import { getRelevantContext } from "../rag/retrieval.js";
import { initFirebase, ref, get, child, set } from "../lib/firebase.js";
import logger from "../lib/logger.js";

// ── Types ──────────────────────────────────────────────

export interface SenderInfo {
  phone?: string;
  platform: "whatsapp" | "telegram";
}

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  points: number;
  lastOrderAt: string;
  createdAt: string;
  favoriteProducts: string[];
}

// ── Firebase init (lazy, module-level singleton) ──────
const db = initFirebase();

// ── Customer 360 ──────────────────────────────────────

async function lookupCustomerByPhone(phone: string): Promise<CustomerProfile | null> {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return null;

  try {
    // Try reverse index first (O(1))
    const idxSnap = await get(child(ref(db), `customers_by_phone/${cleaned}`));
    if (idxSnap.exists()) {
      const custSnap = await get(child(ref(db), `customers/${idxSnap.val()}`));
      if (custSnap.exists()) {
        const c = custSnap.val();
        const favProducts = await getFavoriteProducts(idxSnap.val(), c.email, c.phone);
        return {
          id: idxSnap.val(),
          name: c.name || "",
          phone: c.phone || "",
          email: c.email || "",
          orderCount: c.orderCount || 0,
          totalSpent: c.totalSpent || 0,
          points: c.points || 0,
          lastOrderAt: c.lastOrderAt || "",
          createdAt: c.createdAt || "",
          favoriteProducts: favProducts,
        };
      }
    }

    // Fallback: scan all customers — lazy-writes index for next time
    const snap = await get(child(ref(db), "customers"));
    if (!snap.exists()) return null;

    const customers = snap.val() as Record<string, any>;
    for (const [id, c] of Object.entries(customers)) {
      const custPhone = (c.phone || "").replace(/[^0-9]/g, "");
      if (custPhone && custPhone.includes(cleaned.slice(-9))) {
        // ponytail: lazy index write
        set(child(ref(db), `customers_by_phone/${custPhone}`), id).catch(() => {});
        const favProducts = await getFavoriteProducts(id, c.email, c.phone);
        return {
          id,
          name: c.name || "",
          phone: c.phone || "",
          email: c.email || "",
          orderCount: c.orderCount || 0,
          totalSpent: c.totalSpent || 0,
          points: c.points || 0,
          lastOrderAt: c.lastOrderAt || "",
          createdAt: c.createdAt || "",
          favoriteProducts: favProducts,
        };
      }
    }
    return null;
  } catch (e) {
    logger.warn(e, "agent.lookupCustomerByPhone error:");
    return null;
  }
}

async function getFavoriteProducts(customerId: string, email: string, phone: string): Promise<string[]> {
  try {
    const branchIds = (process.env.HOUSEPYSBOT_BRANCH_ID || "").split(",").map(s => s.trim()).filter(Boolean);
    const productCount = new Map<string, number>();

    for (const branchId of branchIds) {
      // Try reverse index first
      let orders: any[] = [];
      if (phone) {
        const cleaned = phone.replace(/[^0-9]/g, "");
        const indexSnap = await get(child(ref(db), `branches/${branchId}/customer_orders/${cleaned}`));
        if (indexSnap.exists()) {
          const ids = Object.keys(indexSnap.val());
          const fetched = await Promise.all(
            ids.map(async (id) => {
              const o = await get(child(ref(db), `branches/${branchId}/orders/${id}`));
              return o.exists() ? { id, ...o.val() } as any : null;
            }),
          );
          orders = fetched.filter(Boolean);
        }
      }
      // Fallback full scan if index empty or no phone
      if (orders.length === 0) {
        const snap = await get(child(ref(db), `branches/${branchId}/orders`));
        if (snap.exists()) {
          const allOrders = Object.values(snap.val()) as any[];
          orders = allOrders.filter((o: any) => {
            if (email && o.customerEmail === email) return true;
            if (phone && o.customerPhone === phone) return true;
            return false;
          });
        }
      }
      for (const o of orders) {
        for (const item of (o.items || [])) {
          const name = item.name || "?";
          productCount.set(name, (productCount.get(name) || 0) + (item.quantity || 1));
        }
      }
    }

    return Array.from(productCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  } catch {
    return [];
  }
}

function buildCustomerContext(customer: CustomerProfile): string {
  const lines: string[] = [];
  lines.push("INFORMACIÓN DEL CLIENTE (usá esto para personalizar la atención):");
  lines.push(`Nombre: ${customer.name || "No registrado"}`);
  lines.push(`Teléfono: ${customer.phone}`);
  if (customer.orderCount > 0) {
    lines.push(`Total de pedidos: ${customer.orderCount}`);
    lines.push(`Gasto total: S/ ${customer.totalSpent.toFixed(2)}`);
    lines.push(`Puntos de fidelidad: ${customer.points}`);
    if (customer.lastOrderAt) {
      const lastOrder = new Date(customer.lastOrderAt);
      const daysAgo = Math.floor((Date.now() - lastOrder.getTime()) / 86400000);
      lines.push(`Último pedido: ${daysAgo === 0 ? "hoy" : `hace ${daysAgo} días`}`);
    }
    if (customer.favoriteProducts.length > 0) {
      lines.push(`Platos favoritos: ${customer.favoriteProducts.join(", ")}`);
    }
  } else {
    lines.push("Nuevo cliente — primera vez que pide.");
  }
  lines.push("");
  lines.push("Usá esta información para saludar al cliente por su nombre y ofrecerle");
  lines.push("una atención personalizada. Preguntale si quiere repetir sus platos favoritos.");
  return lines.join("\n");
}

// ── Base system prompt ────────────────────────────────

async function buildBasePrompt(branchId: string, agentId: string): Promise<string> {
  const info = await getBranchInfo(branchId);
  const config = await getAgentConfigCached(branchId, agentId);

  const name = info?.name || "el restaurante";
  const address = info?.address ? `📍 Dirección: ${info.address}` : "";
  const phone = info?.phone ? `📞 Teléfono: ${info.phone}` : "";
  const schedule = info?.schedule ? `🕐 Horario: ${info.schedule}` : "";
  const delivery = info?.deliveryEnabled
    ? `🚚 Delivery: S/ ${info.deliveryFee?.toFixed(2)} (gratis desde S/ ${info.freeThreshold?.toFixed(2)})`
    : "";

  const infoLines = [
    `Nombre: ${name}`,
    address,
    phone,
    schedule,
    delivery,
  ]
    .filter(Boolean)
    .join("\n");

  return config.systemPrompt.replace(
    "INFORMACIÓN DEL RESTAURANTE:\nNombre: {name}{address}{phone}{schedule}{delivery}",
    infoLines,
  );
}

// ── Public API ────────────────────────────────────────

/**
 * Build the complete system prompt for an agent, including:
 *   1. Base prompt (branch info + agent config template)
 *   2. Customer 360 profile (if senderInfo has phone)
 *   3. RAG context (menu/policy documents relevant to the message)
 */
export async function buildSystemPrompt(
  branchId: string,
  agentId: string,
  message: string,
  senderInfo?: SenderInfo,
): Promise<string> {
  let prompt = await buildBasePrompt(branchId, agentId);

  // ── AI Cliente 360: inject customer context for atencion agent ──
  if (agentId === "atencion" && senderInfo?.phone) {
    const customer = await lookupCustomerByPhone(senderInfo.phone);
    if (customer) {
      prompt += "\n\n" + buildCustomerContext(customer);
    }
  }

  // ── RAG: inject relevant menu/policy knowledge ──
  try {
    const ragContext = await getRelevantContext(message, 3);
    if (ragContext) {
      prompt += "\n\n" + ragContext;
    }
  } catch (e) {
    logger.warn(e, "RAG retrieval error (non-blocking):");
  }

  return prompt;
}
