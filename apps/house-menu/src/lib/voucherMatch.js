/**
 * Voucher OCR — fuzzy matching helpers.
 *
 * Pure functions: normalizan nombres de productos (boleta vs orden de compra)
 * y emparejan items extraídos contra los items del PO (one-to-one greedy).
 * No dependen de Firebase ni de React — testeables en aislamiento.
 */

// Tokens que no aportan identidad al producto (unidades y conectores).
// Se quitan como palabra completa, nunca dentro de otra palabra (ej: "tunco").
const STOP_WORDS = new Set([
  'kg', 'gr', 'g', 'litro', 'l', 'lt', 'ml', 'unidad', 'und', 'un', 'docena', 'doc',
  'x', 'de', 'del', 'la', 'las', 'los', 'el',
]);

const MATCH_THRESHOLD = 0.6;

/**
 * Normaliza un nombre para comparación:
 * lowercase → quita acentos (NFD) → puntuación a espacios →
 * quita tokens de unidad/artículos → colapsa espacios → trim.
 */
export function normalizeForMatch(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w !== '' && !STOP_WORDS.has(w))
    .join(' ');
}

/** true si `short` aparece como palabra completa (delimitada por espacios) dentro de `long`. */
function isWordContained(short, long) {
  if (!short) return false;
  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(long);
}

/** Jaccard de conjuntos de palabras. */
function tokenOverlap(a, b) {
  const wa = new Set(a.split(' '));
  const wb = new Set(b.split(' '));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

/**
 * Score 0..1 para un par normalizado:
 * - igualdad exacta → 1
 * - contención por palabra (cualquier dirección) → 0.85
 * - si no, solape de tokens (Jaccard)
 */
function pairScore(extNorm, poNorm) {
  if (!extNorm || !poNorm) return 0;
  if (extNorm === poNorm) return 1;
  const short = extNorm.length <= poNorm.length ? extNorm : poNorm;
  const long = extNorm.length <= poNorm.length ? poNorm : extNorm;
  if (isWordContained(short, long)) return 0.85;
  return tokenOverlap(extNorm, poNorm);
}

function bestCandidate(extNorm, poNorms, used) {
  let bestId = null;
  let bestScore = 0;
  for (const [id, poNorm] of poNorms) {
    if (used.has(id)) continue;
    const score = pairScore(extNorm, poNorm);
    if (score >= MATCH_THRESHOLD && score > bestScore) {
      bestId = id;
      bestScore = score;
    }
  }
  return { id: bestId, score: bestScore };
}

/**
 * Empareja items extraídos de la boleta contra los items del PO.
 *
 * @param {Array<{name: string, quantity: number, unitCost: number}>} extractedItems
 * @param {Record<string, {name: string}>} poItems - items del PO keyed por ingredientId
 * @returns {{ matched: Array<{poIngredientId, name, quantity, unitCost, score}>,
 *             unmatched: Array<{name, quantity, unitCost}> }}
 *
 * Greedy one-to-one por score: el item extraído con el mejor match posible
 * elige primero; cada PO item se asigna como máximo una vez. Los que no llegan
 * al umbral (0.6) van a `unmatched` para revisión humana.
 */
export function fuzzyMatch(extractedItems, poItems) {
  const matched = [];
  const unmatched = [];
  const used = new Set();
  const poNorms = Object.entries(poItems || {}).map(([id, it]) => [id, normalizeForMatch(it?.name)]);

  const order = (extractedItems || [])
    .map((ext, i) => ({ ext, i, top: bestCandidate(normalizeForMatch(ext?.name), poNorms, used).score }))
    .sort((a, b) => b.top - a.top || a.i - b.i);

  for (const { ext } of order) {
    const extNorm = normalizeForMatch(ext?.name);
    const best = bestCandidate(extNorm, poNorms, used);
    if (best.id) {
      used.add(best.id);
      matched.push({
        poIngredientId: best.id,
        name: ext.name,
        quantity: Number(ext.quantity) || 0,
        unitCost: Number(ext.unitCost) || 0,
        score: best.score,
      });
    } else {
      unmatched.push({
        name: ext.name,
        quantity: Number(ext.quantity) || 0,
        unitCost: Number(ext.unitCost) || 0,
      });
    }
  }

  return { matched, unmatched };
}
