/**
 * Seed: lee insumos.xlsx y sube los ingredientes a Firebase
 * Uso: node scripts/seed-ingredients-from-xlsx.mjs
 */
import pkg from 'xlsx';
import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

const { readFile, utils } = pkg;

const BRANCH_ID = 'monteverde';
const FILE = 'C:/Users/archiphone/Downloads/insumos.xlsx';
const OUTPUT = 'scripts/seed-ingredients.json';

// ── Extraer insumos del Excel ──
function extractIngredients() {
  const wb = readFile(FILE);
  const sheet = wb.Sheets['COMPRAS'] || wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet, { defval: '' });

  const seen = new Set();
  const ingredients = [];

  for (const row of rows) {
    const name = (row['__EMPTY_3'] || '').trim();
    // Filtrar headers, totales, filas vacías
    if (!name || name === 'PRODUCTOS' || name === 'TOTALSEMANAL' || /^TOTAL/i.test(name)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const category = (row['__EMPTY_18'] || 'GENERAL').trim();
    const unit = normalizeUnit(row['__EMPTY_2']);
    const cargo = (row['__EMPTY_19'] || '').trim();

    ingredients.push({ name, unit, category, cargo });
  }

  return ingredients;
}

function normalizeUnit(u) {
  const raw = (u || '').trim().toLowerCase();
  if (/kg|kilo/i.test(raw)) return 'kg';
  if (/und|unds|un|unid/i.test(raw)) return 'und';
  if (/paq|paquete/i.test(raw)) return 'paq';
  if (/lt|ltr|litro/i.test(raw)) return 'lt';
  if (/bot|botella/i.test(raw)) return 'bot';
  if (/bal/i.test(raw)) return 'bal';
  if (/bid/i.test(raw)) return 'bid';
  if (/lat|lata/i.test(raw)) return 'lata';
  if (/ser/i.test(raw)) return 'serv';
  if (/sol|soles/i.test(raw)) return 'sol';
  if (/pot/i.test(raw)) return 'pot';
  if (/mens/i.test(raw)) return 'mes';
  return raw || 'und';
}

// ── Generar JSON para Firebase CLI ──
function main() {
  console.log('📖 Leyendo', FILE);
  const ingredients = extractIngredients();
  console.log(`✅ ${ingredients.length} insumos encontrados\n`);

  // Mostrar preview agrupado
  const byCat = {};
  for (const ing of ingredients) {
    if (!byCat[ing.category]) byCat[ing.category] = [];
    byCat[ing.category].push(ing.name);
  }
  for (const [cat, items] of Object.entries(byCat)) {
    console.log(`  ${cat} (${items.length}):`);
    items.forEach(n => console.log(`    • ${n}`));
  }

  // Generar nodos con push keys
  const now = new Date().toISOString();
  const data = {};
  for (const ing of ingredients) {
    const key = randomBytes(12).toString('base64url');
    data[key] = {
      name: ing.name,
      unit: ing.unit,
      stock: 0,
      minStock: 0,
      cost: 0,
      category: ing.category,
      cargo: ing.cargo,
      createdAt: now,
      updatedAt: now,
    };
  }

  writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
  console.log(`\n📄 JSON guardado en ${OUTPUT}`);
  console.log(`\n▶ Para subir ejecutá:`);
  console.log(`  firebase database:set /branches/${BRANCH_ID}/logistics/ingredients ${OUTPUT} --project house-menuapp`);
}

main();
