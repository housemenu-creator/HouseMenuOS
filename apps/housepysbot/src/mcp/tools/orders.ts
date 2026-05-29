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

const or = (branchId: string) => `branches/${branchId}/orders`;

export const ordersTools: MCPTool[] = [
  {
    name: "crear_pedido",
    description: "Crea un nuevo pedido con productos del menú. Calcula automáticamente el costo de delivery según la zona si aplica.",
    parameters: {
      cliente: { type: "string", description: "Nombre del cliente" },
      items: { type: "string", description: "Lista de productos con cantidad, ej: \"2 Lomo Saltado, 1 Ceviche\"" },
      direccion: { type: "string", description: "Dirección de entrega (opcional, solo para delivery)" },
      telefono: { type: "string", description: "Teléfono del cliente (opcional)" },
      metodo_pago: { type: "string", description: "Método de pago: efectivo, tarjeta, yape, plin (opcional, default efectivo)" },
      nota: { type: "string", description: "Nota adicional para el pedido (opcional)" },
      tipo: { type: "string", description: "Tipo de pedido: delivery, recojo, mesa (opcional, default delivery)" },
    },
    async execute(args, branchId) {
      try {
        const catalogSnap = await get(child(ref(db), `branches/${branchId}/catalog/products`));
        if (!catalogSnap.exists()) return { success: false, error: "El menú no está disponible" };
        const products = catalogSnap.val() as Record<string, any>;

        const rawItems: string = String(args.items || "");
        const parsedItems: Array<{ productId: string; name: string; quantity: number; price: number }> = [];

        for (const part of rawItems.split(",")) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          const match = trimmed.match(/^(\d+)\s+(.+)/);
          const qty = match ? parseInt(match[1]) : 1;
          const searchName = match ? match[2].toLowerCase().trim() : trimmed.toLowerCase().trim();

          const found = Object.entries(products).find(
            ([, p]: [string, any]) => p.name?.toLowerCase().includes(searchName)
          );
          if (!found) return { success: false, error: `No encontré "${trimmed}" en el menú` };
          const [prodId, prod] = found as [string, any];
          parsedItems.push({ productId: prodId, name: prod.name, quantity: qty, price: Number(prod.base_price ?? prod.price ?? 0) });
        }

        if (parsedItems.length === 0) return { success: false, error: "No se pudo identificar ningún producto del menú" };

        const subtotal = parsedItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const tipo = String(args.tipo || "delivery");
        let deliveryFee = 0;
        let freeThreshold = 0;

        if (tipo === "delivery") {
          const branchSnap = await get(child(ref(db), `branches_config/${branchId}`));
          if (branchSnap.exists()) {
            const cfg = branchSnap.val();
            deliveryFee = Number(cfg.deliveryFee) || 0;
            freeThreshold = Number(cfg.freeThreshold) || 0;
          }
          if (freeThreshold > 0 && subtotal >= freeThreshold) deliveryFee = 0;
        }

        const ordersRef = child(ref(db), or(branchId));
        const newRef = push(ordersRef);
        const timestamp = new Date().toISOString();

        const order = {
          id: newRef.key,
          items: parsedItems,
          cliente: String(args.cliente || "Cliente"),
          direccion: String(args.direccion || ""),
          telefono: String(args.telefono || ""),
          metodo_pago: String(args.metodo_pago || "efectivo"),
          nota: String(args.nota || ""),
          tipo,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          status: "recibido",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await set(newRef, order);

        const feeNote = deliveryFee > 0 ? ` + S/ ${deliveryFee.toFixed(2)} delivery` : deliveryFee === 0 && tipo === "delivery" ? " (delivery gratis)" : "";
        return {
          success: true,
          data: { orderId: newRef.key, total: order.total },
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

        await update(child(ref(db), `${or(branchId)}/${args.id}`), {
          status: estado,
          updatedAt: new Date().toISOString(),
        });
        return { success: true, message: `Pedido #${args.id} actualizado a: ${STATUS_LABELS[estado] || estado}` };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar pedido: ${e.message}` };
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
          updatedAt: new Date().toISOString(),
        });
        return { success: true, message: `Pedido #${args.id} cancelado${args.motivo ? ` (${args.motivo})` : ""}` };
      } catch (e: any) {
        return { success: false, error: `Error al cancelar pedido: ${e.message}` };
      }
    },
  },
];
