import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { EventEmitter } from "events";
import QRCode from "qrcode";
import { registry } from "../mcp/registry.js";

export const qrEmitter = new EventEmitter();

let io: SocketIOServer | null = null;

export function startHttpServer(port: number = 3000) {
  const app = express();
  const server = http.createServer(app);
  io = new SocketIOServer(server, {
    cors: { origin: ["http://localhost:3000", "http://127.0.0.1:3000"] },
  });

  app.use(express.json());

  // ── Health ────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      whatsapp_enabled: process.env.WHATSAPP_ENABLED === "true",
      uptime: process.uptime(),
    });
  });

  // ── QR Web UI ─────────────────────────────────────
  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HousePySbot - WhatsApp QR</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #070912;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 420px;
      width: 100%;
    }
    h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; }
    h1 span { color: #fbbf24; }
    p.sub { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-bottom: 2rem; }
    .qr-box {
      background: white; border-radius: 1.5rem; padding: 1.5rem;
      display: inline-block; box-shadow: 0 8px 32px rgba(251,191,36,0.15);
    }
    .qr-box img { width: 280px; height: 280px; image-rendering: pixelated; }
    .steps {
      margin-top: 2rem; text-align: left;
      background: rgba(255,255,255,0.05); border-radius: 1rem;
      padding: 1.25rem; border: 1px solid rgba(255,255,255,0.08);
    }
    .steps h3 {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
      color: rgba(255,255,255,0.4); margin-bottom: 0.75rem;
    }
    .steps ol { list-style: none; counter-reset: step; }
    .steps li {
      counter-increment: step; font-size: 0.85rem; padding: 0.4rem 0;
      color: rgba(255,255,255,0.7); display: flex; gap: 0.75rem;
    }
    .steps li::before {
      content: counter(step); background: #fbbf24; color: #000;
      font-weight: 800; width: 1.5rem; height: 1.5rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; flex-shrink: 0;
    }
    .status {
      margin-top: 1.5rem; padding: 0.75rem; border-radius: 0.75rem;
      font-size: 0.85rem; font-weight: 600;
    }
    .status.connected { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    .status.connected::before { content: "✅ "; }
    .status.disconnected { background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); }
    .status.disconnected::before { content: "⏳ "; }
    .whatsapp-icon {
      width: 48px; height: 48px; background: #25D366; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem; font-size: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="whatsapp-icon">💬</div>
    <h1>CHALY <span>WHATSAPP</span></h1>
    <p class="sub">Escanea el código QR para conectar tu WhatsApp</p>
    <div class="qr-box" id="qrContainer">
      <div id="qrPlaceholder" style="width:280px;height:280px;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.9rem;">Generando QR...</div>
      <img id="qrImage" style="display:none;width:280px;height:280px;" alt="QR Code" />
    </div>
    <div class="steps">
      <h3>Pasos</h3>
      <ol>
        <li>Abre WhatsApp en tu teléfono</li>
        <li>Toca los tres puntos ⋮ > Dispositivos vinculados</li>
        <li>Vincular un dispositivo</li>
        <li>Escanea este código QR</li>
      </ol>
    </div>
    <div id="status" class="status disconnected">Esperando conexión...</div>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const qrImg = document.getElementById('qrImage');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const statusEl = document.getElementById('status');
    socket.on('qr', (qrData) => {
      qrImg.src = qrData; qrImg.style.display = 'block';
      qrPlaceholder.style.display = 'none';
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'Escanea el QR con WhatsApp';
    });
    socket.on('connected', () => {
      statusEl.className = 'status connected';
      statusEl.textContent = 'WhatsApp conectado';
      qrPlaceholder.style.display = 'flex';
      qrPlaceholder.textContent = '✅ Conectado';
      qrImg.style.display = 'none';
    });
  </script>
</body>
</html>`);
  });

  // ── Auth middleware ───────────────────────────────
  const API_KEY = process.env.API_SECRET_KEY;
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!API_KEY) return next();
    const key = req.headers["x-api-key"] as string || req.query["api_key"] as string;
    if (key === API_KEY) return next();
    res.status(401).json({ error: "No autorizado. Proporciona x-api-key válido." });
  }

  // ── API: MCP Tool Execution ───────────────────────
  app.post("/api/mcp/:toolName", requireAuth, async (req, res) => {
    try {
      const { toolName } = req.params;
      const { branchId, args } = req.body;
      const tool = registry.get(toolName);
      if (!tool) {
        res.status(404).json({ error: `Tool "${toolName}" no encontrado` });
        return;
      }
      const result = await tool.execute(args || {}, branchId || "default");
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── API: Agent Message ────────────────────────────
  app.post("/api/agent", requireAuth, async (req, res) => {
    try {
      const { message, branchId = "default", agentId = "admin" } = req.body;
      const { processMessage } = await import("../agent/index.js");
      const result = await processMessage(message, branchId, [], agentId);
      res.json({ message: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Socket.io ─────────────────────────────────────
  io.on("connection", (socket) => {
    const onQr = (qr: string) => {
      QRCode.toDataURL(qr, { width: 280, margin: 2 }, (_err, url) => {
        socket.emit("qr", url);
      });
    };
    qrEmitter.on("qr", onQr);
    socket.on("disconnect", () => {
      qrEmitter.off("qr", onQr);
    });
  });

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
