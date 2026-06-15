/**
 * Staff MCP Tools — employee & attendance queries for the agent.
 *
 * These tools let the agent know who's working, their roles, and contact info.
 * Reads from branches/{branchId}/employees/ and branches/{branchId}/attendance/
 */

import { initFirebase, ref, get, child } from "../../lib/firebase.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

// ── Helpers ─────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayNameInSpanish(): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[new Date().getDay()];
}

interface EmployeeInfo {
  id: string;
  nombre: string;
  rol: string;
  telefono: string;
  email: string;
  activo: boolean;
  horarioHoy: string | null;
  enTurno: boolean;
  fichado: boolean;
  fichadoDesde: string | null;
}

// ── TOOLS ───────────────────────────────────────────────

export const staffTools: MCPTool[] = [
  // ── 1. Consultar staff (empleados activos + estado) ──
  {
    name: "consultar_staff",
    description:
      "Lista todos los empleados activos de una sucursal con su rol, teléfono, horario de hoy, " +
      "y si ya ficharon entrada (están trabajando). Ideal para saber quién está disponible, " +
      "contactar a un mozo o cocinero, o ver la cobertura del turno actual.",
    parameters: {
      sucursal: {
        type: "string",
        description: "ID de sucursal. Opcional, usa la actual por defecto.",
      },
      rol: {
        type: "string",
        description: "Filtrar por rol específico: 'mozo', 'cocinero', 'cajero', 'admin'. Opcional.",
      },
      solo_en_turno: {
        type: "string",
        description: "Si es 'true', solo muestra empleados cuyo horario de hoy incluye la hora actual. Opcional.",
      },
    },
    async execute(args, branchId) {
      try {
        const branch = String(args.sucursal || branchId);
        const rolFilter = String(args.rol || "").trim().toLowerCase();
        const soloEnTurno = String(args.solo_en_turno || "") === "true";
        const today = dayNameInSpanish();

        const snap = await get(child(ref(db), `branches/${branch}/employees`));
        if (!snap.exists()) {
          return { success: true, message: "No hay empleados registrados en esta sucursal.", data: [] };
        }

        const employees = snap.val() as Record<string, any>;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Fetch today's attendance for all employees
        const attSnap = await get(child(ref(db), `branches/${branch}/attendance`));
        const allAttendance = attSnap.exists() ? (attSnap.val() as Record<string, any>) : {};
        const todayAttendances = allAttendance
          ? Object.fromEntries(
              Object.entries(allAttendance).map(([empId, dates]) => [
                empId,
                (dates as Record<string, any>)[todayStr()] || null,
              ]),
            )
          : {};

        const staff: EmployeeInfo[] = [];

        for (const [id, emp] of Object.entries(employees)) {
          if (emp.active === false) continue;
          if (rolFilter && (emp.role || "").toLowerCase() !== rolFilter) continue;

          // Check today's schedule
          const schedule = emp.schedule?.[today];
          let horarioHoy: string | null = null;
          let enTurno = false;

          if (schedule?.active && schedule?.start && schedule?.end) {
            horarioHoy = `${schedule.start} - ${schedule.end}`;
            const [startH, startM] = schedule.start.split(":").map(Number);
            const [endH, endM] = schedule.end.split(":").map(Number);
            const startMin = startH * 60 + startM;
            const endMin = endH * 60 + endM;
            enTurno = currentMinutes >= startMin && currentMinutes <= endMin;
          }

          // Check if clocked in today
          const attRecord = todayAttendances[id];
          const fichado = !!attRecord?.clockIn && !attRecord?.clockOut;
          const fichadoDesde = attRecord?.clockIn || null;

          if (soloEnTurno && !enTurno) continue;

          staff.push({
            id: id.slice(-6).toUpperCase(),
            nombre: emp.name || "—",
            rol: emp.role || "—",
            telefono: emp.phone || "—",
            email: emp.email || "—",
            activo: true,
            horarioHoy,
            enTurno,
            fichado,
            fichadoDesde,
          });
        }

        // Sort: en turno + fichados first
        staff.sort((a, b) => {
          const scoreA = (a.enTurno ? 2 : 0) + (a.fichado ? 1 : 0);
          const scoreB = (b.enTurno ? 2 : 0) + (b.fichado ? 1 : 0);
          return scoreB - scoreA;
        });

        const enTurnoCount = staff.filter((s) => s.enTurno).length;
        const fichadosCount = staff.filter((s) => s.fichado).length;

        let msg = `👥 *Staff — ${branch}*\n\n`;
        msg += `Total activos: ${staff.length}\n`;
        msg += `En turno ahora: ${enTurnoCount}\n`;
        msg += `Fichados (trabajando): ${fichadosCount}\n\n`;

        for (const s of staff) {
          const badges = [];
          if (s.enTurno) badges.push("🟢 en turno");
          if (s.fichado) badges.push("🔵 trabajando");
          const badge = badges.length > 0 ? ` _(${badges.join(", ")})_` : "";
          msg += `• *${s.nombre}* — ${s.rol}${badge}\n`;
          msg += `  📞 ${s.telefono}  📧 ${s.email}\n`;
          msg += `  🕐 ${s.horarioHoy || "—"}`;
          if (s.fichadoDesde) {
            const desde = new Date(s.fichadoDesde).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
            msg += `  ▶️ desde ${desde}`;
          }
          msg += "\n\n";
        }

        return {
          success: true,
          data: staff,
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al consultar staff: ${e.message}` };
      }
    },
  },
];
