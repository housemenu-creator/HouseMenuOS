import { Telegraf } from "telegraf";
import { processMessage } from "../agent/index.js";
import { getHistory, pushHistory } from "../lib/session.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { routeTelegram } from "../agents/router.js";

export function createBot(token: string, branchId: string) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId === "admin") {
      await ctx.reply(
        [
          "👔 *HousePySbot Admin*",
          "",
          "Bienvenido, administrador. Puedes gestionar el restaurante desde aquí.",
          "",
          "Comandos:",
          "📊 */resumen* — Ventas del día",
          "💰 */turno abrir [monto]* — Abrir caja",
          "💰 */turno cerrar [monto]* — Cerrar caja",
          "🍽 */menu* — Ver menú completo",
          "📦 */stock* — Ver niveles de stock",
          "",
          "O solo escríbeme lo que necesites.",
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(
        [
          "¡Bienvenido a *HousePySbot*! 🎉",
          "",
          "Soy el asistente virtual del restaurante.",
          "",
          "Puedes preguntarme:",
          "🍽 *Ver el menú* — \"qué tienen hoy?\"",
          "🔍 *Buscar platos* — \"tienen pizza?\"",
          "📋 *Estado de pedido* — \"/pedido ABC123\"",
          "",
          "¿En qué te ayudo?",
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
    }
  });

  bot.help(async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId === "admin") {
      await ctx.reply(
        [
          "Comandos Admin:",
          "/start — Iniciar",
          "/help — Esta ayuda",
          "/resumen — Ventas del día",
          "/turno — Estado de caja",
          "/menu — Ver menú completo",
          "/stock — Niveles de stock",
          "/pedido [ID] — Consultar pedido",
          "",
          "O solo escríbeme lo que necesites.",
        ].join("\n")
      );
    } else {
      await ctx.reply(
        [
          "Comandos:",
          "/start — Iniciar",
          "/help — Esta ayuda",
          "/menu — Ver menú completo",
          "/pedido [ID] — Consultar pedido",
          "",
          "O solo escríbeme lo que necesites.",
        ].join("\n")
      );
    }
  });

  bot.command("menu", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const res = await processMessage("Muéstrame el menú completo", branchId, [], agentId);
    await ctx.reply(res, { parse_mode: "Markdown" });
  });

  bot.command("pedido", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const id = ctx.message.text.split(" ").slice(1).join(" ");
    if (!id) {
      await ctx.reply("Usa: /pedido ID_DEL_PEDIDO");
      return;
    }
    const res = await processMessage(
      `Consulta el estado del pedido ${id}`,
      branchId,
      [],
      agentId
    );
    await ctx.reply(res, { parse_mode: "Markdown" });
  });

  bot.command("resumen", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") {
      await ctx.reply("Comando no disponible. Usa /menu para ver el menú.");
      return;
    }
    const res = await processMessage("Dame el resumen de ventas del día de hoy", branchId, [], "admin");
    await ctx.reply(res, { parse_mode: "Markdown" });
  });

  bot.command("stock", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") {
      await ctx.reply("Comando no disponible. Usa /menu para ver el menú.");
      return;
    }
    const res = await processMessage("Muéstrame el stock de todos los productos", branchId, [], "admin");
    await ctx.reply(res, { parse_mode: "Markdown" });
  });

  bot.command("turno", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") {
      await ctx.reply("Comando no disponible.");
      return;
    }
    const args = ctx.message.text.split(" ").slice(1);
    let prompt: string;
    if (args[0] === "abrir") {
      if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) <= 0) {
        await ctx.reply("Usa: /turno abrir [monto] — ej: /turno abrir 100");
        return;
      }
      prompt = `Abre un turno de caja con monto inicial de S/ ${args[1]}`;
    } else if (args[0] === "cerrar") {
      if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) <= 0) {
        await ctx.reply("Usa: /turno cerrar [monto] — ej: /turno cerrar 100");
        return;
      }
      prompt = `Cierra el turno de caja con monto final de S/ ${args[1]}`;
    } else {
      prompt = "Cuál es el estado actual de la caja?";
    }
    const res = await processMessage(prompt, branchId, [], "admin");
    await ctx.reply(res, { parse_mode: "Markdown" });
  });

  bot.on("text", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const key = `tg:${ctx.from.id}:${agentId}`;
    if (!checkRateLimit(key)) {
      await ctx.reply("⏳ Espera un momento antes de enviar otro mensaje.");
      return;
    }

    const history = await getHistory(key);

    await ctx.sendChatAction("typing");
    const statusMsg = await ctx.reply("✍️ Pensando...");

    try {
      const res = await processMessage(ctx.message.text, branchId, history.slice(-10), agentId);
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
      await ctx.reply(res, { parse_mode: "Markdown" });

      await pushHistory(key, ctx.message.text, res);
    } catch (err) {
      console.error("housepysbot error:", err);
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
      await ctx.reply(
        "Hubo un error. Intenta de nuevo en un momento."
      );
    }
  });

  return bot;
}
