/**
 * Notificaciones MCP Tools — send WhatsApp, Telegram, and generate coupons.
 *
 * These tools are used by the task executor to communicate with customers
 * and staff via automated campaigns.
 */

import { initFirebase, ref, push, get, child, set } from "../../lib/firebase.js";
import { sendWhatsAppMessage } from "../../bot/whatsapp.js";
import type { MCPTool } from "../registry.js";

const db = initFirebase();

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "PROMO-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── TOOLS ───────────────────────────────────────────────

export const notificationTools: MCPTool[] = [
  // ── 1. Send WhatsApp ────────────────────────────────
  {
    name: "enviar_whatsapp",
    description: "Envía un mensaje de WhatsApp a un número de teléfono. Usalo para notificar clientes, enviar promociones, confirmar pedidos o cualquier comunicación con el cliente.",
    parameters: {
      telefono: {
        type: "string",
        description: "Número de teléfono con código de país. Ej: '+51999888777' o '999888777'",
      },
      mensaje: {
        type: "string",
        description: "Texto del mensaje a enviar. Máximo 4096 caracteres.",
      },
    },
    async execute(args) {
      try {
        const telefono = String(args.telefono || "").trim();
        const mensaje = String(args.mensaje || "").trim();

        if (!telefono) return { success: false, error: "Falta el número de teléfono." };
        if (!mensaje) return { success: false, error: "Falta el mensaje a enviar." };

        const ok = await sendWhatsAppMessage(telefono, mensaje);
        if (ok) {
          return { success: true, message: `✅ Mensaje enviado a ${telefono}` };
        }
        return { success: false, error: "No se pudo enviar el mensaje. WhatsApp puede estar desconectado." };
      } catch (e: any) {
        return { success: false, error: `Error al enviar WhatsApp: ${e.message}` };
      }
    },
  },

  // ── 2. Send Telegram ─────────────────────────────────
  {
    name: "enviar_telegram",
    description: "Envía un mensaje a un chat de Telegram. Usalo para notificar al dueño, supervisores, o grupos internos sobre resultados de tareas, alertas o reportes.",
    parameters: {
      chat_id: {
        type: "string",
        description: "ID numérico del chat de Telegram (ej: '123456789'). Se obtiene del canal configurado en la tarea.",
      },
      mensaje: {
        type: "string",
        description: "Texto del mensaje. Soporta Markdown básico (*negrita*, _cursiva_, `código`).",
      },
    },
    async execute(args) {
      try {
        const chatId = String(args.chat_id || "").trim();
        const mensaje = String(args.mensaje || "").trim();
        const token = process.env.TELEGRAM_BOT_TOKEN;

        if (!chatId) return { success: false, error: "Falta el chat_id de Telegram." };
        if (!mensaje) return { success: false, error: "Falta el mensaje." };
        if (!token) return { success: false, error: "TELEGRAM_BOT_TOKEN no configurado." };

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: parseInt(chatId),
            text: mensaje,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        });

        const data = await res.json() as any;
        if (data.ok) {
          return { success: true, message: "✅ Mensaje enviado a Telegram." };
        }
        return { success: false, error: `Telegram error: ${data.description || "desconocido"}` };
      } catch (e: any) {
        return { success: false, error: `Error al enviar Telegram: ${e.message}` };
      }
    },
  },

  // ── 3. Generate coupon ───────────────────────────────
  {
    name: "generar_cupon",
    description: "Genera un código de cupón de descuento único. Lo guarda en el sistema y devuelve el código para usarlo en mensajes a clientes.",
    parameters: {
      descuento: {
        type: "string",
        description: "Valor del descuento. Ej: '10' para 10% o S/10 según el tipo.",
      },
      tipo: {
        type: "string",
        description: "'porcentaje' para descuento porcentual, 'monto_fijo' para descuento en soles.",
      },
      validez_dias: {
        type: "string",
        description: "Cantidad de días de validez del cupón. Default: '7'.",
      },
      cliente_telefono: {
        type: "string",
        description: "Teléfono del cliente asociado (opcional). Si se pasa, el cupón es de uso único para ese cliente.",
      },
    },
    async execute(args, branchId) {
      try {
        const descuento = String(args.descuento || "").trim();
        const tipo = String(args.tipo || "porcentaje").trim();
        const validezDias = parseInt(String(args.validez_dias || "7"));
        const clienteTel = String(args.cliente_telefono || "").trim();

        if (!descuento) return { success: false, error: "Falta el valor del descuento." };
        if (!["porcentaje", "monto_fijo"].includes(tipo)) {
          return { success: false, error: "Tipo debe ser 'porcentaje' o 'monto_fijo'." };
        }

        const code = generateCode();
        const cupon = {
          code,
          descuento: parseFloat(descuento),
          tipo,
          createdAt: Date.now(),
          expiresAt: Date.now() + validezDias * 86400000,
          usado: false,
          clienteTelefono: clienteTel || null,
          branchId,
        };

        // Save to Firebase
        await set(child(ref(db), `branches/${branchId}/cupones/${code}`), cupon);

        let msg = `🎟️ Cupón generado: *${code}*\n`;
        msg += tipo === "porcentaje"
          ? `   ${descuento}% de descuento`
          : `   S/ ${descuento}.00 de descuento`;
        msg += `\n   Válido por ${validezDias} días`;
        if (clienteTel) msg += `\n   Exclusivo para: ${clienteTel}`;

        return {
          success: true,
          data: cupon,
          message: msg,
        };
      } catch (e: any) {
        return { success: false, error: `Error al generar cupón: ${e.message}` };
      }
    },
  },
];
