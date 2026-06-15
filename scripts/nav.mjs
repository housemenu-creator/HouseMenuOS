#!/usr/bin/env node
/**
 * nav — Ecosystem Navigation CLI
 * ===============================
 * Muestra el estado de todas las apps del monorepo y permite navegar entre ellas.
 *
 * Uso:
 *   node scripts/nav.mjs           → lista completa
 *   node scripts/nav.mjs house     → filtra apps que contengan "house"
 *   node scripts/nav.mjs --json    → output JSON para piping
 *   node scripts/nav.mjs --status  → solo health check
 *   node scripts/nav.mjs --open househub  → abre la app en el navegador
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const APPS_DIR = join(ROOT, "apps");
const BASE_TS = join(ROOT, "tsconfig.base.json");

/* ─── Helpers ─────────────────────────────────────── */

function readJSON(p) {
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return null; }
}

function loadApp(name) {
  const dir = join(APPS_DIR, name);
  const pkg = readJSON(join(dir, "package.json"));
  if (!pkg) return null;

  const scripts = Object.keys(pkg.scripts || {});
  const hasTS = existsSync(join(dir, "tsconfig.json"));
  const hasSrc = existsSync(join(dir, "src"));
  const hasTests = scripts.some((s) => s.startsWith("test"));
  const hasLint = scripts.some((s) => s === "lint");

  // Detect main tech
  let tech = "?";
  if (pkg.dependencies?.react || pkg.devDependencies?.vite) tech = "⚛️ React";
  else if (pkg.dependencies?.telegraf || pkg.dependencies?.baileys) tech = "🤖 Bot";
  else if (pkg.scripts?.dev?.includes("tsx")) tech = "🟦 Node/TS";
  else if (pkg.scripts?.dev === "vite") tech = "⚡ Vite";

  // Detect type
  let type = pkg.scripts?.dev?.includes("vite") ? "frontend" : "backend";
  if (pkg.name?.includes("game") || pkg.name?.includes("piramid")) type = "game";
  if (tech === "🤖 Bot") type = "bot";

  // Last modified (most recent src file)
  let lastMod = "—";
  if (hasSrc) {
    try {
      const files = walkDir(join(dir, "src"));
      if (files.length > 0) {
        const newest = Math.max(...files.map((f) => statSync(f).mtimeMs));
        lastMod = formatTimeAgo(newest);
      }
    } catch { /* ignore */ }
  }

  return {
    name,
    description: pkg.description || "",
    tech,
    type,
    port: extractPort(pkg.scripts?.dev || ""),
    scripts: {
      dev: pkg.scripts?.dev || "—",
      build: pkg.scripts?.build || "—",
      test: hasTests,
      lint: hasLint,
    },
    config: { tsconfig: hasTS, src: hasSrc },
    lastModified: lastMod,
  };
}

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

function extractPort(cmd) {
  const m = cmd.match(/--port\s+(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function formatTimeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

/* ─── Views ─────────────────────────────────────────── */

function renderTable(apps) {
  const header = "APP".padEnd(22) + "TIPO".padEnd(12) + "TEC".padEnd(10) + "SCRIPTS".padEnd(16) + "ÚLTIMO CAMBIO";
  const sep = "─".repeat(header.length);
  const rows = [header, sep];

  for (const a of apps) {
    const name = a.name.padEnd(22);
    const type = a.type.padEnd(12);
    const tech = a.tech.padEnd(10);
    const sc = [];
    if (a.scripts.dev !== "—") sc.push("dev");
    if (a.scripts.build !== "—") sc.push("build");
    if (a.scripts.test) sc.push("test");
    if (a.scripts.lint) sc.push("lint");
    const s = sc.join(",").padEnd(16);
    const lm = a.lastModified;
    rows.push(`${name}${type}${tech}${s}${lm}`);
  }

  return rows.join("\n");
}

function renderStatus(apps) {
  const total = apps.length;
  const withTS = apps.filter((a) => a.config.tsconfig).length;
  const withTests = apps.filter((a) => a.scripts.test).length;
  const frontends = apps.filter((a) => a.type === "frontend").length;
  const backends = apps.filter((a) => a.type === "backend").length;
  const bots = apps.filter((a) => a.type === "bot").length;
  const games = apps.filter((a) => a.type === "game").length;

  const lines = [
    `🏗️  House-Portal-OS  —  ${total} apps`,
    "",
    `   ${"Apps".padEnd(20)} ${total}`,
    `   ${"Frontends".padEnd(20)} ${frontends}`,
    `   ${"Backends".padEnd(20)} ${backends}`,
    `   ${"Bots".padEnd(20)} ${bots}`,
    `   ${"Games".padEnd(20)} ${games}`,
    `   ${"Con TypeScript".padEnd(20)} ${withTS}`,
    `   ${"Con tests".padEnd(20)} ${withTests}`,
    "",
    "   Comandos rápidos:",
    "   nav              Listar apps",
    "   nav --status     Este resumen",
    "   nav --json       Output JSON",
    "   nav <filtro>     Filtrar apps",
    "   dev:<app>        Iniciar dev server",
    "   typecheck:<app>  Typecheck",
    "   test:<app>       Tests",
    "   build:<app>      Build",
  ];

  return lines.join("\n");
}

/* ─── Main ──────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const asStatus = args.includes("--status");
  const filter = args.filter((a) => !a.startsWith("--")).join(" ");

  // Load all apps
  const entries = readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => loadApp(e.name))
    .filter(Boolean);

  // Filter
  let filtered = entries;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = entries.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.type.includes(q)
    );
  }

  if (asJson) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (asStatus) {
    console.log(renderStatus(entries));
    return;
  }

  console.log(`\n🏗️  House-Portal-OS  —  ${entries.length} apps${filter ? `  (filtro: "${filter}")` : ""}\n`);
  console.log(renderTable(filtered));
  console.log(`\n📖  Usa --status para resumen, --json para output machine-readable\n`);
}

main();
