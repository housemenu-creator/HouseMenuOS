import { initFirebase, ref, get, child, set, push, update } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

const branchRef = (branchId: string) => `branches_config/${branchId}`;
const ordersRef = (branchId: string) => `branches/${branchId}/orders`;
const sessionsRef = (branchId: string) => `branches/${branchId}/caja/sessions`;

export const cajaTools: MCPTool[] = [
  {
    name: "resumen_dia",
    description: "Muestra el resumen de ventas del día actual o de una fecha específica, incluyendo totales por método de pago",
    parameters: {
      fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD (opcional, default hoy)" },
    },
    async execute(args, branchId) {
      try {
        const fecha = String(args.fecha || new Date().toISOString().split("T")[0]);
        const snap = await get(child(ref(db), ordersRef(branchId)));
        if (!snap.exists()) return { success: true, message: "No hay pedidos registrados." };

        const orders = Object.values(snap.val()) as any[];
        const delDia = orders.filter((o: any) => {
          const d = (o.createdAt || "").split("T")[0];
          return d === fecha && o.status !== "cancelado";
        });

        if (delDia.length === 0) return { success: true, message: `No hubo ventas el ${fecha}.` };

        const total = delDia.reduce((s, o) => s + Number(o.total || 0), 0);
        const metodos: Record<string, number> = {};
        for (const o of delDia) {
          const mp = o.metodo_pago || "efectivo";
          metodos[mp] = (metodos[mp] || 0) + Number(o.total || 0);
        }

        let msg = `📊 *RESUMEN — ${fecha}*\n\n`;
        msg += `Pedidos: ${delDia.length}\n`;
        msg += `Total: S/ ${total.toFixed(2)}\n\n`;
        msg += `💳 *Por método de pago:*\n`;
        for (const [mp, monto] of Object.entries(metodos)) {
          msg += `  • ${mp}: S/ ${monto.toFixed(2)}\n`;
        }

        return { success: true, data: { fecha, pedidos: delDia.length, total, metodos }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al obtener resumen: ${e.message}` };
      }
    },
  },
  {
    name: "abrir_turno",
    description: "Abre un nuevo turno de caja con un monto inicial",
    parameters: {
      monto_inicial: { type: "string", description: "Monto inicial en la caja, ej: \"200.00\"" },
      encargado: { type: "string", description: "Nombre del encargado que abre el turno" },
    },
    async execute(args, branchId) {
      try {
        const sessionsSnap = await get(child(ref(db), sessionsRef(branchId)));
        if (sessionsSnap.exists()) {
          const sessions = sessionsSnap.val() as Record<string, any>;
          const open = Object.entries(sessions).find(([, s]) => s.status === "open" || !s.closeTime);
          if (open) return { success: false, error: `Ya hay un turno abierto desde ${open[1].openTime || "antes"}. Ciérralo primero.` };
        }

        const monto = parseFloat(String(args.monto_inicial || "0"));
        const newRef = push(child(ref(db), sessionsRef(branchId)));
        await set(newRef, {
          openTime: new Date().toISOString(),
          initialAmount: monto,
          openedBy: String(args.encargado || "Cajero"),
          status: "open",
        });
        return { success: true, message: `💰 Turno de caja abierto — S/ ${monto.toFixed(2)} inicial (${args.encargado})` };
      } catch (e: any) {
        return { success: false, error: `Error al abrir turno: ${e.message}` };
      }
    },
  },
  {
    name: "cerrar_turno",
    description: "Cierra el turno de caja actual, registrando el monto final y calculando las ventas del turno",
    parameters: {
      monto_final: { type: "string", description: "Monto final contado en caja, ej: \"850.00\"" },
      observaciones: { type: "string", description: "Observaciones sobre el turno (opcional)" },
    },
    async execute(args, branchId) {
      try {
        const sessionsSnap = await get(child(ref(db), sessionsRef(branchId)));
        if (!sessionsSnap.exists()) return { success: false, error: "No hay turnos registrados" };
        const sessions = sessionsSnap.val() as Record<string, any>;
        const openEntry = Object.entries(sessions).find(([, s]) => s.status === "open" || !s.closeTime);
        if (!openEntry) return { success: false, error: "No hay ningún turno abierto" };

        const [sessionId, session] = openEntry;
        const montoFinal = parseFloat(String(args.monto_final || "0"));

        // Calculate sales during this session
        const ordersSnap = await get(child(ref(db), ordersRef(branchId)));
        let ventas = 0;
        if (ordersSnap.exists()) {
          const orders = Object.values(ordersSnap.val()) as any[];
          const openTime = new Date(session.openTime).getTime();
          ventas = orders
            .filter((o: any) => {
              const createdAt = o.createdAt ? new Date(o.createdAt).getTime() : 0;
              return createdAt >= openTime && o.status !== "cancelado";
            })
            .reduce((s, o) => s + Number(o.total || 0), 0);
        }

        const diferencia = montoFinal - session.initialAmount - ventas;

        await update(child(ref(db), `${sessionsRef(branchId)}/${sessionId}`), {
          closeTime: new Date().toISOString(),
          finalAmount: montoFinal,
          salesAmount: ventas,
          difference: diferencia,
          observations: String(args.observaciones || ""),
          status: "closed",
        });

        let msg = `🧾 *TURNO CERRADO*\n\n`;
        msg += `Apertura: S/ ${Number(session.initialAmount).toFixed(2)}\n`;
        msg += `Ventas: S/ ${ventas.toFixed(2)}\n`;
        msg += `Esperado: S/ ${(session.initialAmount + ventas).toFixed(2)}\n`;
        msg += `Final: S/ ${montoFinal.toFixed(2)}\n`;
        msg += `Diferencia: ${diferencia >= 0 ? "+" : ""}S/ ${diferencia.toFixed(2)}`;

        return { success: true, data: { sessionId, initialAmount: session.initialAmount, ventas, finalAmount: montoFinal, diferencia }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al cerrar turno: ${e.message}` };
      }
    },
  },
  {
    name: "ventas_por_metodo",
    description: "Muestra el desglose de ventas agrupadas por método de pago en un rango de fechas",
    parameters: {
      desde: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD (opcional, default hoy)" },
      hasta: { type: "string", description: "Fecha fin en formato YYYY-MM-DD (opcional, default hoy)" },
    },
    async execute(args, branchId) {
      try {
        const desde = String(args.desde || new Date().toISOString().split("T")[0]);
        const hasta = String(args.hasta || desde);

        const snap = await get(child(ref(db), ordersRef(branchId)));
        if (!snap.exists()) return { success: true, message: "No hay pedidos registrados." };

        const orders = Object.values(snap.val()) as any[];
        const filtradas = orders.filter((o: any) => {
          const d = (o.createdAt || "").split("T")[0];
          return d >= desde && d <= hasta && o.status !== "cancelado";
        });

        if (filtradas.length === 0) return { success: true, message: `No hay ventas entre ${desde} y ${hasta}.` };

        const metodos: Record<string, { cantidad: number; total: number }> = {};
        for (const o of filtradas) {
          const mp = o.metodo_pago || "efectivo";
          if (!metodos[mp]) metodos[mp] = { cantidad: 0, total: 0 };
          metodos[mp].cantidad++;
          metodos[mp].total += Number(o.total || 0);
        }

        const totalGeneral = Object.values(metodos).reduce((s, m) => s + m.total, 0);
        let msg = `💳 *VENTAS POR MÉTODO DE PAGO*\n`;
        msg += `${desde} → ${hasta}\n\n`;

        for (const [mp, data] of Object.entries(metodos)) {
          const pct = ((data.total / totalGeneral) * 100).toFixed(1);
          msg += `• ${mp}: S/ ${data.total.toFixed(2)} (${data.cantidad} pedidos, ${pct}%)\n`;
        }
        msg += `\nTotal: S/ ${totalGeneral.toFixed(2)}`;

        return { success: true, data: { desde, hasta, metodos, total: totalGeneral }, message: msg };
      } catch (e: any) {
        return { success: false, error: `Error al obtener ventas: ${e.message}` };
      }
    },
  },
];
