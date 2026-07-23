/**
 * Webhook Service — delivery platform webhook normalization + processing
 *
 * Normalizes payloads from Rappi, PedidosYa, Uber Eats and other platforms
 * into a standard order format and persists them to Firebase.
 */
import { getAllBranchIds } from "../lib/branch.js";
import logger from "../lib/logger.js";

// ── Deduplication ─────────────────────────────────────
const webhookDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of webhookDedup) {
    if (now - ts > 300_000) webhookDedup.delete(key);
  }
}, 60_000);

// ── Normalizers per provider ──────────────────────────

function normalizeRappi(data: any) {
  return {
    id: data.id || data.order_id,
    cliente: data.customer?.name || data.cliente || "Cliente Rappi",
    items: (data.items || []).map((i: any) => ({
      productId: i.id || i.product_id,
      name: i.name || i.title || "Producto",
      quantity: i.quantity || 1,
      price: Number(i.price || i.unit_price || 0),
    })),
    direccion: data.delivery_address || data.address || data.direccion || "",
    telefono: data.customer?.phone || data.phone || "",
    nota: data.instructions || data.nota || "",
    metodo_pago: "tarjeta",
    tipo: "delivery",
    provider: "rappi",
    providerOrderId: data.id || data.order_id,
  };
}

function normalizePedidosYa(data: any) {
  return {
    id: data.id || data.order_id,
    cliente: data.delivery?.customer?.name || data.cliente || "Cliente PedidosYa",
    items: (data.items || []).map((i: any) => ({
      productId: i.id || i.product_id,
      name: i.name || i.title || "Producto",
      quantity: i.quantity || 1,
      price: Number(i.price || i.unit_price || 0),
    })),
    direccion: data.delivery?.address || data.address || data.direccion || "",
    telefono: data.delivery?.customer?.phone || data.phone || "",
    nota: data.instructions || data.nota || "",
    metodo_pago: "tarjeta",
    tipo: "delivery",
    provider: "pedidos_ya",
    providerOrderId: data.id || data.order_id,
  };
}

function normalizeUber(data: any) {
  return {
    id: data.id || data.order_id || data.display_id,
    cliente: data.delivery?.customer?.name || data.customer_name || "Cliente Uber",
    items: (data.items || data.cart?.items || []).map((i: any) => ({
      productId: i.id || i.product_id,
      name: i.title || i.name || i.product_name,
      quantity: i.quantity || 1,
      price: Number(i.price_amount || i.price || i.unit_price || 0),
    })),
    direccion: data.delivery?.location?.address || data.address || data.direccion || "",
    telefono: data.delivery?.customer?.phone || data.phone || "",
    nota: data.instructions || data.nota || "",
    metodo_pago: "tarjeta",
    tipo: "delivery",
    provider: "uber_eats",
    providerOrderId: data.id || data.order_id,
  };
}

const NORMALIZERS: Record<string, (data: any) => any> = {
  rappi: normalizeRappi,
  pedidos_ya: normalizePedidosYa,
  pedidosya: normalizePedidosYa,
  uber: normalizeUber,
  uber_eats: normalizeUber,
};

export function normalizeProviderOrder(provider: string, payload: any): any | null {
  const data = payload.order || payload;
  const normalizer = NORMALIZERS[provider];
  if (normalizer) return normalizer(data);

  // Unknown provider — try generic shape
  if (data.items || data.cliente) {
    return {
      ...data,
      provider,
      providerOrderId: data.providerOrderId || data.id,
    };
  }
  return null;
}

// ── Persistence ───────────────────────────────────────

async function processWebhookOrder(
  provider: string,
  branchId: string,
  normalized: any,
  _dedupKey: string,
): Promise<void> {
  try {
    const {
      ref: fbRef, child: fbChild, push: fbPush,
      set: fbSet, initFirebase,
    } = await import("../lib/firebase.js");
    const db = initFirebase();
    const ordersRef = fbChild(fbRef(db), `branches/${branchId}/orders`);
    const newRef = fbPush(ordersRef);
    const timestamp = new Date().toISOString();
    const subtotal = normalized.items.reduce(
      (s: number, i: any) => s + (i.price || 0) * (i.quantity || 1),
      0,
    );
    const phoneRaw = normalized.telefono || "";
    const order = {
      id: newRef.key,
      items: normalized.items,
      cliente: normalized.cliente || "Delivery",
      direccion: normalized.direccion || "",
      telefono: phoneRaw,
      phone: phoneRaw, // ponytail: duplicado para orderNotifier que lee .phone
      nota: normalized.nota || "",
      metodo_pago: normalized.metodo_pago || "tarjeta",
      tipo: "delivery",
      deliveryFee: 0,
      subtotal,
      total: subtotal,
      status: "recibido",
      provider: normalized.provider || provider,
      providerOrderId: normalized.providerOrderId || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const phone = order.telefono?.replace(/\s+/g, "").trim();
    if (phone) {
      await fbSet(fbChild(fbRef(db), `branches/${branchId}/customer_orders/${phone}/${newRef.key}`), true);
    }
    await fbSet(newRef, order);
    logger.info(
      `📦 Webhook [${provider}]: Pedido #${newRef.key} — ${order.cliente} — S/ ${order.total.toFixed(2)}`,
    );
  } catch (e: any) {
    logger.error(`❌ Webhook error [${provider}]:`, e);
  }
}

// ── Public API ────────────────────────────────────────

export interface WebhookResult {
  success: boolean;
  dedup?: boolean;
  error?: string;
}

/**
 * Handle an incoming webhook from a delivery platform.
 *
 * - Validates the branch ID
 * - Normalizes the payload per provider
 * - Deduplicates by provider + order ID
 * - Persists to Firebase (async, non-blocking)
 *
 * Returns a synchronous result for the HTTP response.
 */
export async function handleWebhook(
  provider: string,
  branchId: string,
  payload: any,
): Promise<WebhookResult> {
  // Validate branch
  const knownBranches =
    getAllBranchIds().length > 0 ? getAllBranchIds() : ["default"];
  if (!knownBranches.includes(branchId)) {
    return { success: false, error: `Sucursal "${branchId}" no válida para webhook` };
  }

  // Normalize
  const normalized = normalizeProviderOrder(provider, payload);
  if (!normalized) {
    return { success: false, error: "Payload no reconocido" };
  }

  // Dedup
  const dedupKey = `${provider}:${normalized.providerOrderId || JSON.stringify(normalized.items)}`;
  if (webhookDedup.has(dedupKey)) {
    logger.info(`Webhook [${provider}]: duplicado ignorado`);
    return { success: true, dedup: true };
  }
  webhookDedup.set(dedupKey, Date.now());

  // Process async (fire-and-forget)
  processWebhookOrder(provider, branchId, normalized, dedupKey);

  return { success: true };
}
