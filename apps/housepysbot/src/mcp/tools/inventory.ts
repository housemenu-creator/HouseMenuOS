import { initFirebase, ref, get, child, push, set, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const catPath = (branchId: string) => `branches/${branchId}/catalog`;
const movPath = (branchId: string) => `branches/${branchId}/inventory/movements`;

// ── Helper: registrar movimiento con auditoría ─────────────
async function recordMovement(branchId: string, params: {
  productId: string;
  productName: string;
  tipo: string; // 'entrada' | 'salida' | 'ajuste' | 'devolucion' | 'inventario'
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  notas?: string;
  referencia?: string;
}): Promise<string> {
  const movRef = push(child(ref(db), movPath(branchId)));
  const movimiento = {
    id: movRef.key,
    productId: params.productId,
    productName: params.productName,
    tipo: params.tipo,
    cantidad: params.cantidad,
    stockAnterior: params.stockAnterior,
    stockNuevo: params.stockNuevo,
    motivo: params.motivo,
    notas: params.notas || "",
    referencia: params.referencia || "",
    creadoPor: "bot",
    createdAt: new Date().toISOString(),
  };
  await set(movRef, movimiento);
  return movRef.key!;
}

function dateRange(daysBack: number): { desde: string; hasta: string } {
  const hasta = new Date().toISOString().split("T")[0];
  const desde = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  return { desde, hasta };
}

const MOV_TYPE_LABELS: Record<string, string> = {
  entrada: "📥 Entrada",
  salida: "📤 Salida",
  ajuste: "🔧 Ajuste",
  devolucion: "🔄 Devolución",
  inventario: "📋 Inventario",
};

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

        // Registrar movimiento en el historial de auditoría
        const tipoMov = cantidad > 0 ? "entrada" : "salida";
        const motivo = String(args.motivo || (cantidad > 0 ? "Compra/reposición" : "Venta/consumo"));
        await recordMovement(branchId, {
          productId: prodId,
          productName: prod.name,
          tipo: tipoMov,
          cantidad,
          stockAnterior: currentStock,
          stockNuevo: newStock,
          motivo,
        });

        const direction = cantidad > 0 ? "agregaron" : "redujeron";
        const motivoMsg = args.motivo ? ` (${args.motivo})` : "";
        return { success: true, message: `Stock de "${prod.name}": ${currentStock} → ${newStock} (se ${direction} ${Math.abs(cantidad)}${motivoMsg})` };
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
  {
    name: "historial_movimientos",
    description: "Muestra el historial de movimientos de inventario con auditoría: entradas, salidas, ajustes. Filtrable por producto, tipo de movimiento y rango de fechas. Responde 'qué movimientos de inventario hubo', 'historial de stock', 'cuándo se ajustó el stock de X'.",
    parameters: {
      producto: { type: "string", description: "Nombre del producto para filtrar (opcional)" },
      tipo: { type: "string", description: "Tipo de movimiento: entrada, salida, ajuste, devolucion, inventario (opcional)" },
      desde: { type: "string", description: "Fecha inicio YYYY-MM-DD. Default: 30 días atrás" },
      limite: { type: "string", description: "Cantidad de movimientos a mostrar. Default: '20'" },
    },
    async execute(args, branchId) {
      try {
        const movSnap = await get(child(ref(db), movPath(branchId)));
        if (!movSnap.exists()) {
          return { success: true, message: "📭 No hay movimientos de inventario registrados aún." };
        }

        const movs = Object.values(movSnap.val()) as any[];
        const producto = String(args.producto || "").toLowerCase().trim();
        const tipo = String(args.tipo || "").toLowerCase().trim();
        const limite = parseInt(String(args.limite || "20"));

        // Date filter
        const r = dateRange(30);
        const desde = String(args.desde || r.desde);

        let filtered = movs.filter((m: any) => {
          if (tipo && m.tipo !== tipo) return false;
          if (producto && !(m.productName || "").toLowerCase().includes(producto)) return false;
          const fecha = (m.createdAt || "").split("T")[0];
          if (fecha < desde) return false;
          return true;
        });

        // Sort by date descending
        filtered.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        const total = filtered.length;
        filtered = filtered.slice(0, limite);

        if (filtered.length === 0) {
          return { success: true, message: "📭 No se encontraron movimientos con esos filtros." };
        }

        // Calculate summary
        const entradas = filtered.filter((m: any) => m.cantidad > 0).reduce((s: number, m: any) => s + m.cantidad, 0);
        const salidas = filtered.filter((m: any) => m.cantidad < 0).reduce((s: number, m: any) => s + Math.abs(m.cantidad), 0);

        let msg = `📋 *HISTORIAL DE MOVIMIENTOS*\n`;
        msg += `📆 ${desde} → hoy | Mostrando ${filtered.length} de ${total}\n\n`;
        if (entradas > 0) msg += `📥 Entradas: ${entradas} uds\n`;
        if (salidas > 0) msg += `📤 Salidas: ${salidas} uds\n\n`;

        for (const m of filtered) {
          const tipoLabel = MOV_TYPE_LABELS[m.tipo] || `📄 ${m.tipo}`;
          const cantStr = m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
          const fecha = m.createdAt ? new Date(m.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";
          msg += `${tipoLabel} *${m.productName}*: ${m.stockAnterior} → ${m.stockNuevo} (${cantStr})\n`;
          msg += `   📅 ${fecha} | ${m.motivo}\n`;
        }

        return {
          success: true,
          data: { total, movimientos: filtered, summary: { entradas, salidas } },
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al obtener historial: ${e.message}` };
      }
    },
  },
  {
    name: "registrar_movimiento",
    description: "Registra un movimiento manual de inventario con tipo y motivo. Crea un registro de auditoría. NO ajusta el stock automáticamente — para ajustar usá 'ajustar_stock'. Ideal para registrar conteos físicos, devoluciones, mermas.",
    parameters: {
      nombre: { type: "string", description: "Nombre del producto" },
      tipo: { type: "string", description: "Tipo: entrada, salida, ajuste, devolucion, inventario. Default: 'ajuste'" },
      cantidad: { type: "string", description: "Cantidad (número positivo). Ej: '10'" },
      motivo: { type: "string", description: "Motivo del movimiento. Ej: 'conteo físico', 'devolución cliente', 'merma'" },
      notas: { type: "string", description: "Notas adicionales (opcional)" },
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
        const cantidad = Math.abs(parseInt(String(args.cantidad || "0")));
        if (isNaN(cantidad) || cantidad === 0) return { success: false, error: "Cantidad inválida" };

        const tipo = String(args.tipo || "ajuste").toLowerCase();
        const tiposValidos = Object.keys(MOV_TYPE_LABELS);
        if (!tiposValidos.includes(tipo)) {
          return { success: false, error: `Tipo inválido: ${tipo}. Válidos: ${tiposValidos.join(", ")}` };
        }

        const currentStock = Number(prod.stock || 0);
        const motivo = String(args.motivo || "Registro manual");
        const notas = String(args.notas || "");

        await recordMovement(branchId, {
          productId: prodId,
          productName: prod.name,
          tipo,
          cantidad,
          stockAnterior: currentStock,
          stockNuevo: currentStock, // Solo registro, no cambia stock
          motivo,
          notas,
        });

        const tipoLabel = MOV_TYPE_LABELS[tipo];
        return {
          success: true,
          message: `✅ Movimiento registrado: ${tipoLabel} — ${prod.name}: ${cantidad} uds (${motivo})${notas ? ` — ${notas}` : ""}`,
        };
      } catch (e: any) {
        return { success: false, error: `Error al registrar movimiento: ${e.message}` };
      }
    },
  },
];
