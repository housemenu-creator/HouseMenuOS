import { initFirebase, ref, get, child, push, set, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const delPath = (branchId: string) => `branches/${branchId}/delivery`;

export const deliveryTools: MCPTool[] = [
  {
    name: "calcular_costo_zona",
    description: "Calcula el costo de delivery para una dirección, determinando la zona automáticamente",
    parameters: {
      direccion: { type: "string", description: "Dirección de entrega" },
      subtotal: { type: "string", description: "Subtotal del pedido para calcular si aplica free threshold (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const zonesSnap = await get(child(ref(db), `${delPath(branchId)}/zones`));
        if (!zonesSnap.exists()) return { success: false, error: "No hay zonas de delivery configuradas" };
        const zones = Object.values(zonesSnap.val()) as any[];
        const activeZones = zones.filter((z: any) => z.active !== false);

        if (activeZones.length === 0) return { success: false, error: "No hay zonas activas de delivery" };

        const direccion = String(args.direccion || "").toLowerCase();
        let matchedZone: any = null;

        for (const zone of activeZones) {
          const keywords = (zone.keywords || zone.name || "").toLowerCase().split(",");
          for (const kw of keywords) {
            if (direccion.includes(kw.trim())) { matchedZone = zone; break; }
          }
          if (matchedZone) break;
        }

        const zone = matchedZone || activeZones[0];
        const fee = Number(zone.fee) || 0;
        const freeThreshold = zone.freeThreshold != null ? Number(zone.freeThreshold) : null;
        const subtotal = parseFloat(String(args.subtotal || "0"));
        const freeAplica = freeThreshold && freeThreshold > 0 && subtotal >= freeThreshold;
        const finalFee = freeAplica ? 0 : fee;

        let msg = `📍 Zona: ${zone.name}\n`;
        msg += `Costo delivery: S/ ${fee.toFixed(2)}`;
        if (freeAplica) msg += ` → S/ 0.00 (pedido >= S/ ${freeThreshold.toFixed(2)})`;
        if (zone.estimatedMinutes) msg += `\n⏱ Tiempo estimado: ${zone.estimatedMinutes} min`;

        return { success: true, data: { zone: zone.name, fee: finalFee, originalFee: fee, estimatedMinutes: zone.estimatedMinutes }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al calcular costo: ${e.message}` };
      }
    },
  },
  {
    name: "ver_repartidores",
    description: "Lista los repartidores (drivers) disponibles y ocupados",
    parameters: {},
    async execute(_args, branchId) {
      try {
        const snap = await get(child(ref(db), `${delPath(branchId)}/drivers`));
        if (!snap.exists()) return { success: true, message: "No hay repartidores registrados." };

        const drivers = Object.values(snap.val()) as any[];
        const available = drivers.filter((d: any) => d.available !== false && d.active !== false);
        const busy = drivers.filter((d: any) => d.available === false && d.active !== false);

        let msg = "🟢 *DISPONIBLES*\n";
        msg += available.length === 0 ? "  (ninguno)\n" : available.map((d: any) => `  • ${d.name} — ${d.vehicle || "Moto"}`).join("\n") + "\n";
        if (busy.length > 0) {
          msg += "\n🔴 *OCUPADOS*\n";
          msg += busy.map((d: any) => `  • ${d.name} — ${d.totalDeliveries || 0} entregas`).join("\n");
        }

        return { success: true, data: { available, busy }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al listar repartidores: ${e.message}` };
      }
    },
  },
  {
    name: "asignar_repartidor",
    description: "Asigna un repartidor a un pedido para delivery",
    parameters: {
      pedido_id: { type: "string", description: "ID del pedido a asignar" },
      repartidor_nombre: { type: "string", description: "Nombre del repartidor" },
    },
    async execute(args, branchId) {
      try {
        const driversSnap = await get(child(ref(db), `${delPath(branchId)}/drivers`));
        if (!driversSnap.exists()) return { success: false, error: "No hay repartidores registrados" };

        const drivers = driversSnap.val() as Record<string, any>;
        const q = String(args.repartidor_nombre || "").toLowerCase();
        const entry = Object.entries(drivers).find(([, d]) => d.name?.toLowerCase().includes(q));
        if (!entry) return { success: false, error: `No encontré repartidor "${args.repartidor_nombre}"` };

        const [driverId, driver] = entry;
        const orderRef = child(ref(db), `branches/${branchId}/orders/${args.pedido_id}`);
        const orderSnap = await get(orderRef);
        if (!orderSnap.exists()) return { success: false, error: `No encontré el pedido "${args.pedido_id}"` };

        await update(orderRef, { driverId, driverName: driver.name, status: "en_camino", updatedAt: new Date().toISOString() });

        const logRef = push(child(ref(db), `${delPath(branchId)}/logs`));
        await set(logRef, { orderId: args.pedido_id, driverId, driverName: driver.name, assignedAt: new Date().toISOString(), status: "en_camino" });

        await update(child(ref(db), `${delPath(branchId)}/drivers/${driverId}`), { available: false });

        return { success: true, message: `✅ "${driver.name}" asignado al pedido #${args.pedido_id}` };
      } catch (e: any) {
        return { success: false, error: `Error al asignar repartidor: ${e.message}` };
      }
    },
  },
  {
    name: "crear_zona_delivery",
    description: "Crea una nueva zona de delivery con su costo y tiempo estimado",
    parameters: {
      nombre: { type: "string", description: "Nombre de la zona, ej: \"Centro\", \"Miraflores\"" },
      costo: { type: "string", description: "Costo de delivery en soles, ej: \"7.00\"" },
      tiempo_estimado: { type: "string", description: "Minutos estimados de entrega (opcional, default 30)" },
      keywords: { type: "string", description: "Palabras clave separadas por coma para identificar la dirección, ej: \"centro,plaza,av principal\" (opcional)" },
      free_threshold: { type: "string", description: "Monto mínimo para delivery gratis en esta zona, ej: \"50\" (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const costo = parseFloat(String(args.costo || "0"));
        if (isNaN(costo) || costo < 0) return { success: false, error: "Costo inválido" };

        const zonesRef = child(ref(db), `${delPath(branchId)}/zones`);
        const newRef = push(zonesRef);
        await set(newRef, {
          name: String(args.nombre || ""),
          fee: costo,
          estimatedMinutes: parseInt(String(args.tiempo_estimado || "30")),
          keywords: String(args.keywords || ""),
          freeThreshold: args.free_threshold ? parseFloat(String(args.free_threshold)) : null,
          active: true,
          createdAt: new Date().toISOString(),
        });
        return { success: true, message: `Zona "${args.nombre}" creada — S/ ${costo.toFixed(2)}` };
      } catch (e: any) {
        return { success: false, error: `Error al crear zona: ${e.message}` };
      }
    },
  },
  {
    name: "actualizar_zona_delivery",
    description: "Actualiza los datos de una zona de delivery existente",
    parameters: {
      nombre: { type: "string", description: "Nombre de la zona a modificar" },
      costo: { type: "string", description: "Nuevo costo de delivery (opcional)" },
      tiempo_estimado: { type: "string", description: "Nuevos minutos estimados (opcional)" },
      activo: { type: "string", description: "\"si\" o \"no\" para activar/desactivar la zona (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const zonesSnap = await get(child(ref(db), `${delPath(branchId)}/zones`));
        if (!zonesSnap.exists()) return { success: false, error: "No hay zonas configuradas" };
        const zones = zonesSnap.val() as Record<string, any>;
        const q = String(args.nombre || "").toLowerCase();
        const entry = Object.entries(zones).find(([, z]) => z.name?.toLowerCase().includes(q));
        if (!entry) return { success: false, error: `No encontré zona "${args.nombre}"` };

        const [zoneId] = entry;
        const updates: Record<string, any> = {};
        if (args.costo) updates.fee = parseFloat(String(args.costo));
        if (args.tiempo_estimado) updates.estimatedMinutes = parseInt(String(args.tiempo_estimado));
        if (args.activo) updates.active = String(args.activo).toLowerCase() === "si";

        await update(child(ref(db), `${delPath(branchId)}/zones/${zoneId}`), updates);
        return { success: true, message: `Zona "${args.nombre}" actualizada` };
      } catch (e: any) {
        return { success: false, error: `Error al actualizar zona: ${e.message}` };
      }
    },
  },
];
