import { Telegraf, Markup } from "telegraf";
import { processMessage, type SenderInfo } from "../agent/index.js";
import { getHistory } from "../lib/session.js";
import { routeTelegram } from "../agents/router.js";
import { getMenuByBranch } from "../lib/menu.js";
import { addToCart, getCart, clearCart, cartSummary } from "../lib/cart.js";
import { initFirebase, ref, get, child, set } from "../lib/firebase.js";
import { normalizeTelegram } from "../channels/message-normalizer.js";
import { channelRegistry } from "../channels/channel.interface.js";
import { getWhatsAppStatus } from "../lib/wa-status.js";
import logger from "../lib/logger.js";

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
    [Markup.button.callback("🔌 Conexiones", "admin:conexiones")],
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

async function productsByCategoryKeyboard(branchId: string, category: string, chatId?: string) {
  const catalog = await getMenuByBranch(branchId);
  if (!catalog?.products) return null;

  let cartNote = "";
  if (chatId) {
    const { count } = cartSummary(chatId);
    if (count > 0) cartNote = ` 🛒 ${count}`;
  }

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
  const navRow: any[] = [Markup.button.callback("⬅️ Categorías", "menu_back")];
  if (cartNote) {
    navRow.push(Markup.button.callback(cartNote, "cart_view"));
  }
  rows.push(navRow);
  return Markup.inlineKeyboard(rows);
}

function productKeyboard(productId: string, chatId: string) {
  const { count } = cartSummary(chatId);
  const rows: any[] = [
    [
      Markup.button.callback("➕ 1", `cart_add:${productId}:1`),
      Markup.button.callback("➕ 2", `cart_add:${productId}:2`),
      Markup.button.callback("➕ 3", `cart_add:${productId}:3`),
    ],
  ];
  const nav: any[] = [];
  if (count > 0) nav.push(Markup.button.callback(`🛒 Carrito (${count})`, "cart_view"));
  nav.push(Markup.button.callback("⬅️ Volver", "menu_back"));
  rows.push(nav);
  return Markup.inlineKeyboard(rows);
}

function cartViewKeyboard(hasItems: boolean) {
  if (!hasItems) return undefined;
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Confirmar pedido", "cart_confirm")],
    [Markup.button.callback("🗑 Vaciar carrito", "cart_clear")],
    [Markup.button.callback("🍽 Seguir viendo menú", "menu_back")],
  ]);
}

// ── Bot Factory ────────────────────────────────────────

