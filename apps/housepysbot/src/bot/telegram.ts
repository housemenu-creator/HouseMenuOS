import { Telegraf, Markup } from "telegraf";
import { processMessage, type SenderInfo } from "../agent/index.js";
import { getHistory, pushHistory } from "../lib/session.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { routeTelegram } from "../agents/router.js";
import { getMenuByBranch } from "../lib/menu.js";

// ── Helpers ────────────────────────────────────────────

async function replySafe(ctx: any, text: string, extra?: Record<string, any>) {
  try {
    await ctx.reply(text, { ...extra, parse_mode: "Markdown" });
  } catch {
    const plain = text
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    await ctx.reply(plain, extra);
  }
}

async function thinking(ctx: any) {
  try {
    await ctx.sendChatAction("typing");
    const msg = await ctx.reply("✍️ Pensando...");
    return msg;
  } catch {
    return null;
  }
}

async function cleanThinking(ctx: any, msg: any) {
  if (!msg) return;
  try { await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id); } catch {}
}

// ── Inline keyboards ──────────────────────────────────

function adminPanel() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Resumen ventas", "admin:resumen"),
     Markup.button.callback("📦 Stock", "admin:stock")],
    [Markup.button.callback("💰 Abrir turno", "admin:turno_abrir"),
     Markup.button.callback("💰 Cerrar turno", "admin:turno_cerrar")],
    [Markup.button.callback("🍽 Menú", "admin:menu"),
     Markup.button.callback("🚚 Repartidores", "admin:repartidores")],
    [Markup.button.callback("🧾 CPEs", "admin:cpes"),
     Markup.button.callback("🏪 Info", "admin:info")],
  ]);
}

async function menuCategoriesKeyboard(branchId: string) {
  const catalog = await getMenuByBranch(branchId);
  if (!catalog?.products) return null;

  const cats = new Set<string>();
  for (const p of Object.values(catalog.products) as any[]) {
    if (p.available !== false) cats.add(p.category || "General");
  }

  const rows: any[] = [];
  let row: any[] = [];
  for (const cat of [...cats].sort()) {
    row.push(Markup.button.callback(cat, `menu_cat:${cat}`));
    if (row.length >= 2) { rows.push(row); row = []; }
  }
  if (row.length > 0) rows.push(row);
  rows.push([Markup.button.callback("📋 Menú completo", "menu_cat:__all")]);
  return Markup.inlineKeyboard(rows);
}

async function productsByCategoryKeyboard(branchId: string, category: string) {
  const catalog = await getMenuByBranch(branchId);
  if (!catalog?.products) return null;

  const entries = Object.entries(catalog.products as Record<string, any>)
    .filter(([_, p]) => p.available !== false && (category === "__all" || (p.category || "General") === category));

  const rows: any[] = [];
  for (const [id, p] of entries) {
    const price = Number(p.base_price ?? p.price ?? 0);
    rows.push([Markup.button.callback(
      `${p.name} — S/ ${price.toFixed(2)}`,
      `menu_prod:${id}`
    )]);
  }
  rows.push([Markup.button.callback("⬅️ Volver a categorías", "menu_back")]);
  return Markup.inlineKeyboard(rows);
}

// ── Bot Factory ────────────────────────────────────────

