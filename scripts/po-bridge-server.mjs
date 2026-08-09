#!/usr/bin/env node
/**
 * PO Bridge Server — recibe POST de n8n, publica purchase_order.created via event-bus
 *
 * n8n llama a: POST http://localhost:3456/po/create
 * Response:    { success, poId, suggestedQty, eventId }
 *
 * Uso:
 *   node scripts/po-bridge-server.mjs
 *   npm run bridge          # desde root package.json
 */

import http from 'node:http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PO_BRIDGE_PORT || '3456', 10);
const ROOT = resolve(__dirname, '..');

// ── Cargar .env ──
try {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf-8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
} catch {}

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = data ? `[${ts}] [${level}] ${msg}` : `[${ts}] [${level}] ${msg}`;
  console.log(prefix);
  if (data) console.log(`  ${JSON.stringify(data)}`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      // Try JSON first
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json') || body.startsWith('{')) {
        try { return resolve(JSON.parse(body)); } catch {}
      }
      // Fallback: form-urlencoded
      const data = {};
      for (const part of body.split('&')) {
        const [k, v] = part.split('=').map(s => decodeURIComponent(s.replace(/\+/g, ' ')));
        // Try to parse nested object values (payload, etc.)
        if (v && (v.startsWith('{') || v.startsWith('['))) {
          try { data[k] = JSON.parse(v); } catch { data[k] = v; }
        } else if (v === '') {
          data[k] = '';
        } else if (!isNaN(v) && v.trim() !== '') {
          data[k] = Number(v);
        } else if (v === 'true') {
          data[k] = true;
        } else if (v === 'false') {
          data[k] = false;
        } else {
          data[k] = v;
        }
      }
      if (Object.keys(data).length) return resolve(data);
      reject(new Error('Cannot parse body'));
    });
    req.on('error', reject);
  });
}

function writeJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleCreatePO(req, res) {
  try {
    const data = await parseBody(req);
    const { eventId, tenantId, branchId, correlationId, occurredAt, payload, orderQty } = data;

    if (!payload?.productId || !payload?.supplierId) {
      writeJSON(res, 400, { error: 'Missing payload.productId or payload.supplierId' });
      return;
    }

    // Auth Firebase (bot user with write access)
    const { auth } = await import(pathToFileURL(resolve(ROOT, 'packages/db/index.js')).href);
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, process.env.BOT_FIREBASE_EMAIL, process.env.BOT_FIREBASE_PASSWORD);

    // PO ID único
    const poId = `po_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Calcular cantidad sugerida
    const suggestedQty = orderQty || Math.ceil((payload.minStock - payload.currentStock) * 1.2);

    // Publicar evento purchase_order.created via event bus
    const { pub } = await import(pathToFileURL(resolve(ROOT, 'packages/event-bus/index.js')).href);
    const poEvent = await pub('purchase_order.created', {
      purchaseOrderId: poId,
      supplierId: payload.supplierId,
      items: [{
        productId: payload.productId,
        productName: payload.productName || '(sin nombre)',
        quantity: suggestedQty,
        unit: 'kg',
        unitPrice: 0,
        total: 0,
      }],
      total: 0,
    }, {
      branchId: branchId || 'default',
      tenantId: tenantId || 'default',
      userEmail: 'n8n@houseportal.local',
      userRole: 'system',
    });

    const result = { success: true, poId, suggestedQty, eventId: poEvent.eventId, triggerEventId: eventId };
    log('info', `PO ${poId} creada (qty: ${suggestedQty}) para ${payload.productName}`, { poId, eventId: poEvent.eventId });
    writeJSON(res, 200, result);
  } catch (err) {
    log('error', `Error creando PO: ${err.message}`);
    writeJSON(res, 500, { error: err.message });
  }
}

// ── Server ──
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/po/create') return handleCreatePO(req, res);
  if (req.method === 'GET' && req.url === '/health') return writeJSON(res, 200, { status: 'ok', uptime: process.uptime() });
  writeJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  log('info', `Bridge server corriendo en http://localhost:${PORT}`);
  log('info', `POST /po/create — n8n llama aquí`);
  log('info', `GET  /health   — health check`);
});

// Graceful shutdown
process.on('SIGTERM', () => { log('info', 'SIGTERM — cerrando...'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { log('info', 'SIGINT — cerrando...'); server.close(() => process.exit(0)); });
process.on('uncaughtException', (err) => { log('error', 'Uncaught: ' + err.message); });
process.on('unhandledRejection', (err) => { log('error', 'Unhandled: ' + (err.message || err)); });
