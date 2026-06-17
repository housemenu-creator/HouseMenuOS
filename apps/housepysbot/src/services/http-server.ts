import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { EventEmitter } from "events";
import QRCode from "qrcode";
import { registry } from "../mcp/registry.js";
import { renderDSStyles, renderFontPreload, icon } from "../lib/render-ds.js";
import { getAllBranchIds, getBranchInfo } from "../lib/branch.js";

export const qrEmitter = new EventEmitter();

let io: SocketIOServer | null = null;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Rate limiting ──────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000);

// ── Firebase Token Verification ────────────────────────
const tokenCache = new Map<string, { uid: string; exp: number }>();
const TOKEN_CACHE_TTL = 55 * 60 * 1000; // 55 min (tokens last 60 min)

async function verifyFirebaseToken(token: string): Promise<{ valid: boolean; uid?: string; error?: string }> {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("❌ FIREBASE_API_KEY no configurado — auth rechazado");
    return { valid: false, error: "FIREBASE_API_KEY no configurada en el servidor" };
  }

  // Check cache
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.exp) {
    return { valid: true, uid: cached.uid };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        signal: controller.signal,
      }
    );
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return { valid: false, error: `Token inválido: ${resp.status} ${errText}` };
    }
    const data = await resp.json() as any;
    const user = data.users?.[0];
    if (!user?.localId) {
      return { valid: false, error: "Token no contiene un usuario válido" };
    }
    // Verify it's an anonymous token
    // Anonymous users have empty providerUserInfo[] (no email/password, no Google)
    const providerInfo = user.providerUserInfo || [];
    const isAnonymous = !Array.isArray(providerInfo) || providerInfo.length === 0
      || providerInfo.some((p: any) => p.providerId === "anonymous");
    if (!isAnonymous) {
      return { valid: false, error: "Solo se aceptan tokens anónimos" };
    }
    // Cache it
    tokenCache.set(token, { uid: user.localId, exp: Date.now() + TOKEN_CACHE_TTL });
    // Clean stale cache entries
    if (tokenCache.size > 1000) {
      const now = Date.now();
      for (const [t, v] of tokenCache) { if (now > v.exp) tokenCache.delete(t); }
    }
    return { valid: true, uid: user.localId };
  } catch (e: any) {
    if (e.name === "AbortError") {
      return { valid: false, error: "Timeout verificando token" };
    }
    return { valid: false, error: `Error verificando token: ${e.message}` };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Middleware: Require Anonymous Auth ──────────────────
async function requireAnonymousAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("⚠️ requireAnonymousAuth: no auth header");
    res.status(401).json({ success: false, error: "Se requiere autenticación anónima" });
    return;
  }
  const token = authHeader.slice(7);
  console.log("🔑 Verificando token...");
  const result = await verifyFirebaseToken(token);
  if (!result.valid) {
    console.warn("⚠️ Token inválido:", result.error);
    res.status(401).json({ success: false, error: result.error || "Token inválido" });
    return;
  }
  console.log("✅ Token válido para uid:", result.uid);
  (req as any).user = { uid: result.uid };
  next();
}

// ── Webhook helpers ────────────────────────────────────
const webhookDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of webhookDedup) {
    if (now - ts > 300_000) webhookDedup.delete(key);
  }
}, 60_000);

function normalizeProviderOrder(provider: string, payload: any): any | null {
  const data = payload.order || payload;
  switch (provider) {
    case "rappi": {
      return {
        id: data.id || data.order_id,
        cliente: data.customer?.name || data.cliente || "Cliente Rappi",
        items: (data.items || []).map((i: any) => ({
          productId: i.id || i.product_id,
          name: i.name || i.title || "Producto",
          quantity: i.quantity || 1,
          price: Number(i.price || i.unit_price || 0),
        })),
        direccion: data.delivery_address || data.address || data.direccion || "",
        telefono: data.customer?.phone || data.phone || "",
        nota: data.instructions || data.nota || "",
        metodo_pago: "tarjeta",
        tipo: "delivery",
        provider: "rappi",
        providerOrderId: data.id || data.order_id,
      };
    }
    case "pedidos_ya":
    case "pedidosya": {
      return {
        id: data.id || data.order_id,
        cliente: data.delivery?.customer?.name || data.cliente || "Cliente PedidosYa",
        items: (data.items || []).map((i: any) => ({
          productId: i.id || i.product_id,
          name: i.name || i.title || "Producto",
          quantity: i.quantity || 1,
          price: Number(i.price || i.unit_price || 0),
        })),
        direccion: data.delivery?.address || data.address || data.direccion || "",
        telefono: data.delivery?.customer?.phone || data.phone || "",
        nota: data.instructions || data.nota || "",
        metodo_pago: "tarjeta",
        tipo: "delivery",
        provider: "pedidos_ya",
        providerOrderId: data.id || data.order_id,
      };
    }
    case "uber":
    case "uber_eats": {
      return {
        id: data.id || data.order_id || data.display_id,
        cliente: data.delivery?.customer?.name || data.customer_name || "Cliente Uber",
        items: (data.items || data.cart?.items || []).map((i: any) => ({
          productId: i.id || i.product_id,
          name: i.title || i.name || i.product_name,
          quantity: i.quantity || 1,
          price: Number(i.price_amount || i.price || i.unit_price || 0),
        })),
        direccion: data.delivery?.location?.address || data.address || data.direccion || "",
        telefono: data.delivery?.customer?.phone || data.phone || "",
        nota: data.instructions || data.nota || "",
        metodo_pago: "tarjeta",
        tipo: "delivery",
        provider: "uber_eats",
        providerOrderId: data.id || data.order_id,
      };
    }
    default: {
      if (data.items || data.cliente) {
        return {
          ...data,
          provider,
          providerOrderId: data.providerOrderId || data.id,
        };
      }
      return null;
    }
  }
}

