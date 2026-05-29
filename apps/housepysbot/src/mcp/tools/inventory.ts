import { initFirebase, ref, get, child, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const catPath = (branchId: string) => `branches/${branchId}/catalog`;

export const inventoryTools: MCPTool[] = [
  {
    name: "ver_stock",
    description: "Muestra los niveles de stock actuales de todos los productos que tienen control de inventario",
    parameters: {},
    async execute(_args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${catPath(branchId)}/products`));
        if (!snapshot.exists()) return { success: false, error: "No hay información de inventario" };
        const products = Object.values(snapshot.val()) as any[];
        const tracked = products.filter((p: any) => p.trackStock === true);

        if (tracked.length === 0) return { success: true, message: "Ningún producto tiene control de stock activado." };

        const lines = tracked.map((p: any) => {
          const stock = Number(p.stock || 0);
          const icon = stock <= 0 ? "🔴" : stock <= 5 ? "🟡" : "🟢";
          return `${icon} ${p.name}: ${stock} unidades`;
        });
        return { success: true, data: tracked, message: `📦 *INVENTARIO*\n\n${lines.join("\n")}` };
      } catch (e: any) {
        return { success: false, error: `Error al consultar stock: ${e.message}` };
      }
    },
  },
  {
    name: "ajustar_stock",
    description: "Ajusta (incrementa o decrementa) el stock de un producto con control de inventario",
    parameters: {
      nombre: { type: "string", description: "Nombre del producto" },
      cantidad: { type: "string", description: "Cantidad a ajustar. Usar número positivo para agregar stock, negativo para reducir. Ej: \"-5\" para reducir 5 unidades" },
      motivo: { type: "string", description: "Motivo del ajuste, ej: \"compra a proveedor\", \"rotura\", \"inventario\" (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${catPath(branchId)}/products`));
        if (!snapshot.exists()) return { success: false, error: "No hay información de productos" };
        const products = snapshot.val() as Record<string, any>;
        const q = String(args.nombre || "").toLowerCase();

        const entry = Object.entries(products).find(([, p]) => p.name?.toLowerCase().includes(q));
        if (!entry) return { success: false, error: `No encontré "${args.nombre}" en el menú` };

        const [prodId, prod] = entry;
        const cantidad = parseInt(String(args.cantidad || "0"));
        if (isNaN(cantidad) || cantidad === 0) return { success: false, error: "Cantidad inválida" };

        const currentStock = Number(prod.stock || 0);
        const newStock = Math.max(0, currentStock + cantidad);

        const updates: Record<string, any> = { stock: newStock };
        if (newStock <= 0) updates.available = false;
        else if (currentStock <= 0 && newStock > 0) updates.available = true;

        await update(child(ref(db), `${catPath(branchId)}/products/${prodId}`), updates);

        const direction = cantidad > 0 ? "agregaron" : "redujeron";
        const motivo = args.motivo ? ` (${args.motivo})` : "";
        return { success: true, message: `Stock de "${prod.name}": ${currentStock} → ${newStock} (se ${direction} ${Math.abs(cantidad)}${motivo})` };
      } catch (e: any) {
        return { success: false, error: `Error al ajustar stock: ${e.message}` };
      }
    },
  },
  {
    name: "alertas_stock_bajo",
    description: "Muestra los productos con stock por debajo de un umbral",
    parameters: {
      limite: { type: "string", description: "Umbral mínimo de stock para la alerta. Ej: \"10\" (opcional, default 5)" },
    },
    async execute(args, branchId) {
      try {
        const snapshot = await get(child(ref(db), `${catPath(branchId)}/products`));
        if (!snapshot.exists()) return { success: false, error: "No hay información de inventario" };

        const limite = parseInt(String(args.limite || "5"));
        const products = Object.values(snapshot.val()) as any[];
        const tracked = products.filter((p: any) => p.trackStock === true);
        const bajos = tracked.filter((p: any) => Number(p.stock || 0) <= limite);

        if (bajos.length === 0) return { success: true, message: `✅ Todos los productos tienen stock mayor a ${limite}.` };

        const lines = bajos.map((p: any) => `🔴 ${p.name}: ${Number(p.stock || 0)} unidades`);
        return {
          success: true,
          data: bajos,
          message: `⚠️ *STOCK BAJO* (≤ ${limite})\n\n${lines.join("\n")}`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al consultar alertas: ${e.message}` };
      }
    },
  },
];