export function createBot(token: string, branchId: string) {
  const bot = new Telegraf(token);
  const db = initFirebase();

  // Register commands in Telegram's UI
  bot.telegram.setMyCommands([
    { command: "start", description: "Iniciar / Panel admin" },
    { command: "help", description: "Ayuda y comandos" },
    { command: "menu", description: "Ver menú del restaurante" },
    { command: "carrito", description: "Ver tu carrito de compras" },
    { command: "pedido", description: "Consultar estado de pedido" },
    { command: "admin", description: "Panel de administración (dueño)" },
  ]).catch(() => {});

  // ── /start ──────────────────────────────────────────
  bot.start(async (ctx) => {
    const payload = ctx.payload || "";
    const linkTokenMatch = payload.match(/^link_(.+)$/);

    // ── Linking token (migración WhatsApp → Telegram) ──
    if (linkTokenMatch) {
      const token = linkTokenMatch[1];
      const tokenSnap = await get(child(ref(db), `branches/${branchId}/linking_tokens/${token}`));
      if (tokenSnap.exists()) {
        const data = tokenSnap.val();
        if (data.usado || data.expiresAt < Date.now()) {
          await replySafe(ctx, [
            "🔗 Este enlace ya expiró o ya fue usado.",
            "Pedí uno nuevo por WhatsApp.",
          ].join("\n"));
          return;
        }
        // Marcar como usado
        await set(child(ref(db), `branches/${branchId}/linking_tokens/${token}`), {
          ...data,
          usado: true,
          usedAt: Date.now(),
          telegramChatId: String(ctx.from.id),
        });

        // Si hay teléfono, guardar vinculación y generar cupón de bienvenida
        let cuponCode = "";
        if (data.telefono) {
          const cleanPhone = data.telefono.replace(/[^0-9]/g, "");
          await set(child(ref(db), `branches/${branchId}/vinculaciones/${cleanPhone}`), {
            telegramChatId: String(ctx.from.id),
            linkedAt: Date.now(),
          });

          // Generar cupón de bienvenida
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          cuponCode = "BIENVENIDO-";
          for (let i = 0; i < 6; i++) {
            cuponCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          await set(child(ref(db), `branches/${branchId}/cupones/${cuponCode}`), {
            code: cuponCode,
            descuento: 10,
            tipo: "porcentaje",
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 86400000,
            usado: false,
            clienteTelefono: cleanPhone,
          });
        }

        const welcome = data.telefono
          ? "✅ *Vinculación exitosa!* Tu cuenta de WhatsApp ya está conectada con Telegram."
          : "✅ *Bienvenido a HousePySbot por Telegram!*";

        const msg = cuponCode
          ? `${welcome}\n\n🎁 *Cupón de bienvenida:*\n   Código: *${cuponCode}*\n   *10% de descuento* en tu próximo pedido\n   Válido por 7 días`
          : `${welcome}\n\nAcá tenés acceso más rápido a tu menú y pedidos.`;

        await replySafe(ctx, msg + [
          "",
          "",
          "🍽 */menu* — Ver platos",
          "🛒 */carrito* — Tu carrito",
          "📋 */pedido ID* — Consultar pedido",
        ].join("\n"));
        return;
      }
    }

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
        "🛒 */carrito* — Ver tu carrito de compras",
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
          "/carrito — Ver tu carrito",
          "/pedido [ID] — Consultar pedido",
        ];
    await ctx.reply(cmds.join("\n"));
  });

  // ── /menu (with inline keyboard) ────────────────────
  bot.command("menu", async (ctx) => {
    const chatId = String(ctx.from.id);
    const kb = await menuCategoriesKeyboard(branchId);
    if (kb) {
      const { count } = cartSummary(chatId);
      const msg = count > 0
        ? `🍽 *Menú* — elegí una categoría:\n🛒 *${count} producto(s)* en tu carrito`
        : "🍽 *Menú* — elegí una categoría:";
      await replySafe(ctx, msg, kb);
    } else {
      const { agentId } = routeTelegram(ctx.from.id);
      const res = await processMessage("Muéstrame el menú completo", branchId, [], agentId);
      await replySafe(ctx, res);
    }
  });

  // ── /carrito ────────────────────────────────────────
  bot.command("carrito", async (ctx) => {
    const chatId = String(ctx.from.id);
    const { items, total, count } = cartSummary(chatId);
    if (count === 0) {
      await replySafe(ctx, "🛒 *Tu carrito está vacío.*\nUsá /menu para ver los productos.");
      return;
    }
    const lines = items.map((i, idx) =>
      `${idx + 1}. ${i.name} x${i.quantity} — S/ ${(i.price * i.quantity).toFixed(2)}`
    );
    const msg = [
      "🛒 *TU CARRITO*",
      "",
      ...lines,
      "",
      `*Total: S/ ${total.toFixed(2)}*`,
      "",
      "✅ *Confirmar* para crear el pedido.",
    ].join("\n");
    await replySafe(ctx, msg, cartViewKeyboard(true));
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
      conexiones: "conexiones",
    };
    const prompt = prompts[cmd];
    if (!prompt) { await ctx.reply("Comando no reconocido."); return; }

    // Caso especial: panel de conexiones (muestra estado sin llamar a la IA)
    if (cmd === "conexiones") {
      const waStatus = JSON.parse(getWhatsAppStatus());
      const tgChats = channelRegistry.get("telegram") ? "✅ Activo" : "❌ Inactivo";
      const lines = [
        "🔌 *Estado de Conexiones*",
        "",
        "💬 *WhatsApp*",
        waStatus.status === "connected"
          ? `   ✅ Conectado\n   📱 ${waStatus.number}`
          : `   ❌ Desconectado\n   📲 Escaneá el QR en http://localhost:3000`,
        "",
        "✈️ *Telegram*",
        `   ✅ Bot activo`,
        "",
        "🤖 *IA*",
        `   🧠 ${process.env.OPENROUTER_MODEL || "llama-3.3-70b-versatile"}`,
        `   🔗 ${process.env.OPENAI_BASE_URL || "Groq"}`,
        "",
        "📡 *Servicios*",
        `   🔐 Firebase Auth`,
        `   🗄️ RAG: 76 documentos`,
        `   ⏰ Scheduler: 5 tareas`,
      ];
      await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
      return;
    }

    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], "admin");
    await cleanThinking(ctx, status);
    await replySafe(ctx, res, adminPanel());
  });

  // Menu category selection
  bot.action(/menu_cat:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    const category = ctx.match[1];
    const kb = await productsByCategoryKeyboard(branchId, category, chatId);
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
    const chatId = String(ctx.from.id);
    const { agentId } = routeTelegram(ctx.from.id);
    const prodId = ctx.match[1];
    const catalog = await getMenuByBranch(branchId);
    const product = catalog?.products?.[prodId];
    const prodName = product?.name || prodId;

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

    // Show add-to-cart keyboard (skip for wizard products — handled by AI)
    if (!product?.isWizard) {
      const price = Number(product?.base_price ?? product?.price ?? 0);
      const priceLine = price > 0 ? `S/ ${price.toFixed(2)}` : "";
      await ctx.reply(
        `📦 *${prodName}* ${priceLine}\n¿Cuántos querés agregar?`,
        { parse_mode: "Markdown", ...productKeyboard(prodId, chatId) }
      );
    }
  });

  // ── Add to cart ─────────────────────────────────────
  bot.action(/cart_add:(.+):(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    const prodId = ctx.match[1];
    const qty = parseInt(ctx.match[2], 10);
    const catalog = await getMenuByBranch(branchId);
    const product = catalog?.products?.[prodId];
    if (!product) { await ctx.reply("Producto no encontrado."); return; }
    const price = Number(product.base_price ?? product.price ?? 0);
    addToCart(chatId, { productId: prodId, name: product.name, quantity: qty, price });
    const { count, total } = cartSummary(chatId);
    await ctx.reply(
      `✅ *${qty}x ${product.name}* agregado\n🛒 Carrito: ${count} prod · S/ ${total.toFixed(2)}`,
      { parse_mode: "Markdown", ...productKeyboard(prodId, chatId) }
    );
  });

  // ── View cart ───────────────────────────────────────
  bot.action("cart_view", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    const { items, total, count } = cartSummary(chatId);
    if (count === 0) {
      await ctx.editMessageText("🛒 *Carrito vacío*\nUsá /menu para ver productos.", { parse_mode: "Markdown" });
      return;
    }
    const lines = items.map((i, idx) =>
      `${idx + 1}. ${i.name} x${i.quantity} — S/ ${(i.price * i.quantity).toFixed(2)}`
    );
    const msg = [
      "🛒 *TU CARRITO*",
      "",
      ...lines,
      "",
      `*Total: S/ ${total.toFixed(2)}*`,
    ].join("\n");
    await ctx.editMessageText(msg, { parse_mode: "Markdown", ...cartViewKeyboard(true)! });
  });

  // ── Confirm cart → create order ─────────────────────
  bot.action("cart_confirm", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    const { items, total } = cartSummary(chatId);
    if (items.length === 0) {
      await ctx.reply("Carrito vacío. Usá /menu para agregar productos.");
      return;
    }
    // Build order prompt for the AI agent
    const itemsList = items.map(i => `${i.quantity}x ${i.name}`).join(", ");
    const prompt = `Crear un pedido delivery con: ${itemsList}. El total calculado es S/ ${total.toFixed(2)}. Pregúntale al cliente los datos faltantes: nombre, dirección, teléfono, método de pago.`;
    const { agentId } = routeTelegram(ctx.from.id);
    const status = await thinking(ctx);
    const res = await processMessage(prompt, branchId, [], agentId);
    await cleanThinking(ctx, status);
    await replySafe(ctx, res);
    clearCart(chatId);
  });

  // ── Clear cart ──────────────────────────────────────
  bot.action("cart_clear", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    clearCart(chatId);
    await ctx.editMessageText("🗑 *Carrito vaciado*\nUsá /menu para empezar de nuevo.", { parse_mode: "Markdown" });
  });

  // Confirmar/Cancelar pedido (desde botones inline de [CONFIRMAR_PEDIDO])
  bot.action(/confirmar:(.+)/, async (ctx) => {
    await ctx.answerCbQuery("✅ Confirmado");
    const key = ctx.match[1];
    const history = await getHistory(key);
    await ctx.reply("✅ *Pedido confirmado!* Estamos procesándolo.", { parse_mode: "Markdown" });
    const msg = history.length > 0
      ? "Confirmo el pedido que acabamos de conversar. Procedé con crear_pedido."
      : "Sí, confirmo el pedido.";
    const res = await processMessage(msg, branchId, history.slice(-10), "atencion");
    await ctx.reply(res);
  });

  // Cancelar pedido
  bot.action(/cancelar:(.+)/, async (ctx) => {
    await ctx.answerCbQuery("❌ Cancelado");
    await ctx.editMessageText("❌ *Pedido cancelado.*", { parse_mode: "Markdown" });
  });

  // Menu back to categories
  bot.action("menu_back", async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = String(ctx.from.id);
    const kb = await menuCategoriesKeyboard(branchId);
    if (kb) {
      const { count } = cartSummary(chatId);
      const msg = count > 0
        ? `🍽 *Menú* — elegí una categoría:\n🛒 *${count} producto(s)* en tu carrito`
        : "🍽 *Menú* — elegí una categoría:";
      await ctx.editMessageText(msg, { parse_mode: "Markdown", ...kb });
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
    const status = await thinking(ctx);
    try {
      const normalized = normalizeTelegram({
        fromId: ctx.from.id,
        username: ctx.from.username,
        text: ctx.message.text,
        messageId: ctx.message.message_id,
      });
      await channelRegistry.onMessage(normalized);
    } catch (err) {
      logger.error(err, "❌ Telegram router error:");
      await ctx.reply("Hubo un error. Intentá de nuevo.");
    } finally {
      await cleanThinking(ctx, status);
    }
  });

  return bot;
}
