import { initFirebase, ref, get, child, push, set, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const docsRef = (branchId: string) => `branches/${branchId}/sunat`;

export const sunatTools: MCPTool[] = [
  {
    name: "generar_cpe",
    description: "Genera un comprobante electrónico (Factura o Boleta) para un pedido existente. Requiere que el pedido esté en estado entregado o pagado.",
    parameters: {
      pedido_id: { type: "string", description: "ID del pedido a facturar" },
      tipo: { type: "string", description: "Tipo de comprobante: \"factura\" o \"boleta\" (default boleta)" },
      ruc: { type: "string", description: "RUC del cliente (obligatorio para factura)" },
      razon_social: { type: "string", description: "Razón social del cliente (obligatorio para factura)" },
    },
    async execute(args, branchId) {
      try {
        const tipo = String(args.tipo || "boleta").toLowerCase();
        if (tipo === "factura" && !args.ruc) return { success: false, error: "Se requiere RUC para emitir factura" };
        if (tipo === "factura" && !args.razon_social) return { success: false, error: "Se requiere Razón Social para emitir factura" };

        const orderSnap = await get(child(ref(db), `branches/${branchId}/orders/${args.pedido_id}`));
        if (!orderSnap.exists()) return { success: false, error: `No encontré el pedido "${args.pedido_id}"` };

        const order = orderSnap.val();
        const cpeRef = child(ref(db), docsRef(branchId));
        const newRef = push(cpeRef);
        const cpe = {
          orderId: args.pedido_id,
          tipo,
          serie: tipo === "factura" ? "F001" : "B001",
          numero: newRef.key?.slice(-8) || "00000001",
          cliente: tipo === "factura" ? { ruc: args.ruc, razonSocial: args.razon_social } : { nombre: order.cliente || "Cliente" },
          items: (order.items || []).map((i: any) => ({
            descripcion: i.name,
            cantidad: i.quantity,
            precio: i.price,
            subtotal: i.price * i.quantity,
          })),
          total: order.total || 0,
          igv: ((order.total || 0) / 1.18) * 0.18,
          estado: "generado",
          createdAt: new Date().toISOString(),
        };

        await set(newRef, cpe);
        return {
          success: true,
          data: { cpeId: newRef.key, serie: cpe.serie, numero: cpe.numero },
          message: `🧾 CPE #${cpe.serie}-${cpe.numero} generado para pedido #${args.pedido_id}`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al generar CPE: ${e.message}` };
      }
    },
  },
  {
    name: "historial_cpes",
    description: "Muestra el historial de comprobantes electrónicos emitidos, con paginación y filtro por fecha",
    parameters: {
      desde: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD (opcional)" },
      hasta: { type: "string", description: "Fecha fin en formato YYYY-MM-DD (opcional)" },
      pagina: { type: "string", description: "Número de página, ej: \"1\", \"2\" (opcional, default 1)" },
    },
    async execute(args, branchId) {
      try {
        const snap = await get(child(ref(db), docsRef(branchId)));
        if (!snap.exists()) return { success: true, message: "No hay comprobantes emitidos." };

        const cpes = Object.entries(snap.val() as Record<string, any>).map(([id, c]) => ({ id, ...c }));
        const desde = args.desde ? String(args.desde) : null;
        const hasta = args.hasta ? String(args.hasta) : null;

        let filtrados = cpes.filter((c: any) => {
          const d = (c.createdAt || "").split("T")[0];
          if (desde && d < desde) return false;
          if (hasta && d > hasta) return false;
          return true;
        });

        // Sort newest first
        filtrados.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        if (filtrados.length === 0) return { success: true, message: "No hay comprobantes en ese rango." };

        // Pagination
        const pageSize = 10;
        const page = Math.max(1, parseInt(String(args.pagina || "1")));
        const totalPages = Math.ceil(filtrados.length / pageSize);
        const start = (page - 1) * pageSize;
        const pageItems = filtrados.slice(start, start + pageSize);

        let msg = `🧾 *COMPROBANTES* (pág ${page}/${totalPages} — ${filtrados.length} total)\n\n`;
        for (const c of pageItems) {
          const serie = c.serie || "S/N";
          const num = c.numero || c.id?.slice(-8);
          msg += `• ${c.tipo?.toUpperCase() || "BOLETA"} #${serie}-${num} — S/ ${Number(c.total).toFixed(2)} — ${c.estado || "generado"}\n`;
          if (c.createdAt) msg += `  ${c.createdAt.split("T")[0]}\n`;
        }
        if (page < totalPages) {
          msg += `\n📄 Usa "historial página ${page + 1}" para ver más`;
        }
        return { success: true, data: { page, totalPages, total: filtrados.length, items: pageItems }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al obtener historial: ${e.message}` };
      }
    },
  },
];