export function createBot(token: string, branchId: string) {
  const bot = new Telegraf(token);

  // Register commands in Telegram's UI
  bot.telegram.setMyCommands([
    { command: "start", description: "Iniciar / Panel admin" },
    { command: "help", description: "Ayuda y comandos" },
    { command: "menu", description: "Ver menú del restaurante" },
    { command: "pedido", description: "Consultar estado de pedido" },
    { command: "admin", description: "Panel de administración (dueño)" },
  ]).catch(() => {});

  // ── /start ──────────────────────────────────────────
  bot.start(async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId === "admin") {
      await replySafe(ctx, [
        "👔 *HousePySbot Admin*",
        "",
        "Bienvenido, administrador. Usá los botones o comandos.",
      ].join("\n"), adminPanel());
    } else {
      await replySafe(ctx, [
        "🎉 ¡Bienvenido a *HousePySbot*!",
        "",
        "Soy el asistente virtual del restaurante.",
        "",
        "🍽 */menu* — Ver platos y armar tu pedido",
        "📋 */pedido ID* — Consultar estado de un pedido",
        "❓ */help* — Todos los comandos disponibles",
        "",
        "O preguntame directamente:",
        "\"qué tienen hoy?\", \"tienen pizza?\", \"cuánto está la causa?\"",
      ].join("\n"));
    }
  });

  // ── /help ───────────────────────────────────────────
  bot.help(async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const cmds = agentId === "admin"
      ? [
          "/start — Panel principal",
          "/help — Esta ayuda",
          "/admin — Panel con botones",
          "/resumen — Ventas del día",
          "/menu — Ver menú completo",
          "/stock — Stock de productos",
          "/turno [abrir|cerrar monto] — Caja",
          "/pedido [ID] — Consultar pedido",
          "/repartidores — Repartidores",
          "/cpes [pag] — Comprobantes",
          "/info — Info del restaurante",
        ]
      : [
          "/start — Iniciar",
          "/help — Esta ayuda",
          "/menu — Ver menú completo",
          "/pedido [ID] — Consultar pedido",
        ];
    await ctx.reply(cmds.join("\n"));
  });

  // ── /menu (with inline keyboard) ────────────────────
  bot.command("menu", async (ctx) => {
    const kb = await menuCategoriesKeyboard(branchId);
    if (kb) {
      await replySafe(ctx, "🍽 *Menú* — elegí una categoría:", kb);
    } else {
      const { agentId } = routeTelegram(ctx.from.id);
      const res = await processMessage("Muéstrame el menú completo", branchId, [], agentId);
      await replySafe(ctx, res);
    }
  });

  // ── /pedido [ID] ────────────────────────────────────
  bot.command("pedido", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const id = ctx.message.text.split(" ").slice(1).join(" ");
    if (!id) {
      await ctx.reply("Usá: /pedido ID_DEL_PEDIDO");
      return;
    }
    const status = await thinking(ctx);
    const res = await processMessage(`Consulta el estado del pedido ${id}`, branchId, [], agentId);
    await cleanThinking(ctx, status);
    await replySafe(ctx, res);
  });

  // ── /admin (panel) ──────────────────────────────────
  bot.command("admin", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") {
      await ctx.reply("Comando solo para administradores.");
      return;
    }
    await replySafe(ctx, "👔 *Panel de administración*", adminPanel());
  });

  // ── Admin quick commands ────────────────────────────
  const adminCmd = async (ctx: any, prompt: string) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") {
      await ctx.reply("Comando no disponible.");
      return;
    }
    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], "admin");
    await cleanThinking(ctx, status);
    await replySafe(ctx, res);
  };

  bot.command("resumen", async (ctx) => adminCmd(ctx, "Dame el resumen de ventas del día de hoy"));
  bot.command("stock", async (ctx) => adminCmd(ctx, "Muéstrame el stock de todos los productos"));

  bot.command("turno", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    if (agentId !== "admin") { await ctx.reply("No disponible."); return; }
    const args = ctx.message.text.split(" ").slice(1);
    let prompt: string;
    if (args[0] === "abrir") {
      if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) <= 0) {
        await ctx.reply("Usá: /turno abrir [monto] — ej: /turno abrir 100");
        return;
      }
      prompt = `Abre un turno de caja con monto inicial de S/ ${args[1]}`;
    } else if (args[0] === "cerrar") {
      if (!args[1] || isNaN(Number(args[1])) || Number(args[1]) <= 0) {
        await ctx.reply("Usá: /turno cerrar [monto] — ej: /turno cerrar 100");
        return;
      }
      prompt = `Cierra el turno de caja con monto final de S/ ${args[1]}`;
    } else {
      prompt = "Cuál es el estado actual de la caja?";
    }
    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], "admin");
    await cleanThinking(ctx, status);
    await replySafe(ctx, res);
  });

  bot.command("repartidores", async (ctx) => adminCmd(ctx, "Muéstrame los repartidores disponibles"));
  bot.command("cpes", async (ctx) => {
    const pagina = ctx.message.text.split(" ")[1] || "1";
    await adminCmd(ctx, `Muéstrame el historial de comprobantes, página ${pagina}`);
  });
  bot.command("info", async (ctx) => adminCmd(ctx, "Dame la información del restaurante"));

  // ── Inline callback handlers ────────────────────────

  bot.action(/admin:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const cmd = ctx.match[1];
    const prompts: Record<string, string> = {
      resumen: "Dame el resumen de ventas del día de hoy",
      stock: "Muéstrame el stock de todos los productos",
      menu: "Muéstrame el menú completo",
      repartidores: "Muéstrame los repartidores disponibles",
      cpes: "Muéstrame el historial de comprobantes, página 1",
      info: "Dame la información del restaurante",
      turno_abrir: "Abre un turno de caja",
      turno_cerrar: "Cuál es el estado actual de la caja?",
    };
    const prompt = prompts[cmd];
    if (!prompt) { await ctx.reply("Comando no reconocido."); return; }
    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], "admin");
    await cleanThinking(ctx, status);
    await replySafe(ctx, res, adminPanel());
  });

  // Menu category selection
  bot.action(/menu_cat:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const category = ctx.match[1];
    const kb = await productsByCategoryKeyboard(branchId, category);
    if (kb) {
      const title = category === "__all" ? "📋 *Menú completo*" : `📁 *${category}*`;
      await ctx.editMessageText(title, { parse_mode: "Markdown", ...kb });
    } else {
      await ctx.reply("No hay productos en esta categoría.");
    }
  });

  // Menu product detail
  bot.action(/menu_prod:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const { agentId } = routeTelegram(ctx.from.id);
    const prodId = ctx.match[1];
    // Fetch product from catalog
    const catalog = await getMenuByBranch(branchId);
    const product = catalog?.products?.[prodId];
    const prodName = product?.name || prodId;

    // Build a prompt that includes wizard options if the product is configurable
    let prompt: string;
    if (product?.isWizard && product?.steps?.length) {
      const stepsDesc = product.steps.map((step: any) => {
        const typeLabel = step.type === "single" ? "elegí UNA" : step.type === "multiple" ? "elegí VARIAS" : "automático";
        const optionsDesc = (step.options || [])
          .map((opt: any) => {
            const price = opt.price > 0 ? ` (+S/${opt.price.toFixed(2)})` : " (incluido)";
            return `  • ${opt.name}${price}`;
          })
          .join("\n");
        return `📌 ${step.title} (${typeLabel}):\n${optionsDesc}`;
      }).join("\n\n");

      prompt = `El cliente quiere armar "${prodName}". Es un producto personalizable con las siguientes opciones:\n\n${stepsDesc}\n\nAyudalo paso a paso: mostrale las opciones de cada paso, dejá que elija, y confirmá su selección antes de pasar al siguiente. Cuando tenga todo armado, resumí el pedido completo con el precio final.`;
    } else {
      prompt = `Dame información del producto "${prodName}"`;
    }

    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], agentId);
    await cleanThinking(ctx, status);
    await replySafe(ctx, res);
  });

  // Menu back to categories
  bot.action("menu_back", async (ctx) => {
    await ctx.answerCbQuery();
    const kb = await menuCategoriesKeyboard(branchId);
    if (kb) {
      await ctx.editMessageText("🍽 *Menú* — elegí una categoría:", { parse_mode: "Markdown", ...kb });
    }
  });

  // ── Non-text messages ───────────────────────────────
  bot.on("photo", async (ctx) => {
    await ctx.reply("📷 No puedo procesar imágenes todavía. Escribime qué necesitás.");
  });
  bot.on("sticker", async (ctx) => {
    // Silent ignore for stickers
  });
  bot.on("voice", async (ctx) => {
    await ctx.reply("🎤 No puedo procesar audios todavía. Escribime el mensaje.");
  });
  bot.on("location", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const loc = ctx.message.location;
    const res = await processMessage(
      `El cliente envió su ubicación: lat ${loc.latitude}, lng ${loc.longitude}`,
      branchId, [], agentId
    );
    await replySafe(ctx, res);
  });
  bot.on("contact", async (ctx) => {
    const c = ctx.message.contact;
    await ctx.reply(`📞 Recibí tu contacto: ${c.first_name} ${c.phone_number || ""}`);
  });

  // ── Free text ───────────────────────────────────────
  bot.on("text", async (ctx) => {
    const { agentId } = routeTelegram(ctx.from.id);
    const key = `tg:${ctx.from.id}:${agentId}`;
    if (!checkRateLimit(key)) {
      await ctx.reply("⏳ Esperá un momento antes de enviar otro mensaje.");
      return;
    }

    // Build senderInfo for customer 360 context
    const senderInfo: SenderInfo = {
      phone: ctx.from.username || String(ctx.from.id),
      platform: "telegram",
    };

    const history = await getHistory(key);
    const status = await thinking(ctx);

    try {
      const res = await processMessage(ctx.message.text, branchId, history.slice(-10), agentId, senderInfo);
      await cleanThinking(ctx, status);
      const extra = agentId === "admin" ? adminPanel() : undefined;
      await replySafe(ctx, res, extra);
      await pushHistory(key, ctx.message.text, res);
    } catch (err) {
      console.error("housepysbot error:", err);
      await cleanThinking(ctx, status);
      await ctx.reply("Hubo un error. Intenta de nuevo.");
    }
  });

  return bot;
}