async function processWebhookOrder(provider: string, branchId: string, normalized: any, dedupKey: string) {
  try {
    const { ref: fbRef, child: fbChild, push: fbPush, set: fbSet, initFirebase } = await import("../lib/firebase.js");
    const db = initFirebase();
    const ordersRef = fbChild(fbRef(db), `branches/${branchId}/orders`);
    const newRef = fbPush(ordersRef);
    const timestamp = new Date().toISOString();
    const subtotal = normalized.items.reduce((s: number, i: any) => s + (i.price || 0) * (i.quantity || 1), 0);
    const order = {
      id: newRef.key,
      items: normalized.items,
      cliente: normalized.cliente || "Delivery",
      direccion: normalized.direccion || "",
      telefono: normalized.telefono || "",
      nota: normalized.nota || "",
      metodo_pago: normalized.metodo_pago || "tarjeta",
      tipo: "delivery",
      deliveryFee: 0,
      subtotal,
      total: subtotal,
      status: "recibido",
      provider: normalized.provider || provider,
      providerOrderId: normalized.providerOrderId || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await fbSet(newRef, order);
    console.log(`📦 Webhook [${provider}]: Pedido #${newRef.key} — ${order.cliente} — S/ ${order.total.toFixed(2)}`);
  } catch (e: any) {
    console.error(`❌ Webhook error [${provider}]:`, e);
  }
}

// ── Status transition map ──────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  recibido: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["en_camino", "entregado", "cancelado"],
  en_camino: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

// ══════════════════════════════════════════════════════════
// Start HTTP Server
// ══════════════════════════════════════════════════════════
export function startHttpServer(port: number = 3000) {
  const app = express();
  const server = http.createServer(app);
  io = new SocketIOServer(server, {
    cors: { origin: ["http://localhost:3000", "http://127.0.0.1:3000"] },
  });

  app.use(express.json({ limit: "100kb" }));

  // ── JSON parse error handler (body-parser) ──────────
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && "body" in err) {
      console.error("🚨 JSON parse error en", req.method, req.path, ":", err.message);
      res.status(400).json({ success: false, error: "JSON inválido en el cuerpo de la solicitud" });
      return;
    }
    next(err);
  });

  // ── CORS ─────────────────────────────────────────────
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [];
    if (origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else if (process.env.NODE_ENV !== "production") {
      res.header("Access-Control-Allow-Origin", "*");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // ── Trust proxy for rate limiter ─────────────────────
  app.set("trust proxy", 1);

  // ══════════════════════════════════════════════════════
  // Health
  // ══════════════════════════════════════════════════════
  app.get("/health", (_req, res) => {
    const mem = process.memoryUsage?.();
    res.json({
      status: "ok",
      version: "0.1.0",
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      whatsapp_enabled: process.env.WHATSAPP_ENABLED === "true",
      branches: getAllBranchIds(),
      uptime: process.uptime(),
      memory: mem ? `${Math.round(mem.heapUsed / 1024 / 1024)}MB` : undefined,
      timestamp: new Date().toISOString(),
    });
  });

  // ══════════════════════════════════════════════════════
  // WA QR Page
  // ══════════════════════════════════════════════════════
  app.get("/", (_req, res) => {
    const fontPreload = renderFontPreload();
    const dsStyles = renderDSStyles();
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HousePySbot - WhatsApp QR</title>
  ${fontPreload}
  ${dsStyles}
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
    .qr-card { background: var(--cm-surface); border: 1px solid var(--cm-border); border-radius: 24px; padding: 2.5rem; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .qr-card h1 { font-size: 1.5rem; font-weight: 800; color: var(--cm-text); margin-bottom: 0.5rem; letter-spacing: -0.02em; }
    .qr-card p { font-size: 0.85rem; color: var(--cm-text-secondary); margin-bottom: 2rem; }
    #qrContainer { background: white; border-radius: 16px; padding: 1rem; display: inline-block; margin-bottom: 1.5rem; }
    #qrContainer img { display: block; width: 280px; height: 280px; image-rendering: pixelated; }
    .status { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; }
    .status.waiting { background: rgba(224,107,48,0.1); color: var(--cm-accent); border: 1px solid rgba(224,107,48,0.2); }
    .status.connected { background: rgba(52,199,89,0.1); color: #34C759; border: 1px solid rgba(52,199,89,0.2); }
    .status.error { background: rgba(255,69,58,0.1); color: #FF453A; border: 1px solid rgba(255,69,58,0.2); }
    #qrcode { margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="qr-card">
    <h1>${icon("store", 32)} HousePySbot</h1>
    <p>Escanea el código QR con WhatsApp para conectar el bot</p>
    <div id="qrcode"><div id="qrContainer"><div class="cm-spinner"></div></div></div>
    <div id="status" class="status waiting">${icon("loader", 16)} Esperando código QR...</div>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io({ transports: ["websocket", "polling"] });
    socket.on("qr", (url) => { document.getElementById("qrContainer").innerHTML = '<img src="' + url + '" alt="QR Code" />'; document.getElementById("status").className = "status waiting"; document.getElementById("status").innerHTML = '${icon("loader", 16)} Escanea el QR con WhatsApp'; });
    socket.on("connected", () => { document.getElementById("status").className = "status connected"; document.getElementById("status").innerHTML = '${icon("check", 16)} WhatsApp Conectado'; });
    socket.on("disconnect", () => { document.getElementById("status").className = "status error"; document.getElementById("status").innerHTML = '${icon("x", 16)} Desconectado — recargando...'; });
  </script>
</body>
</html>`);
  });

  // ══════════════════════════════════════════════════════
  // Monitor Page (real-time dashboard)
  // ══════════════════════════════════════════════════════
  app.get("/monitor", (req, res) => {
    const branchId = String(req.query.branch || "").trim() || "default";
    const allBranches = getAllBranchIds();
    const knownBranches = allBranches.length > 0 ? allBranches : ["default"];
    const cdn = "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js";
    const cdnDb = "https://www.gstatic.com/firebasejs/11.6.0/firebase-database-compat.js";
    const cdnAuth = "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth-compat.js";
    const lucideCdn = "https://unpkg.com/lucide@latest/dist/umd/lucide.js";
    const dsStyles = renderDSStyles();
    const fontPreload = renderFontPreload();
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monitor — HousePySbot</title>
  <script src="${cdn}"></script>
  <script src="${cdnDb}"></script>
  <script src="${cdnAuth}"></script>
  <script src="${lucideCdn}"></script>
  ${fontPreload}
  ${dsStyles}
  <style>
    body { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.5rem; font-weight: 800; color: var(--cm-text); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
    .branch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .branch-card { background: var(--cm-surface); border: 1px solid var(--cm-border); border-radius: 16px; padding: 1.25rem; }
    .branch-card h3 { font-size: 1rem; font-weight: 700; color: var(--cm-text); margin-bottom: 0.75rem; }
    .stat { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.85rem; border-bottom: 1px solid var(--cm-border); }
    .stat:last-child { border-bottom: none; }
    .stat-label { color: var(--cm-text-secondary); }
    .stat-value { font-weight: 700; color: var(--cm-text); }
    .ok { color: #34C759; } .warn { color: var(--cm-accent); } .err { color: #FF453A; }
    .mon-section { margin-top: 2rem; }
    .mon-section h2 { font-size: 1.1rem; font-weight: 700; color: var(--cm-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    #errorsList .mon-loading, #agentsList .mon-loading { display: flex; align-items: center; gap: 0.75rem; color: var(--cm-text-secondary); font-size: 0.85rem; }
    .branch-select { margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 10px; border: 1px solid var(--cm-border); background: var(--cm-surface); color: var(--cm-text); font-size: 0.85rem; }
    .mon-loading .cm-spinner { width: 16px; height: 16px; }
  </style>
</head>
<body>
  <h1>${icon("bell", 24)} Monitor — <select class="branch-select" onchange="location.href='?branch='+this.value">${knownBranches.map((b: string) => `<option value="${b}"${b === branchId ? " selected" : ""}>${b}</option>`).join("")}</select></h1>
  <div id="branchGrid" class="branch-grid"></div>
  <div class="mon-section"><h2>${icon("bell", 18)} Agencias</h2><div id="agentsList"><div class="mon-loading"><div class="cm-spinner"></div><span>Cargando...</span></div></div></div>
  <div class="mon-section"><h2>${icon("x", 18)} Errores</h2><div id="errorsList"><div class="mon-loading"><div class="cm-spinner"></div><span>Cargando...</span></div></div></div>
  <script>
    const ALL_BRANCHES = ${JSON.stringify(allBranches)};
    let currentBranch = ${JSON.stringify(branchId)};
    const FIREBASE_CONFIG = {
      apiKey: ${JSON.stringify(process.env.FIREBASE_API_KEY || "")},
      authDomain: ${JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || "")},
      databaseURL: ${JSON.stringify(process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID || ""}-default-rtdb.firebaseio.com`)},
      projectId: ${JSON.stringify(process.env.FIREBASE_PROJECT_ID || "")},
    };
    firebase.initializeApp(FIREBASE_CONFIG);
    function escapeHtml(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    firebase.auth().signInAnonymously().catch((e) => console.warn("Monitor: anonymous auth falló", e.message));
    const db = firebase.database();
    function loadAllBranchesStatus() {
      const grid = document.getElementById("branchGrid");
      if (!ALL_BRANCHES || ALL_BRANCHES.length === 0) {
        grid.innerHTML = '<div class="mon-loading" style="color:var(--cm-text-secondary)">No hay sucursales configuradas</div>';
        return;
      }
      grid.innerHTML = ALL_BRANCHES.map((b) => '<div class="branch-card" id="card-'+b+'"><h3>📍 '+escapeHtml(b)+'</h3><div class="cm-loading"><div class="cm-spinner"></div></div></div>').join("");
      for (const b of ALL_BRANCHES) {
        const ref = db.ref("branches/"+b+"/orders");
        ref.on("value", (snap) => {
          const orders = snap.val() || {};
          const vals = Object.values(orders) || [];
          const recibido = vals.filter((o:any) => o.status === "recibido").length;
          const preparando = vals.filter((o:any) => o.status === "preparando").length;
          const listo = vals.filter((o:any) => o.status === "listo").length;
          const delivery = vals.filter((o:any) => o.tipo === "delivery" || o.order_type === "Delivery").length;
          const total = vals.length;
          const status = recibido > 3 ? "err" : (recibido > 0 ? "warn" : "ok");
          const card = document.getElementById("card-"+b);
          if (card) card.innerHTML = "<h3>📍 "+escapeHtml(b)+"</h3><div class='stat'><span class='stat-label'>${icon("bell", 14)} Nuevos</span><span class='stat-value "+status+"'>"+recibido+"</span></div><div class='stat'><span class='stat-label'>${icon("loader", 14)} Prep.</span><span class='stat-value'>"+preparando+"</span></div><div class='stat'><span class='stat-label'>${icon("check", 14)} Listos</span><span class='stat-value'>"+listo+"</span></div><div class='stat'><span class='stat-label'>${icon("store", 14)} Delivery</span><span class='stat-value'>"+delivery+"</span></div><div class='stat'><span class='stat-label'>${icon("receipt", 14)} Total</span><span class='stat-value'>"+total+"</span></div>";
        }, (err) => { console.warn("Error loading branch "+b+":", err); });
      }
    }
    loadAllBranchesStatus();
    const agRef = db.ref("agents");
    agRef.on("value", (snap) => {
      const agents = snap.val() || {};
      const names = Object.keys(agents);
      const html = names.length === 0 ? '<div class="mon-loading" style="color:var(--cm-text-secondary)">Sin agencias configuradas</div>' : names.map((n) => '<div class="branch-card"><h3>🤖 '+escapeHtml(n)+'</h3><pre style="font-size:0.75rem;color:var(--cm-text-secondary);white-space:pre-wrap">'+escapeHtml(JSON.stringify(agents[n], null, 2))+'</pre></div>').join("");
      document.getElementById("agentsList").innerHTML = html;
    }, (err) => { document.getElementById("agentsList").innerHTML = '<div class="mon-loading" style="color:var(--cm-warning)">Error cargando agencias</div>'; });
    const errRef = db.ref("system/errors");
    errRef.limitToLast(10).on("value", (snap) => {
      const errors = snap.val() || {};
      const entries = Object.values(errors).reverse();
      const html = entries.length === 0 ? '<div class="mon-loading" style="color:var(--cm-text-secondary)">Sin errores</div>' : entries.map((e:any) => '<div class="stat"><span class="stat-label">'+(e.time||'')+'</span><span class="stat-value err">'+escapeHtml(e.message||e)+'</span></div>').join("");
      document.getElementById("errorsList").innerHTML = html;
    });
  </script>
</body>
</html>`);
  });

  // ══════════════════════════════════════════════════════
  // KDS Page (kitchen display system)
  // ══════════════════════════════════════════════════════
  app.get("/kds", (req, res) => {
    const branchId = String(req.query.branch || "").trim() || "default";
    const allBranches = getAllBranchIds();
    const knownBranches = allBranches.length > 0 ? allBranches : ["default"];
    const cdn = "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js";
    const cdnDb = "https://www.gstatic.com/firebasejs/11.6.0/firebase-database-compat.js";
    const cdnAuth = "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth-compat.js";
    const lucideCdn = "https://unpkg.com/lucide@latest/dist/umd/lucide.js";
    const dsStyles = renderDSStyles();
    const fontPreload = renderFontPreload();
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KDS — HousePySbot</title>
  <script src="${cdn}"></script>
  <script src="${cdnDb}"></script>
  <script src="${cdnAuth}"></script>
  <script src="${lucideCdn}"></script>
  ${fontPreload}
  ${dsStyles}
  <style>
    body { padding: 1rem; background: var(--cm-bg); }
    .kds-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
    .kds-header h1 { font-size: 1.3rem; font-weight: 800; color: var(--cm-text); display: flex; align-items: center; gap: 0.5rem; }
    .kds-header select { padding: 0.4rem 0.75rem; border-radius: 10px; border: 1px solid var(--cm-border); background: var(--cm-surface); color: var(--cm-text); font-size: 0.85rem; }
    .kds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
    .kds-order-card { background: var(--cm-surface); border: 1px solid var(--cm-border); border-radius: 16px; padding: 1.25rem; transition: all 0.2s; }
    .kds-order-card.urgent { border-color: var(--cm-accent); box-shadow: 0 0 0 1px var(--cm-accent); }
    .kds-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .kds-head .left { display: flex; align-items: center; gap: 0.5rem; }
    .kds-id { font-size: 0.85rem; font-weight: 800; color: var(--cm-text); letter-spacing: 0.05em; }
    .kds-status { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 6px; text-transform: uppercase; }
    .kds-status.new { background: rgba(224,107,48,0.15); color: var(--cm-accent); }
    .kds-status.preparando { background: rgba(255,204,0,0.15); color: #FFCC00; }
    .kds-status.listo { background: rgba(52,199,89,0.15); color: #34C759; }
    .kds-time { font-size: 0.75rem; color: var(--cm-text-tertiary); }
    .kds-client { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .kds-name { font-size: 1rem; font-weight: 700; color: var(--cm-text); }
    .kds-provider { font-size: 0.7rem; font-weight: 600; color: var(--cm-accent); background: rgba(224,107,48,0.1); padding: 0.15rem 0.4rem; border-radius: 4px; }
    .kds-items { margin-bottom: 0.75rem; }
    .kds-item { display: flex; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px solid var(--cm-border); font-size: 0.85rem; }
    .kds-item .kds-qty { font-weight: 800; color: var(--cm-accent); min-width: 1.5rem; text-align: right; }
    .kds-item .kds-name { font-weight: 500; color: var(--cm-text-secondary); font-size: 0.85rem; }
    .kds-note { display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.8rem; color: var(--cm-text-tertiary); font-style: italic; padding: 0.5rem; background: var(--cm-bg-alt); border-radius: 8px; margin-bottom: 0.75rem; }
    .kds-actions { display: flex; gap: 0.5rem; }
    .kds-actions button { flex: 1; padding: 0.6rem; border: 1px solid var(--cm-border); border-radius: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
    .kds-btn-prep { background: rgba(224,107,48,0.1); color: var(--cm-accent); }
    .kds-btn-prep:hover { background: rgba(224,107,48,0.2); }
    .kds-btn-done { background: rgba(52,199,89,0.1); color: #34C759; }
    .kds-btn-done:hover { background: rgba(52,199,89,0.2); }
    .kds-btn-cancel { background: rgba(255,69,58,0.1); color: #FF453A; }
    .kds-btn-cancel:hover { background: rgba(255,69,58,0.2); }
    .cm-loading { display: flex; align-items: center; justify-content: center; padding: 3rem; color: var(--cm-text-secondary); gap: 0.75rem; font-size: 0.9rem; }
    .cm-spinner { width: 24px; height: 24px; border: 3px solid var(--cm-border); border-top-color: var(--cm-accent); border-radius: 50%; animation: cm-spin 0.8s linear infinite; display: inline-block; }
    @keyframes cm-spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="kds-header">
    <h1>${icon("utensils", 24)} KDS <select onchange="location.href='/kds?branch='+this.value">${knownBranches.map((b: string) => `<option value="${b}"${b === branchId ? " selected" : ""}>${escapeHtml(b)}</option>`).join("")}</select></h1>
    <div style="display:flex;gap:0.5rem;align-items:center">
      <span id="orderCount" style="font-size:0.85rem;color:var(--cm-text-secondary);font-weight:600">0 pedidos</span>
      <button onclick="document.getElementById('audioToggle').click()" style="background:none;border:1px solid var(--cm-border);border-radius:8px;padding:0.4rem;cursor:pointer">${icon("bell", 16)}</button>
      <audio id="audioToggle" loop style="display:none"><source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4B/f3+AAAA"/></audio>
    </div>
  </div>
  <div id="kdsGrid" class="kds-grid"><div class="cm-loading"><div class="cm-spinner"></div><span>Cargando pedidos...</span></div></div>
  <script>
    const BRANCH = ${JSON.stringify(branchId)};
    const FIREBASE_CONFIG = {
      apiKey: ${JSON.stringify(process.env.FIREBASE_API_KEY || "")},
      authDomain: ${JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || "")},
      databaseURL: ${JSON.stringify(process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID || ""}-default-rtdb.firebaseio.com`)},
      projectId: ${JSON.stringify(process.env.FIREBASE_PROJECT_ID || "")},
    };
    firebase.initializeApp(FIREBASE_CONFIG);
    function escapeHtml(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    firebase.auth().signInAnonymously().catch((e) => console.warn("KDS: anonymous auth falló", e.message));
    const db = firebase.database();
    let orders = {};
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioEnabled = true;
    function playAlert() {
      if (!audioEnabled) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
      } catch(e) {}
    }
    function render() {
      const grid = document.getElementById("kdsGrid");
      const entries = Object.entries(orders).filter(([,o]) => o.status === "recibido" || o.status === "preparando");
      document.getElementById("orderCount").textContent = entries.length + " pedidos";
      if (entries.length === 0) {
        grid.innerHTML = '<div class="cm-loading" style="color:var(--cm-text-secondary);font-size:1.1rem">✅ No hay pedidos pendientes</div>';
        return;
      }
      grid.innerHTML = entries.sort(([,a],[,b]) => (a.createdAt||"").localeCompare(b.createdAt||"")).map(([id, order]) => {
        const elapsed = order.createdAt ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000) : 0;
        const time = order.createdAt ? new Date(order.createdAt).toLocaleTimeString("es-PE", {hour:"2-digit", minute:"2-digit"}) : "";
        const elapsedStr = elapsed < 1 ? "<1min" : elapsed + "min";
        const isDelayed = elapsed > 15;
        const statusClass = order.status === "recibido" ? (isDelayed ? "urgent" : "") : "";
        const items = order.items || [];
        return '<div class="kds-order-card '+statusClass+'" data-id="'+id+'"><div class="kds-head"><div class="left"><span class="kds-id">#'+(order.shortCode||id).slice(-6).toUpperCase()+'</span><span class="kds-status '+order.status+'">'+(order.status==="recibido"?"Nuevo":order.status==="preparando"?"Prep.":"Listo")+'</span></div><span class="kds-time">'+time+' — '+elapsedStr+'</span></div><div class="kds-client"><span class="kds-name">'+escapeHtml(order.cliente||order.customerName||"Cliente")+'</span>'+(order.provider?'<span class="kds-provider">'+escapeHtml(order.provider)+'</span>':'')+'</div><div class="kds-items">'+items.map(function(i){return '<div class="kds-item"><span class="kds-qty">'+(i.quantity||1)+'</span><span class="kds-name">'+escapeHtml(i.name||"Producto")+'</span></div>';}).join("")+'</div>'+(order.nota||order.observaciones?'<div class="kds-note">'+escapeHtml(order.nota||order.observaciones||"")+'</div>':'')+'<div class="kds-actions">'+(order.status==="recibido"?'<button class="kds-btn-prep" onclick="updateStatus(\''+id+'\',\'preparando\')"> Preparando</button><button class="kds-btn-cancel" onclick="updateStatus(\''+id+'\',\'cancelado\')"> Cancelar</button>':'')+(order.status==="preparando"?'<button class="kds-btn-done" onclick="updateStatus(\''+id+'\',\'listo\')"> Listo</button><button class="kds-btn-cancel" onclick="updateStatus(\''+id+'\',\'cancelado\')"> Cancelar</button>':'')+(order.status==="listo"?'<button class="kds-btn-done" onclick="updateStatus(\''+id+'\',\'entregado\')"> Entregado</button>':'')+'</div></div>';
      }).join("");
      if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    }
    window.updateStatus = async function(orderId, status) {
      let retried = false;
      const doFetch = async () => {
        let token = "";
        try { if (firebase.auth().currentUser) token = await firebase.auth().currentUser.getIdToken(); } catch(e) { console.warn("Token error:", e); }
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;
        const resp = await fetch("/api/orders/"+orderId+"/status", { method: "POST", headers, body: JSON.stringify({ branchId: BRANCH, status }) });
        if (!resp.ok && resp.status === 401 && !retried) { retried = true; try { await firebase.auth().currentUser.getIdToken(true); } catch(e) {} return doFetch(); }
        return resp;
      };
      try { await doFetch(); } catch(e) { console.error("Error al actualizar estado:", e); }
    };
    const ordersRef = db.ref("branches/"+BRANCH+"/orders");
    ordersRef.on("child_added", (snap) => {
      const id = snap.key; const val = snap.val();
      if (val && (val.status === "recibido" || val.status === "preparando")) { if (!orders[id]) playAlert(); orders[id] = val; render(); }
    });
    ordersRef.on("child_changed", (snap) => {
      const id = snap.key; const val = snap.val();
      if (val && (val.status === "recibido" || val.status === "preparando")) { orders[id] = val; } else if (id && orders[id]) { delete orders[id]; }
      render();
    });
    ordersRef.on("child_removed", (snap) => { if (snap.key && orders[snap.key]) { delete orders[snap.key]; render(); } });
  </script>
</body>
</html>`);
  });

  // ══════════════════════════════════════════════════════
  // QR Menu Page (digital menu for customers)
  // ══════════════════════════════════════════════════════
  app.get("/menu", (req, res) => {
    const branchId = String(req.query.branch || "").trim() || "default";
    const mesa = req.query.mesa || null;
    const cdn = "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js";
    const cdnDb = "https://www.gstatic.com/firebasejs/11.6.0/firebase-database-compat.js";
    const cdnAuth = "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth-compat.js";
    const lucideCdn = "https://unpkg.com/lucide@latest/dist/umd/lucide.js";
    const dsStyles = renderDSStyles();
    const fontPreload = renderFontPreload();
    const defaultDbUrl = `https://${process.env.FIREBASE_PROJECT_ID || ""}-default-rtdb.firebaseio.com`;
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Menú Digital</title>
  <script src="${cdn}"></script>
  <script src="${cdnDb}"></script>
  <script src="${cdnAuth}"></script>
  <script src="${lucideCdn}"></script>
  ${fontPreload}
  ${dsStyles}
  <style>
    body { padding: 0; margin: 0; background: var(--cm-bg); min-height: 100vh; }
    .menu-header { background: var(--cm-surface); border-bottom: 1px solid var(--cm-border); padding: 1.25rem 1rem; position: sticky; top: 0; z-index: 10; }
    .menu-header h1 { font-size: 1.5rem; font-weight: 800; color: var(--cm-text); margin: 0; }
    .menu-header p { font-size: 0.85rem; color: var(--cm-text-secondary); margin: 0.25rem 0 0 0; }
    .menu-category { padding: 1rem; }
    .menu-category h2 { font-size: 1.1rem; font-weight: 700; color: var(--cm-text); margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.5rem; }
    .menu-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
    .menu-item { background: var(--cm-surface); border: 1px solid var(--cm-border); border-radius: 16px; padding: 1rem; transition: all 0.15s; cursor: pointer; }
    .menu-item:hover { border-color: var(--cm-accent); }
    .menu-item.unavailable { opacity: 0.4; cursor: not-allowed; }
    .menu-item h3 { font-size: 0.95rem; font-weight: 700; color: var(--cm-text); margin: 0 0 0.25rem 0; }
    .menu-item .desc { font-size: 0.8rem; color: var(--cm-text-secondary); margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .menu-item .price { font-size: 1.1rem; font-weight: 800; color: var(--cm-accent); }
    .cart-bar { position: fixed; bottom: 0; left: 0; right: 0; background: var(--cm-surface); border-top: 1px solid var(--cm-border); padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 20; }
    .cart-bar .total { font-size: 1.1rem; font-weight: 800; color: var(--cm-text); }
    .cart-bar button { background: var(--cm-accent); color: white; border: none; border-radius: 12px; padding: 0.6rem 1.5rem; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .cart-bar button:disabled { opacity: 0.4; cursor: not-allowed; }
    .cm-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 30; display: flex; align-items: flex-end; justify-content: center; }
    .cm-modal-content { background: var(--cm-bg); border-radius: 24px 24px 0 0; width: 100%; max-width: 500px; max-height: 85vh; overflow-y: auto; padding: 1.5rem; }
    .cm-modal-content h2 { font-size: 1.3rem; font-weight: 800; color: var(--cm-text); margin-bottom: 1rem; }
    .cm-modal-content .field { margin-bottom: 1rem; }
    .cm-modal-content label { font-size: 0.8rem; font-weight: 600; color: var(--cm-text-secondary); display: block; margin-bottom: 0.3rem; }
    .cm-modal-content input, .cm-modal-content select, .cm-modal-content textarea { width: 100%; padding: 0.7rem; border-radius: 10px; border: 1px solid var(--cm-border); background: var(--cm-surface); color: var(--cm-text); font-size: 0.9rem; box-sizing: border-box; }
    .cm-modal-content textarea { resize: vertical; min-height: 60px; }
    .cm-modal-content .btn-primary { width: 100%; padding: 0.8rem; background: var(--cm-accent); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 0.5rem; }
    .cm-modal-content .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .cm-modal-content .btn-secondary { width: 100%; padding: 0.8rem; background: var(--cm-surface); color: var(--cm-text); border: 1px solid var(--cm-border); border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="menu-header">
    <h1>${icon("store", 24)} Menú Digital</h1>
    <p>${mesa ? `Mesa ${escapeHtml(String(mesa))}` : "Selecciona tus platos"}</p>
  </div>
  <div id="menuContainer"><div style="display:flex;align-items:center;justify-content:center;padding:3rem;gap:0.75rem;color:var(--cm-text-secondary)"><div class="cm-spinner"></div><span>Cargando menú...</span></div></div>
  <div class="cart-bar" id="cartBar" style="display:none">
    <span class="total" id="cartTotal">S/ 0.00</span>
    <button id="cartBtn" onclick="openCartModal()">Ver Pedido (<span id="cartCount">0</span>)</button>
  </div>
  <div id="cartModal" class="cm-modal" style="display:none">
    <div class="cm-modal-content">
      <h2>${icon("shopping-cart", 20)} Tu Pedido</h2>
      <div id="cartItems"></div>
      <div class="field"><label>Nombre</label><input type="text" id="inputName" placeholder="Tu nombre" maxlength="100" /></div>
      <div class="field"><label>Nota (opcional)</label><textarea id="inputNota" placeholder="Alguna observación..." maxlength="200"></textarea></div>
      <div class="field"><label>Método de pago</label><select id="inputPago"><option value="yape_plin">Yape/Plin</option><option value="efectivo">Efectivo</option><option value="pos">Tarjeta</option></select></div>
      <div id="orderSuccess" style="display:none;text-align:center;padding:2rem">
        <h3 style="color:var(--cm-accent);font-size:1.3rem">${icon("check", 32)} ¡Pedido enviado!</h3>
        <p style="color:var(--cm-text-secondary);margin-top:0.5rem">Tu número de pedido es <strong id="orderIdDisplay" style="color:var(--cm-text)"></strong></p>
      </div>
      <button class="btn-primary" id="submitBtn" onclick="submitOrder()">${icon("send", 18)} Enviar Pedido</button>
      <button class="btn-secondary" onclick="closeCartModal()">Seguir Comprando</button>
    </div>
  </div>
  <script>
    const BRANCH = ${JSON.stringify(branchId)};
    const MESA = ${mesa ? JSON.stringify(String(mesa)) : "null"};
    const FIREBASE_CONFIG = {
      apiKey: ${JSON.stringify(process.env.FIREBASE_API_KEY || "")},
      authDomain: ${JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || "")},
      databaseURL: ${JSON.stringify(process.env.FIREBASE_DATABASE_URL || defaultDbUrl)},
      projectId: ${JSON.stringify(process.env.FIREBASE_PROJECT_ID || "")},
    };
    firebase.initializeApp(FIREBASE_CONFIG);
    function escapeHtml(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    firebase.auth().signInAnonymously().catch((e) => console.warn("QR Menu: anonymous auth falló", e.message));
    const db = firebase.database();
    let products = {};
    let cart = {};
    let submitted = false;
    const productsRef = db.ref("branches/"+BRANCH+"/catalog/products");
    productsRef.on("value", (snap) => {
      products = snap.val() || {};
      renderProducts();
    });
    function renderProducts() {
      const cats = {};
      for (const [id, p] of Object.entries(products)) {
        const cat = p.category || "General";
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push({ id, ...p });
      }
      let html = "";
      for (const [cat, items] of Object.entries(cats)) {
        html += '<div class="menu-category"><h2>'+escapeHtml(cat)+'</h2><div class="menu-items">';
        for (const p of items) {
          const price = Number(p.base_price ?? p.price ?? 0);
          const available = p.available !== false;
          html += '<div class="menu-item'+(available?"":" unavailable")+'" onclick="'+(available?"addToCart('"+p.id+"')":"")+'"><h3>'+escapeHtml(p.name||"Producto")+'</h3>'+(p.description?'<div class="desc">'+escapeHtml(p.description)+'</div>':'')+'<div class="price">S/ '+price.toFixed(2)+'</div></div>';
        }
        html += '</div></div>';
      }
      document.getElementById("menuContainer").innerHTML = html || '<div style="text-align:center;padding:3rem;color:var(--cm-text-secondary)">No hay productos disponibles</div>';
      if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    }
    window.addToCart = function(id) {
      const p = products[id];
      if (!p || p.available === false) return;
      cart[id] = (cart[id] || 0) + 1;
      updateCart();
    };
    function updateCart() {
      const count = Object.values(cart).reduce((a, b) => a + b, 0);
      const total = Object.entries(cart).reduce((s, [id, qty]) => {
        const p = products[id];
        return s + (Number(p?.base_price ?? p?.price ?? 0) * qty);
      }, 0);
      document.getElementById("cartBar").style.display = count > 0 ? "flex" : "none";
      document.getElementById("cartCount").textContent = count;
      document.getElementById("cartTotal").textContent = "S/ "+total.toFixed(2);
    }
    window.openCartModal = function() {
      const itemsHtml = Object.entries(cart).map(([id, qty]) => {
        const p = products[id];
        return '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--cm-border)"><span>'+escapeHtml(p?.name||id)+' <strong>x'+qty+'</strong></span><span style="color:var(--cm-accent);font-weight:700">S/ '+((Number(p?.base_price??p?.price??0) * qty).toFixed(2))+'</span></div>';
      }).join("");
      document.getElementById("cartItems").innerHTML = itemsHtml;
      document.getElementById("orderSuccess").style.display = "none";
      document.getElementById("submitBtn").style.display = "block";
      document.getElementById("cartModal").style.display = "flex";
    };
    window.closeCartModal = function() { document.getElementById("cartModal").style.display = "none"; };
    window.submitOrder = async function() {
      if (submitted) return;
      const name = document.getElementById("inputName").value.trim();
      if (!name) { alert("Por favor ingresa tu nombre"); return; }
      submitted = true;
      const btn = document.getElementById("submitBtn");
      btn.innerHTML = '<div class="cm-spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';
      btn.disabled = true;
      const items = Object.entries(cart).map(([id, qty]) => {
        const p = products[id];
        return { id, name: p?.name || id, quantity: qty, price: Number(p?.base_price ?? p?.price ?? 0) };
      });
      let retried = false;
      const doFetch = async () => {
        let token = "";
        try { if (firebase.auth().currentUser) token = await firebase.auth().currentUser.getIdToken(); } catch(e) { console.warn("Token error:", e); }
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;
        const resp = await fetch("/api/orders", { method: "POST", headers, body: JSON.stringify({ branchId: BRANCH, customerName: name, items, observaciones: document.getElementById("inputNota").value.trim(), payment_method: document.getElementById("inputPago").value, order_type: MESA ? "Mesa" : "Para Llevar", mesa: MESA || null, source: "qr_menu" }) });
        if (!resp.ok && resp.status === 401 && !retried) { retried = true; try { await firebase.auth().currentUser.getIdToken(true); } catch(e) {} return doFetch(); }
        return resp.json();
      };
      try {
        const data = await doFetch();
        if (data.success) {
          document.getElementById("orderIdDisplay").textContent = "#"+data.orderId.slice(-6).toUpperCase();
          document.getElementById("orderSuccess").style.display = "block";
          document.getElementById("submitBtn").style.display = "none";
          cart = {}; updateCart();
        } else {
          alert(data.error || "Error al enviar pedido. Intenta de nuevo.");
          submitted = false;
          btn.innerHTML = " Enviar Pedido";
          btn.disabled = false;
        }
      } catch(e) {
        alert("Error de conexión. Verifica tu internet.");
        submitted = false;
        btn.innerHTML = " Enviar Pedido";
        btn.disabled = false;
      }
    };
  </script>
</body>
</html>`);
  });

  // ══════════════════════════════════════════════════════
  // API: Create Order (from frontend CartDrawer)
  // ══════════════════════════════════════════════════════
  app.post("/api/orders", requireAnonymousAuth, async (req, res) => {
    // ── Rate limiting: check AND increment before any async ──
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let rlEntry = rateLimitMap.get(ip);
    if (!rlEntry || now > rlEntry.resetAt) {
      rlEntry = { count: 0, resetAt: now + 60_000 };
      rateLimitMap.set(ip, rlEntry);
    }
    if (rlEntry.count >= 30) {
      console.warn(`Rate limit excedido para ${ip}`);
      res.status(429).json({ success: false, error: "Demasiados pedidos. Espera un momento e intenta nuevamente." });
      return;
    }
    rlEntry.count++;

    try {
      const { branchId, ...orderData } = req.body;
      console.log("📦 POST /api/orders — body keys:", Object.keys(req.body).join(", "));

      // ── branchId validation ──────────────────────────
      const knownBranches = getAllBranchIds().length > 0 ? getAllBranchIds() : ["default"];
      const bid = String(branchId || "").trim() || knownBranches[0] || "default";
      console.log("  branchId received:", branchId, "→ resolved:", bid, "known:", knownBranches.join(","));
      if (!knownBranches.includes(bid)) {
        res.status(400).json({ success: false, error: `Sucursal "${bid}" no válida.` });
        return;
      }

      // ── Validate required fields ─────────────────────
      console.log("  items?", Array.isArray(orderData.items), "length:", orderData.items?.length, "customerName:", JSON.stringify(orderData.customerName));
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        res.status(400).json({ success: false, error: "Se requiere al menos un item en el pedido" });
        return;
      }
      if (orderData.items.length > 50) {
        res.status(400).json({ success: false, error: "Demasiados items. Máximo 50 por pedido." });
        return;
      }
      if (!orderData.customerName?.trim()) {
        res.status(400).json({ success: false, error: "Se requiere el nombre del cliente" });
        return;
      }

      // ── Import Firebase helpers ──────────────────────
      const fb = await import("../lib/firebase.js");
      const db = fb.initFirebase();

      // ── Load catalog products from DB for price validation ──
      let catalogPrices: Record<string, number> = {};
      try {
        const catSnap = await fb.get(fb.child(fb.ref(db), `branches/${bid}/catalog/products`));
        if (catSnap.exists()) {
          const products = catSnap.val() as Record<string, any>;
          for (const [pid, p] of Object.entries(products)) {
            const cp = Number(p.base_price ?? p.price);
            if (!isNaN(cp) && cp > 0) catalogPrices[pid] = cp;
          }
        }
      } catch (e) {
        console.warn(`No se pudo cargar catálogo para ${bid}:`, e);
      }

      // ── Sanitize items & recalculate prices server-side ──
      const sanitizedItems = orderData.items.map((item: any, i: number) => {
        const rawPrice = Math.max(0, Number(item.price) || 0);
        const catalogPrice = catalogPrices[item.id] || 0;
        const validatedPrice = catalogPrice > 0
          ? catalogPrice
          : Math.min(rawPrice, 500); // cap at S/500 if no catalog match
        return {
          id: item.id || `item-${i}`,
          name: String(item.name || "Producto").slice(0, 120),
          quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
          price: validatedPrice,
          unitPrice: validatedPrice,
          ...(item.details?.length > 0 && { details: item.details }),
        };
      });
      const calculatedSubtotal = sanitizedItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

      // ── Server-validated delivery fee ─────────────────
      const isDelivery = String(orderData.order_type || "").trim() === "Delivery";
      const validatedDeliveryFee = isDelivery
        ? Math.min(50, Math.max(0, Number(orderData.deliveryFee) || 0))
        : 0;
      const grandTotal = calculatedSubtotal + validatedDeliveryFee;

      const ordersRef = fb.child(fb.ref(db), `branches/${bid}/orders`);
      const newRef = fb.push(ordersRef);
      const timestamp = new Date().toISOString();

      const order = {
        status: "recibido",
        customerName: String(orderData.customerName).trim().slice(0, 100),
        customerPhone: String(orderData.customerPhone || "").trim().slice(0, 20),
        customerEmail: String(orderData.customerEmail || "").trim().slice(0, 120),
        cliente: String(orderData.customerName).trim().slice(0, 100),
        location: String(orderData.location || "").slice(0, 300),
        items: sanitizedItems,
        observaciones: String(orderData.observaciones || "").slice(0, 200),
        nota: String(orderData.observaciones || orderData.nota || "").slice(0, 200),
        mesa: orderData.mesa ? Number(orderData.mesa) : null,
        deliveryFee: validatedDeliveryFee,
        packaging: orderData.packaging || {},
        payment_method: String(orderData.payment_method || "Pendiente").slice(0, 20),
        payment_status: String(orderData.payment_status || "pendiente").slice(0, 20),
        payment_details: orderData.payment_details || null,
        order_type: String(orderData.order_type || "Mesa").slice(0, 20),
        financials: {
          subtotal: Number(calculatedSubtotal.toFixed(2)),
          total: Number(grandTotal.toFixed(2)),
          deliveryFee: validatedDeliveryFee,
        },
        id: newRef.key,
        createdAt: timestamp,
        updatedAt: timestamp,
        source: orderData.source || "web",
        sessionId: orderData.sessionId || '',
      };

      // Multi-path update: write the order + the orders_by_session index atomically
      const updates = {
        [`branches/${bid}/orders/${newRef.key}`]: order,
      };
      if (orderData.sessionId) {
        updates[`branches/${bid}/orders_by_session/${orderData.sessionId}/${newRef.key}`] = true;
      }
      await fb.update(fb.ref(db), updates);
      console.log(`📦 Pedido #${newRef.key} — ${order.customerName} — S/ ${grandTotal.toFixed(2)}`);
      res.json({ success: true, orderId: newRef.key });
    } catch (e: any) {
      // Decrement rate limit counter on failure
      if (rlEntry) rlEntry.count = Math.max(0, rlEntry.count - 1);
      console.error("Error en POST /api/orders:", e);
      const msg = process.env.NODE_ENV === "production" ? "Error interno del servidor" : e.message;
      res.status(500).json({ success: false, error: `Error al crear pedido: ${msg}` });
    }
  });

  // ══════════════════════════════════════════════════════
  // API: Update Order Status (from KDS page)
  // ══════════════════════════════════════════════════════
  app.post("/api/orders/:orderId/status", requireAnonymousAuth, async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let rlEntry = rateLimitMap.get(ip);
    if (!rlEntry || now > rlEntry.resetAt) {
      rlEntry = { count: 0, resetAt: now + 60_000 };
      rateLimitMap.set(ip, rlEntry);
    }
    if (rlEntry.count >= 30) {
      console.warn(`Rate limit excedido para ${ip}`);
      res.status(429).json({ success: false, error: "Demasiados pedidos. Espera un momento e intenta nuevamente." });
      return;
    }
    rlEntry.count++;

    try {
      const { branchId, status } = req.body;
      const { orderId } = req.params;

      const knownBranches = getAllBranchIds().length > 0 ? getAllBranchIds() : ["default"];
      const bid = String(branchId || "").trim() || knownBranches[0] || "default";
      if (!knownBranches.includes(bid)) {
        res.status(400).json({ success: false, error: `Sucursal "${bid}" no válida.` });
        return;
      }

      const validStatuses = ["recibido", "preparando", "listo", "en_camino", "entregado", "cancelado"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, error: `Estado "${status}" no válido.` });
        return;
      }

      const fb = await import("../lib/firebase.js");
      const db = fb.initFirebase();

      // ── Check existence before update ────────────────
      const orderRef = fb.child(fb.ref(db), `branches/${bid}/orders/${orderId}`);
      const existingSnap = await fb.get(orderRef);
      if (!existingSnap.exists()) {
        res.status(404).json({ success: false, error: `Pedido #${orderId} no encontrado.` });
        return;
      }

      // ── Status transition validation ──────────────────
      const currentOrder = existingSnap.val();
      const allowed = ALLOWED_TRANSITIONS[currentOrder.status] || [];
      if (!allowed.includes(status)) {
        res.status(400).json({ success: false, error: "Transición no válida" });
        return;
      }

      await fb.update(orderRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      console.log(`🔄 KDS: Pedido #${orderId} → ${status}`);
      res.json({ success: true });
    } catch (e: any) {
      if (rlEntry) rlEntry.count = Math.max(0, rlEntry.count - 1);
      console.error("Error en POST /api/orders/:id/status:", e);
      const msg = process.env.NODE_ENV === "production" ? "Error interno del servidor" : e.message;
      res.status(500).json({ success: false, error: msg });
    }
  });

  // ══════════════════════════════════════════════════════
  // API: Webhook receiver for delivery platforms
  // ══════════════════════════════════════════════════════
  app.post("/api/webhooks/:provider", (req, res) => {
    const provider = req.params.provider;
    const branchId = String(req.query.branch || "").trim() || "";
    const knownBranches = getAllBranchIds().length > 0 ? getAllBranchIds() : ["default"];

    if (!knownBranches.includes(branchId)) {
      res.status(400).json({ error: `Sucursal "${branchId}" no válida para webhook` });
      return;
    }

    const normalized = normalizeProviderOrder(provider, req.body);
    if (!normalized) {
      res.status(400).json({ error: "Payload no reconocido" });
      return;
    }

    const dedupKey = `${provider}:${normalized.providerOrderId || JSON.stringify(normalized.items)}`;

    // Prevent duplicate webhooks
    if (webhookDedup.has(dedupKey)) {
      console.log(`Webhook [${provider}]: duplicado ignorado`);
      res.status(200).json({ success: true, dedup: true });
      return;
    }
    webhookDedup.set(dedupKey, Date.now());

    // Respond 202 immediately, process in background
    res.status(202).json({ success: true, message: "Pedido recibido" });

    processWebhookOrder(provider, branchId, normalized, dedupKey);
  });

  // ══════════════════════════════════════════════════════
  // MCP API routes
  // ══════════════════════════════════════════════════════
  app.post("/api/mcp/query", (req, res) => {
    const { tool, args, apikey } = req.body;
    const knownApiKey = process.env.API_KEY;
    if (!knownApiKey) {
      console.error("❌ API_KEY no configurada — MCP endpoint deshabilitado");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }
    if (apikey !== knownApiKey) {
      res.status(401).json({ error: "API key inválida" });
      return;
    }
    (async () => {
      try {
        const result = await (registry as any).execute(tool, args || {});
        res.json({ success: true, data: result });
      } catch (e: any) {
        console.error("MCP query error:", e);
        res.status(500).json({ success: false, error: e.message });
      }
    })();
  });

  // ══════════════════════════════════════════════════════
  // Socket.IO: WhatsApp QR events
  // ══════════════════════════════════════════════════════
  qrEmitter.on("qr", (qr: string) => {
    QRCode.toDataURL(qr, { width: 280, margin: 2 }, (_err, url) => {
      io?.emit("qr", url);
    });
  });
  qrEmitter.on("connected", () => {
    io?.emit("connected");
  });

  server.listen(port, () => {
    console.log(`🌐 HTTP Server: http://localhost:${port}`);
  });

  return { app, server };
}
