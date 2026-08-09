/**
 * Seed completo: recetas, costos/stocks, proveedores, reglas de automatización
 * 
 * Lee el estado actual de Firebase, genera data artificial y la sube.
 * 
 * Uso: node scripts/seed-full-data.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const CWD = process.cwd();
const BRANCH = 'monteverde';
const NOW = new Date().toISOString();

// ── Leer estado actual ──
function fbGet(path) {
  const raw = execSync(`firebase database:get ${path} --project house-menuapp`, { encoding: 'utf8', cwd: CWD });
  return JSON.parse(raw);
}

function fbSet(path, file) {
  execSync(`firebase database:set ${path} ${file} --project house-menuapp --force`, { encoding: 'utf8', cwd: CWD });
}

console.log('📡 Leyendo estado actual de Firebase...');
const products = fbGet('/branches/' + BRANCH + '/catalog/products') || {};
const ingredients = fbGet('/branches/' + BRANCH + '/logistics/ingredients') || {};

const productList = Object.entries(products)
  .filter(([, p]) => p.name && p.base_price > 0 && p.name !== 'Plato de Ejemplo' && p.name !== 'Descarte')
  .map(([id, p]) => ({ id, name: p.name, category: p.category, base_price: p.base_price }));

console.log(`📦 ${productList.length} productos activos, ${Object.keys(ingredients).length} insumos cargados`);

// ═══════════════════════════════════════════════════════════
//  1. ACTUALIZAR INSUMOS: stocks y costos artificiales
// ═══════════════════════════════════════════════════════════

console.log('\n💰 Calculando costos y stocks...');

// costos base por unidad y stock inicial por tipo
const COST_MAP = {
  'ABARROTES':     { cost: [2, 8],   stock: [10, 50],  min: [3, 10] },
  'CONDIMENTOS':   { cost: [1, 5],   stock: [2, 15],   min: [1, 3] },
  'EMBUTIDOS':     { cost: [3, 10],  stock: [2, 8],    min: [1, 2] },
  'ENERGETICOS':   { cost: [30, 60], stock: [1, 4],    min: [1, 2] },
  'FRUTAS':        { cost: [1, 5],   stock: [5, 30],   min: [2, 8] },
  'LOCALES':       { cost: [2, 8],   stock: [2, 10],   min: [1, 3] },
  'PROTEINAS':     { cost: [8, 36],  stock: [3, 20],   min: [2, 5] },
  'SERVICIOS':     { cost: [800, 1500], stock: [1, 1], min: [1, 1] },
  'VERDURAS':      { cost: [1, 6],   stock: [5, 30],   min: [2, 8] },
  'GENERAL':       { cost: [2, 10],  stock: [5, 20],   min: [2, 5] },
};

function rand(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

const updatedIngredients = {};
for (const [id, ing] of Object.entries(ingredients)) {
  const config = COST_MAP[ing.category] || COST_MAP.GENERAL;
  updatedIngredients[id] = {
    ...ing,
    cost: rand(config.cost[0], config.cost[1]),
    stock: rand(config.stock[0], config.stock[1]),
    minStock: rand(config.min[0], config.min[1]),
    updatedAt: NOW,
  };
}

const ingJson = JSON.stringify(updatedIngredients, null, 2);
writeFileSync('scripts/seed-ingredients-updated.json', ingJson);

// ═══════════════════════════════════════════════════════════
//  2. RECETAS: vincular productos con insumos
// ═══════════════════════════════════════════════════════════

console.log('📝 Generando recetas artificiales...');

// Mapa de ingredientes por nombre (para búsqueda fuzzy)
const ingByName = {};
for (const [id, ing] of Object.entries(ingredients)) {
  const key = ing.name.toLowerCase().trim();
  ingByName[key] = { id, ...ing };
}

// Buscar ingrediente por substring en nombre
function findIngredient(substring) {
  const q = substring.toLowerCase();
  for (const [key, val] of Object.entries(ingByName)) {
    if (key.includes(q)) return val;
  }
  // intento más amplio
  for (const [key, val] of Object.entries(ingByName)) {
    const words = q.split(/\s+/);
    if (words.some(w => w.length > 2 && key.includes(w))) return val;
  }
  return null;
}

function findOrFallback(substrings) {
  for (const s of substrings) {
    const found = findIngredient(s);
    if (found) return found;
  }
  return null;
}

// Mapeo de recetas: producto → lista de [ingredientSubstring, cantidad, unidad]
const RECIPE_MAP = {};

// ── Carnes y Saltados ──
RECIPE_MAP['Bisteck a lo Pobre'] = [
  ['pulpa de res', 0.25, 'kg'], ['papa rosada', 0.3, 'kg'], ['platano', 1, 'und'],
  ['huevos', 2, 'und'], ['cebolla', 0.1, 'kg'], ['aceite mirasol', 0.05, 'und'],
  ['sal', 0.01, 'kg'], ['pimienta', 0.01, 'sol'],
];
RECIPE_MAP['Bisteck Frito'] = [
  ['pulpa de res', 0.25, 'kg'], ['arroz', 0.2, 'kg'], ['cebolla', 0.1, 'kg'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Bisteck Frito Fit'] = [
  ['pulpa de res', 0.2, 'kg'], ['lechuga', 0.05, 'und'], ['tomate', 0.05, 'kg'],
  ['aceite de oliva', 0.02, 'bot'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Lomo Saltado a lo Pobre'] = [
  ['pulpa de res', 0.3, 'kg'], ['papa rosada', 0.3, 'kg'], ['arroz', 0.2, 'kg'],
  ['cebolla', 0.15, 'kg'], ['tomate', 0.1, 'kg'], ['aceite mirasol', 0.05, 'und'],
  ['sillao', 0.02, 'bot'], ['vinagre', 0.02, 'bot'],
];
RECIPE_MAP['Lomo Saltado'] = [
  ['pulpa de res', 0.25, 'kg'], ['papa rosada', 0.25, 'kg'], ['arroz', 0.2, 'kg'],
  ['cebolla', 0.15, 'kg'], ['tomate', 0.1, 'kg'], ['aceite mirasol', 0.05, 'und'],
  ['sillao', 0.02, 'bot'], ['vinagre', 0.02, 'bot'],
];
RECIPE_MAP['Lomo Saltado E2E v2'] = [
  ['pulpa de res', 0.3, 'kg'], ['papa rosada', 0.3, 'kg'], ['arroz', 0.2, 'kg'],
  ['cebolla', 0.15, 'kg'], ['tomate', 0.1, 'kg'], ['sillao', 0.02, 'bot'],
];
RECIPE_MAP['Chuleta de Chancho'] = [
  ['chuletas cerdo', 1, 'unds'], ['camote amarillo', 0.2, 'kg'], ['arroz', 0.2, 'kg'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'], ['comino', 0.01, 'sol'],
];
RECIPE_MAP['Filete de Chancho'] = [
  ['pulpa de res', 0.2, 'kg'], ['arroz', 0.2, 'kg'], ['cebolla', 0.1, 'kg'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Apanado de Res'] = [
  ['pulpa de res', 0.2, 'kg'], ['pan casa', 2, 'und'], ['huevos', 1, 'und'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'],
];

// ── Parrilla y Pollos ──
RECIPE_MAP['Pechuga a la Plancha'] = [
  ['pechugas enteras', 1, 'und'], ['ensalada', 0.1, 'kg'], ['arroz', 0.2, 'kg'],
  ['aceite de oliva', 0.02, 'bot'], ['sal', 0.01, 'kg'], ['pimienta', 0.01, 'sol'],
];
RECIPE_MAP['Pollo Saltado'] = [
  ['pechugas enteras', 1, 'und'], ['cebolla', 0.15, 'kg'], ['tomate', 0.1, 'kg'],
  ['papa rosada', 0.2, 'kg'], ['arroz', 0.2, 'kg'], ['sillao', 0.02, 'bot'],
  ['aceite mirasol', 0.05, 'und'],
];
RECIPE_MAP['Pollo Saltado a lo Pobre'] = [
  ['pechugas enteras', 1, 'und'], ['cebolla', 0.15, 'kg'], ['tomate', 0.1, 'kg'],
  ['papa rosada', 0.3, 'kg'], ['arroz', 0.2, 'kg'], ['platano', 1, 'und'],
  ['huevos', 1, 'und'], ['sillao', 0.02, 'bot'],
];
RECIPE_MAP['Chicharrón de Pollo 100gr'] = [
  ['pechugas enteras', 0.5, 'und'], ['aceite mirasol', 0.1, 'und'], ['sal', 0.01, 'kg'],
  ['limon', 1, 'und'],
];
RECIPE_MAP['Chicharrón de Pollo 200gr'] = [
  ['pechugas enteras', 1, 'und'], ['aceite mirasol', 0.15, 'und'], ['sal', 0.01, 'kg'],
  ['limon', 2, 'und'],
];
RECIPE_MAP['Pollo Personal'] = [
  ['pechugas enteras', 1, 'und'], ['arroz', 0.2, 'kg'], ['ensalada', 0.1, 'kg'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Fuente de Chicharrones'] = [
  ['pechugas enteras', 2, 'und'], ['aceite mirasol', 0.3, 'und'], ['sal', 0.02, 'kg'],
  ['limon', 4, 'und'], ['camote amarillo', 0.3, 'kg'],
];

// ── Pollo al Horno ──
RECIPE_MAP['Pollo al Horno'] = [
  ['pechugas enteras', 1, 'und'], ['arroz', 0.2, 'kg'], ['papa rosada', 0.2, 'kg'],
  ['aceite de oliva', 0.02, 'bot'], ['sal', 0.01, 'kg'], ['comino', 0.01, 'sol'],
];
RECIPE_MAP['Pollo al Horno con Tallarines'] = [
  ['pechugas enteras', 1, 'und'], ['fideo tallarin', 0.2, 'paq'], ['aceite de oliva', 0.02, 'bot'],
  ['sal', 0.01, 'kg'], ['comino', 0.01, 'sol'],
];

// ── Ceviches ──
RECIPE_MAP['Ceviche de Pota'] = [
  ['pota', 0.2, 'kg'], ['limon', 5, 'und'], ['cebolla', 0.1, 'kg'],
  ['camote amarillo', 0.15, 'kg'], ['sal', 0.01, 'kg'], ['aji limo', 0.02, 'sol'],
  ['culantro', 0.02, 'kg'],
];
RECIPE_MAP['Ceviche de Filete'] = [
  ['filete merluza', 0.2, 'kg'], ['limon', 5, 'und'], ['cebolla', 0.1, 'kg'],
  ['camote amarillo', 0.15, 'kg'], ['sal', 0.01, 'kg'], ['aji limo', 0.02, 'sol'],
  ['culantro', 0.02, 'kg'],
];
RECIPE_MAP['Ceviche de Congrio'] = [
  ['filete merluza', 0.25, 'kg'], ['limon', 6, 'und'], ['cebolla', 0.15, 'kg'],
  ['camote amarillo', 0.2, 'kg'], ['sal', 0.01, 'kg'], ['aji limo', 0.02, 'sol'],
  ['culantro', 0.02, 'kg'],
];
RECIPE_MAP['Ceviche Mixto'] = [
  ['pota', 0.1, 'kg'], ['filete merluza', 0.1, 'kg'], ['limon', 6, 'und'],
  ['cebolla', 0.15, 'kg'], ['camote amarillo', 0.2, 'kg'], ['sal', 0.01, 'kg'],
  ['aji limo', 0.02, 'sol'], ['culantro', 0.02, 'kg'],
];
RECIPE_MAP['Ceviche + Chicharrón (Filete)'] = [
  ['filete merluza', 0.2, 'kg'], ['limon', 5, 'und'], ['cebolla', 0.1, 'kg'],
  ['camote amarillo', 0.15, 'kg'], ['papa rosada', 0.15, 'kg'], ['sal', 0.01, 'kg'],
  ['aji limo', 0.02, 'sol'], ['aceite mirasol', 0.05, 'und'],
];
RECIPE_MAP['Ceviche + Chicharrón (Congrio)'] = [
  ['filete merluza', 0.25, 'kg'], ['limon', 6, 'und'], ['cebolla', 0.15, 'kg'],
  ['camote amarillo', 0.2, 'kg'], ['papa rosada', 0.2, 'kg'], ['sal', 0.01, 'kg'],
  ['aceite mirasol', 0.05, 'und'],
];
RECIPE_MAP['Ceviche + Chicharrón (Mixto)'] = [
  ['pota', 0.1, 'kg'], ['filete merluza', 0.1, 'kg'], ['limon', 6, 'und'],
  ['cebolla', 0.15, 'kg'], ['camote amarillo', 0.2, 'kg'], ['papa rosada', 0.15, 'kg'],
  ['sal', 0.01, 'kg'], ['aceite mirasol', 0.05, 'und'],
];
RECIPE_MAP['Combo Ceviche + Chicharrón'] = [
  ['pota', 0.15, 'kg'], ['filete merluza', 0.15, 'kg'], ['limon', 8, 'und'],
  ['cebolla', 0.2, 'kg'], ['camote amarillo', 0.25, 'kg'], ['papa rosada', 0.2, 'kg'],
  ['sal', 0.02, 'kg'], ['aceite mirasol', 0.1, 'und'],
];
RECIPE_MAP['Pescado Frito'] = [
  ['filete merluza', 0.25, 'kg'], ['arroz', 0.2, 'kg'], ['limon', 3, 'und'],
  ['aceite mirasol', 0.1, 'und'], ['sal', 0.01, 'kg'],
];

// ── Seco/Milanesa ──
RECIPE_MAP['Seco de Cabrito'] = [
  ['pierna cabrito', 0.3, 'kg'], ['arroz', 0.2, 'kg'], ['chicha de jora', 0.1, 'bot'],
  ['culantro', 0.05, 'kg'], ['cebolla', 0.1, 'kg'], ['ajo pelado', 0.02, 'kg'],
  ['sal', 0.01, 'kg'], ['comino', 0.01, 'sol'], ['aceite mirasol', 0.05, 'und'],
];
RECIPE_MAP['Milanesa de Pollo'] = [
  ['pechugas enteras', 1, 'und'], ['pan casa', 2, 'und'], ['huevos', 1, 'und'],
  ['aceite mirasol', 0.05, 'und'], ['sal', 0.01, 'kg'], ['arroz', 0.2, 'kg'],
  ['papa rosada', 0.2, 'kg'],
];

// ── Promos ──
RECIPE_MAP['Arma tu Menú'] = [
  ['arroz', 0.2, 'kg'], ['pechugas enteras', 0.5, 'und'], ['ensalada', 0.1, 'kg'],
  ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Arma tu Causa'] = [
  ['papa rosada', 0.3, 'kg'], ['limon', 2, 'und'], ['aceite de oliva', 0.02, 'bot'],
  ['aji limo', 0.01, 'sol'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Tallarines Verdes con Pollo al Horno'] = [
  ['pechugas enteras', 1, 'und'], ['fideo tallarin', 0.2, 'paq'], ['albahaca', 0.05, 'kg'],
  ['espinaca', 0.05, 'kg'], ['aceite de oliva', 0.02, 'bot'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['Tallarines con Pollo al Horno'] = [
  ['pechugas enteras', 1, 'und'], ['fideo tallarin', 0.2, 'paq'], ['aceite de oliva', 0.02, 'bot'],
  ['sal', 0.01, 'kg'],
];

// ── Fit ──
RECIPE_MAP['Pollo a la Plancha Fit'] = [
  ['pechugas enteras', 1, 'und'], ['brocoli', 0.1, 'kg'], ['zanahoria', 0.1, 'kg'],
  ['aceite de oliva', 0.02, 'bot'], ['sal', 0.01, 'kg'],
];

// ── Ceviches (producto suelto) ──
RECIPE_MAP['Ceviches'] = [
  ['filete merluza', 0.2, 'kg'], ['limon', 5, 'und'], ['cebolla', 0.1, 'kg'],
  ['camote amarillo', 0.15, 'kg'], ['sal', 0.01, 'kg'],
];

// ── Chicharrones ──
RECIPE_MAP['Chicharrones'] = [
  ['pechugas enteras', 1, 'und'], ['aceite mirasol', 0.15, 'und'], ['limon', 2, 'und'],
  ['camote amarillo', 0.2, 'kg'],
];

// ── Bebidas Calientes ──
RECIPE_MAP['Café Pasado 8oz'] = [['azucar blanca', 0.01, 'kg']];
RECIPE_MAP['Café Pasado 16oz'] = [['azucar blanca', 0.02, 'kg']];
RECIPE_MAP['Espresso'] = [['azucar', 0.01, 'kg']];
RECIPE_MAP['Americano'] = [['azucar', 0.01, 'kg']];
RECIPE_MAP['Café Macchiato'] = [['leche gloria', 0.1, 'und'], ['azucar', 0.01, 'kg']];
RECIPE_MAP['Café Latte'] = [['leche gloria', 0.2, 'und'], ['azucar', 0.01, 'kg']];
RECIPE_MAP['Cappuccino'] = [['leche gloria', 0.15, 'und'], ['azucar', 0.01, 'kg']];
RECIPE_MAP['Café Mocha'] = [['leche gloria', 0.15, 'und'], ['azucar', 0.01, 'kg']];
RECIPE_MAP['Long Coffee'] = [['azucar', 0.01, 'kg']];
RECIPE_MAP['2 Cafés Pasados'] = [['azucar blanca', 0.02, 'kg']];

// ── Bebidas Frías ──
RECIPE_MAP['Iced Coffee'] = [['azucar', 0.01, 'kg'], ['leche gloria', 0.1, 'und']];
RECIPE_MAP['Iced Latte'] = [['leche gloria', 0.2, 'und'], ['azucar', 0.01, 'kg']];
RECIPE_MAP['Frappuccino'] = [['leche gloria', 0.2, 'und'], ['azucar', 0.02, 'kg']];
RECIPE_MAP['Affogato'] = [['leche gloria', 0.1, 'und']];

// ── Jugos Naturales ──
RECIPE_MAP['Jugo de Papaya 8oz'] = [['papaya', 0.2, 'kg'], ['azucar', 0.02, 'kg']];
RECIPE_MAP['Jugo de Piña 8oz'] = [['piña', 0.2, 'kg'], ['azucar', 0.02, 'kg']];
RECIPE_MAP['Jugo de Melón 8oz'] = [['melon', 0.2, 'kg'], ['azucar', 0.02, 'kg']];
RECIPE_MAP['Jugo de Fresa 8oz'] = [['fresa', 0.15, 'kg'], ['azucar', 0.02, 'kg']];
RECIPE_MAP['Jugo Surtido 8oz'] = [['papaya', 0.1, 'kg'], ['piña', 0.1, 'kg'], ['azucar', 0.02, 'kg']];

// ── Milkshakes ──
RECIPE_MAP['Milkshake de Fresa'] = [['leche gloria', 0.3, 'und'], ['fresa', 0.15, 'kg'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Milkshake de Oreo'] = [['leche gloria', 0.3, 'und'], ['azucar', 0.03, 'kg']];

// ── Bebidas Refrescantes ──
RECIPE_MAP['Limonada 500ml'] = [['limon', 3, 'und'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Limonada 1L'] = [['limon', 5, 'und'], ['azucar', 0.05, 'kg']];
RECIPE_MAP['Maracuyá 500ml'] = [['maracuya', 0.15, 'kg'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Maracuyá 1L'] = [['maracuya', 0.25, 'kg'], ['azucar', 0.05, 'kg']];
RECIPE_MAP['Chicha Morada 500ml'] = [['maiz morado', 0.1, 'kg'], ['azucar', 0.03, 'kg'], ['limon', 1, 'und']];
RECIPE_MAP['Chicha Morada 1L'] = [['maiz morado', 0.2, 'kg'], ['azucar', 0.05, 'kg'], ['limon', 2, 'und']];
RECIPE_MAP['Cebada 500ml'] = [['cebada negra', 0.05, 'kg'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Cebada 1L'] = [['cebada negra', 0.1, 'kg'], ['azucar', 0.05, 'kg']];
RECIPE_MAP['Jamaica 500ml'] = [['jamaica', 0.02, 'sol'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Jamaica 1L'] = [['jamaica', 0.04, 'sol'], ['azucar', 0.05, 'kg']];
RECIPE_MAP['Manzana 500ml'] = [['manzana roja', 1, 'kg'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Manzana 1L'] = [['manzana roja', 2, 'kg'], ['azucar', 0.05, 'kg']];
RECIPE_MAP['Karambola 500ml'] = [['carambola', 0.15, 'kg'], ['azucar', 0.03, 'kg']];
RECIPE_MAP['Karambola 1L'] = [['carambola', 0.25, 'kg'], ['azucar', 0.05, 'kg']];

// ── Adicionales ──
RECIPE_MAP['Huevo Frito'] = [['huevos', 1, 'und'], ['aceite mirasol', 0.02, 'und'], ['sal', 0.005, 'kg']];
RECIPE_MAP['Plátanos Fritos'] = [['platanos de freir', 1, 'und'], ['aceite mirasol', 0.03, 'und']];
RECIPE_MAP['Huevo y Plátanos Fritos'] = [['huevos', 1, 'und'], ['platanos de freir', 1, 'und'], ['aceite mirasol', 0.05, 'und']];
RECIPE_MAP['Ensalada Fresca'] = [
  ['lechuga', 0.5, 'und'], ['tomate', 0.1, 'kg'], ['zanahoria', 0.1, 'kg'],
  ['aceite de oliva', 0.02, 'bot'], ['limon', 1, 'und'],
];

// ── Especiales ──
RECIPE_MAP['Club Sandwich Clásico'] = [
  ['pan casa', 3, 'und'], ['pechugas enteras', 0.5, 'und'], ['lechuga', 0.3, 'und'],
  ['tomate', 0.1, 'kg'], ['huevos', 1, 'und'], ['mostaza', 0.02, 'kg'],
];
RECIPE_MAP['Combo Club Sandwich'] = [
  ['pan casa', 6, 'und'], ['pechugas enteras', 1, 'und'], ['lechuga', 0.5, 'und'],
  ['tomate', 0.15, 'kg'], ['huevos', 2, 'und'], ['papa rosada', 0.25, 'kg'],
  ['mostaza', 0.03, 'kg'],
];

// ── Otros ──
RECIPE_MAP['ALITAS'] = [
  ['alitas de pollo', 0.3, 'kg'], ['aceite mirasol', 0.1, 'und'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['SALCHIPAPAS'] = [
  ['papa rosada', 0.3, 'kg'], ['aceite mirasol', 0.1, 'und'], ['sal', 0.01, 'kg'],
];
RECIPE_MAP['ENCHILADAS'] = [
  ['pechugas enteras', 0.3, 'und'], ['aceite de oliva', 0.02, 'bot'], ['cebolla', 0.05, 'kg'],
  ['sal', 0.01, 'kg'],
];

// Generar recetas
function generateRecipes() {
  const now = NOW;
  const recipes = {};

  for (const prod of productList) {
    const mapping = RECIPE_MAP[prod.name];
    if (!mapping) continue;

    let totalCost = 0;
    const ingredientsMap = {};

    for (const [substr, qty, unit] of mapping) {
      const match = findOrFallback([substr]);
      if (!match) {
        console.warn(`  ⚠️  Ingrediente no encontrado para "${prod.name}": "${substr}"`);
        continue;
      }
      const unitCost = match.cost || rand(1, 5);
      const cost = qty * unitCost;
      totalCost += cost;
      ingredientsMap[match.id] = { name: match.name, quantity: qty, unit, unitCost };
    }

    const key = randomBytes(10).toString('base64url');
    recipes[key] = {
      productId: prod.id,
      productName: prod.name,
      productCategory: prod.category,
      productPrice: prod.base_price,
      ingredients: ingredientsMap,
      totalCost: Math.round(totalCost * 100) / 100,
      portionCost: Math.round((totalCost * 1.3) * 100) / 100, // 30% merma
      servings: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  return recipes;
}

const recipes = generateRecipes();

// ═══════════════════════════════════════════════════════════
//  3. PROVEEDORES
// ═══════════════════════════════════════════════════════════

console.log('🏭 Generando proveedores...');

const NEW_SUPPLIERS = [
  { name: 'Mercado Mayorista', contact: 'Carlos', phone: '999 888 777', email: 'mercado@mayorista.pe', notes: 'Verduras, frutas y abarrotes' },
  { name: 'Avícola El Pollón', contact: 'Pedro', phone: '988 777 666', email: 'pedro@avicola.pe', notes: 'Pollo, huevos y menudencias' },
  { name: 'Carnes Don José', contact: 'José', phone: '977 666 555', email: 'jose@carnes.pe', notes: 'Res, cerdo y embutidos' },
  { name: 'Pescados del Norte', contact: 'Miguel', phone: '966 555 444', email: 'miguel@pescados.pe', notes: 'Pescados, pota y mariscos' },
  { name: 'Distribuidora San Miguel', contact: 'Ana', phone: '955 444 333', email: 'ana@sanmiguel.pe', notes: 'Abarrotes, lácteos y condimentos' },
  { name: 'Café Selva Alta', contact: 'Juan', phone: '944 333 222', email: 'juan@cafeselva.pe', notes: 'Café en grano y bebidas calientes' },
  { name: 'Bebidas del Valle', contact: 'Luis', phone: '933 222 111', email: 'luis@bebidas.pe', notes: 'Gaseosas, aguas y bebidas frías' },
];

const suppliersData = {};
// Mantener proveedor existente
suppliersData['-OxaosJAflOzBG-NRLMF'] = {
  contact: 'Julio', createdAt: '2026-07-15T17:29:27.532Z',
  email: 'julio@gmail.com', name: 'Julio Sernaque',
  notes: 'Proveedor de Verduras', phone: '969 948 803',
  updatedAt: NOW,
};
for (const s of NEW_SUPPLIERS) {
  const key = randomBytes(12).toString('base64url');
  suppliersData[key] = {
    name: s.name, contact: s.contact, phone: s.phone,
    email: s.email, notes: s.notes,
    active: true,
    createdAt: NOW, updatedAt: NOW,
  };
}

// ═══════════════════════════════════════════════════════════
//  4. REGLAS DE AUTOMATIZACIÓN
// ═══════════════════════════════════════════════════════════

console.log('⚙️  Generando reglas de automatización...');

const AUTOMATION_RULES = {
  rule_stock_low: {
    name: 'Auto PO cuando stock bajo',
    eventType: 'inventory.stock.low',
    enabled: true,
    config: { quantityFormula: 'minStock * 1.5' },
    createdAt: NOW, updatedAt: NOW,
  },
  rule_po_created: {
    name: 'Notificar en PO creada',
    eventType: 'purchase_order.created',
    enabled: true,
    config: { notifyChannels: ['cocina', 'admin'] },
    createdAt: NOW, updatedAt: NOW,
  },
  rule_inventory_confirm: {
    name: 'Actualizar inventario al confirmar',
    eventType: 'purchase_order.confirmed',
    enabled: true,
    config: {},
    createdAt: NOW, updatedAt: NOW,
  },
  rule_order_ready: {
    name: 'Marcar como listo',
    eventType: 'purchase_order.ready',
    enabled: false,
    config: {},
    createdAt: NOW, updatedAt: NOW,
  },
  rule_order_close: {
    name: 'Cerrar OC al recibir',
    eventType: 'purchase_order.delivered',
    enabled: false,
    config: {},
    createdAt: NOW, updatedAt: NOW,
  },
  rule_daily_report: {
    name: 'Reporte diario de ventas',
    eventType: 'schedule.daily',
    enabled: true,
    config: { time: '21:00', notifyChannels: ['admin'] },
    createdAt: NOW, updatedAt: NOW,
  },
  rule_low_stock_alert: {
    name: 'Alertar stock crítico',
    eventType: 'inventory.stock.critical',
    enabled: true,
    config: { threshold: 'minStock * 0.5', notifyChannels: ['admin', 'compras'] },
    createdAt: NOW, updatedAt: NOW,
  },
};

// ═══════════════════════════════════════════════════════════
//  GENERAR JSON Y SUBIR
// ═══════════════════════════════════════════════════════════

const output = {
  recipes: {
    count: Object.keys(recipes).length,
    names: Object.values(recipes).map(r => r.productName),
  },
  ingredients_updated: Object.keys(updatedIngredients).length,
  suppliers: Object.keys(suppliersData).length,
  automation_rules: Object.keys(AUTOMATION_RULES).length,
};

console.log('\n══════════════════════════════════════');
console.log(`📊 RESUMEN:`);
console.log(`  Recetas:      ${output.recipes.count}`);
console.log(`  Insumos (cost/stock): ${output.ingredients_updated}`);
console.log(`  Proveedores:  ${output.suppliers}`);
console.log(`  Reglas auto:  ${output.automation_rules}`);
console.log('══════════════════════════════════════\n');

// Guardar archivos individuales
writeFileSync('scripts/seed-ingredients-updated.json', JSON.stringify(updatedIngredients, null, 2));
writeFileSync('scripts/seed-recipes.json', JSON.stringify(recipes, null, 2));
writeFileSync('scripts/seed-suppliers.json', JSON.stringify(suppliersData, null, 2));
writeFileSync('scripts/seed-automation-rules.json', JSON.stringify(AUTOMATION_RULES, null, 2));

// Subir a Firebase
console.log('📤 Subiendo ingredientes (stocks y costos)...');
fbSet('/branches/' + BRANCH + '/logistics/ingredients', 'scripts/seed-ingredients-updated.json');

console.log('📤 Subiendo recetas...');
fbSet('/branches/' + BRANCH + '/logistics/recipes', 'scripts/seed-recipes.json');

console.log('📤 Subiendo proveedores...');
fbSet('/branches/' + BRANCH + '/logistics/suppliers', 'scripts/seed-suppliers.json');

console.log('📤 Subiendo reglas de automatización...');
fbSet('/automation/rules', 'scripts/seed-automation-rules.json');

console.log('\n✅ TODO SUBIDO EXITOSAMENTE');
console.log(`\n📊 Productos con receta: ${output.recipes.count} de ${productList.length} activos`);
console.log(`💰 Insumos con costo/stock: ${output.ingredients_updated}`);
console.log(`🏭 Proveedores: ${output.suppliers}`);
console.log(`⚙️  Reglas de automatización: ${output.automation_rules}`);
