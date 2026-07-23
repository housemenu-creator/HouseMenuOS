import { initFirebase, ref, get, child, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";
import { getAllBranchIds } from "../../lib/branch.js";

const db = initFirebase();

export const branchTools: MCPTool[] = [
  {
    name: "ver_sucursales",
    description: "Muestra todas las sucursales disponibles del restaurante",
    parameters: {},
    async execute(_args, branchId) {
      const ids = getAllBranchIds();
      const lines: string[] = ["🏪 *Sucursales disponibles:*\n"];
      for (const id of ids) {
        const snap = await get(child(ref(db), `branches_config/${id}`));
        const info = snap.exists() ? snap.val() : {};
        lines.push(`• *${info.name || id}*`);
        if (info.address) lines.push(`  📍 ${info.address}`);
        if (info.phone) lines.push(`  📞 ${info.phone}`);
        if (info.schedule) lines.push(`  🕐 ${info.schedule}`);
        lines.push(id === branchId ? "  ✅ *Sucursal actual*" : "");
        lines.push("");
      }
      return { success: true, data: { sucursales: ids }, message: lines.filter(Boolean).join("\n").trim() };
    },
  },
  {
    name: "info_restaurante",
    description: "Muestra la información del restaurante: nombre, dirección, horario, teléfono y configuración de delivery",
    parameters: {
      sucursal: { type: "string", description: "ID de sucursal (opcional, default la actual)" },
    },
    async execute(args, branchId) {
      try {
        const bid = String(args.sucursal || branchId);
        const snapshot = await get(child(ref(db), `branches_config/${bid}`));
        if (!snapshot.exists()) return { success: false, error: "No hay información del restaurante disponible." };

        const info = snapshot.val();

        let msg = `🏪 *${info.name || "Restaurante"}*\n`;
        if (info.address) msg += `📍 ${info.address}\n`;
        if (info.phone) msg += `📞 ${info.phone}\n`;
        if (info.schedule) msg += `🕐 ${info.schedule}\n`;

        if (info.deliveryEnabled) {
          msg += `\n🚚 *Delivery*\n`;
          msg += `Costo: S/ ${Number(info.deliveryFee || 0).toFixed(2)}\n`;
          if (info.freeThreshold > 0) {
            msg += `Gratis desde S/ ${Number(info.freeThreshold).toFixed(2)}\n`;
          }
        }

        return { success: true, data: info, message: msg.trim() };
      } catch (e: any) {
        return { success: false, error: `Error al obtener información: ${e.message}` };
      }
    },
  },
  {
    name: "actualizar_horario",
    description: "Cambia el horario de atención del restaurante",
    parameters: {
      horario: { type: "string", description: "Nuevo horario, ej: \"Lun-Sáb 12:00-22:00, Dom 14:00-21:00\"" },
    },
    async execute(args, branchId) {
      try {
        await update(child(ref(db), `branches_config/${branchId}`), {
          schedule: String(args.horario || ""),
        });
        return { success: true, message: `Horario actualizado: ${args.horario}` };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar horario: ${e.message}` };
      }
    },
  },
  {
    name: "actualizar_delivery",
    description: "Actualiza la configuración de delivery del restaurante (costo y monto para delivery gratis)",
    parameters: {
      costo: { type: "string", description: "Nuevo costo de delivery en soles, ej: \"8.00\" (opcional)" },
      free_threshold: { type: "string", description: "Monto mínimo para delivery gratis, ej: \"60\" (opcional)" },
      activo: { type: "string", description: "\"si\" o \"no\" para activar/desactivar delivery (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const updates: Record<string, any> = {};
        if (args.costo) updates.deliveryFee = parseFloat(String(args.costo));
        if (args.free_threshold) updates.freeThreshold = parseFloat(String(args.free_threshold));
        if (args.activo) updates.deliveryEnabled = String(args.activo).toLowerCase() === "si";

        await update(child(ref(db), `branches_config/${branchId}`), updates);

        let msg = "✅ Configuración de delivery actualizada:\n";
        if (updates.deliveryFee !== undefined) msg += `• Costo: S/ ${updates.deliveryFee.toFixed(2)}\n`;
        if (updates.freeThreshold !== undefined) msg += `• Delivery gratis desde S/ ${updates.freeThreshold.toFixed(2)}\n`;
        if (updates.deliveryEnabled !== undefined) msg += `• Delivery: ${updates.deliveryEnabled ? "activado" : "desactivado"}\n`;

        return { success: true, message: msg.trim() };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar delivery: ${e.message}` };
      }
    },
  },
];
