import { describe, it, expect } from 'vitest';
import { normalizeForMatch, fuzzyMatch } from '../voucherMatch';

describe('normalizeForMatch', () => {
  it('lowercase + quita acentos', () => {
    expect(normalizeForMatch('Limón')).toBe('limon');
    expect(normalizeForMatch('CEBOLLA ROJA')).toBe('cebolla roja');
    expect(normalizeForMatch('Papa')).toBe('papa');
  });

  it('quita unidades (kg, gr, g, litro, l, ml, unidad, und, un, docena, doc)', () => {
    expect(normalizeForMatch('Tomate 1kg')).toBe('tomate 1kg'); // "1kg" es un solo token: la unidad va pegada al número
    expect(normalizeForMatch('Tomate kg')).toBe('tomate');
    expect(normalizeForMatch('CEBOLLA ROJA KG')).toBe('cebolla roja');
    expect(normalizeForMatch('Papa 10 un')).toBe('papa 10');
    expect(normalizeForMatch('Lechuga x 5 und')).toBe('lechuga 5');
    expect(normalizeForMatch('Huevo doc')).toBe('huevo');
    expect(normalizeForMatch('Agua 1 litro')).toBe('agua 1');
  });

  it('quita artículos y conectores (de, del, la, los, las, el)', () => {
    expect(normalizeForMatch('BOLSA DE PAPA')).toBe('bolsa papa');
    expect(normalizeForMatch('Arroz del norte')).toBe('arroz norte');
    expect(normalizeForMatch('La molina')).toBe('molina');
  });

  it('reemplaza puntuación por espacio y colapsa whitespace', () => {
    expect(normalizeForMatch('Cilantro (manojo)')).toBe('cilantro manojo');
    expect(normalizeForMatch('Papa - blanca, 5kg')).toBe('papa blanca 5kg');
    expect(normalizeForMatch('   Aceite   Extra   ')).toBe('aceite extra');
  });

  it('maneja valores nulos/vacíos sin explotar', () => {
    expect(normalizeForMatch(null)).toBe('');
    expect(normalizeForMatch(undefined)).toBe('');
    expect(normalizeForMatch('')).toBe('');
    expect(normalizeForMatch('   ')).toBe('');
  });

  it('no rompe palabras que CONTIENEN tokens de unidad (ej: tunco, kunal)', () => {
    expect(normalizeForMatch('tunco')).toBe('tunco');
    expect(normalizeForMatch('unidad completa')).toBe('completa');
  });
});

describe('fuzzyMatch', () => {
  it('empareja "CEBOLLA ROJA KG" ↔ "cebolla roja" (contención por palabra tras normalizar)', () => {
    const po = { i1: { name: 'cebolla roja' }, i2: { name: 'tomate' } };
    const result = fuzzyMatch([{ name: 'CEBOLLA ROJA KG', quantity: 10, unitCost: 3.5 }], po);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      poIngredientId: 'i1',
      name: 'CEBOLLA ROJA KG',
      quantity: 10,
      unitCost: 3.5,
    });
    expect(result.matched[0].score).toBeGreaterThanOrEqual(0.6);
    expect(result.unmatched).toHaveLength(0);
  });

  it('empareja "Tomate 1kg" ↔ "tomate" y "Limon" ↔ "Limón"', () => {
    const po = { t: { name: 'tomate' }, l: { name: 'Limón' } };
    const result = fuzzyMatch([
      { name: 'Tomate 1kg', quantity: 5, unitCost: 4 },
      { name: 'Limon', quantity: 2, unitCost: 1 },
    ], po);
    expect(result.matched.map(m => m.poIngredientId).sort()).toEqual(['l', 't']);
  });

  it('empareja "Cilantro (manojo)" ↔ "cilantro"', () => {
    const result = fuzzyMatch([{ name: 'Cilantro (manojo)', quantity: 1, unitCost: 2 }], { c: { name: 'cilantro' } });
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].poIngredientId).toBe('c');
  });

  it('NO empareja plurales "Papas" ↔ "Papa" → va a unmatched', () => {
    const result = fuzzyMatch([{ name: 'Papas', quantity: 3, unitCost: 2.5 }], { p: { name: 'Papa' } });
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0]).toMatchObject({ name: 'Papas', quantity: 3, unitCost: 2.5 });
  });

  it('NO empareja "LECHUGA KG" contra un PO sin lechuga → unmatched, resto intacto', () => {
    const po = { c: { name: 'cebolla roja' }, t: { name: 'tomate' } };
    const result = fuzzyMatch([
      { name: 'CEBOLLA ROJA KG', quantity: 10, unitCost: 3.5 },
      { name: 'LECHUGA KG', quantity: 3, unitCost: 1.5 },
    ], po);
    expect(result.matched.map(m => m.poIngredientId)).toEqual(['c']);
    expect(result.unmatched.map(u => u.name)).toEqual(['LECHUGA KG']);
  });

  it('greedy one-to-one: cada PO item se empareja como máximo una vez', () => {
    const po = { t: { name: 'tomate' }, tb: { name: 'tomate baby' } };
    const result = fuzzyMatch([
      { name: 'TOMATE', quantity: 1, unitCost: 1 },
      { name: 'TOMATE', quantity: 2, unitCost: 2 },
    ], po);
    expect(result.matched).toHaveLength(2);
    const ids = result.matched.map(m => m.poIngredientId);
    expect(new Set(ids).size).toBe(2);
  });

  it('asigna el match de mayor score primero (greedy por score)', () => {
    const po = { g: { name: 'tomate grande' }, t: { name: 'tomate' } };
    const result = fuzzyMatch([
      { name: 'Tomate', quantity: 1, unitCost: 1 },
      { name: 'Tomate Grande', quantity: 2, unitCost: 2 },
    ], po);
    const byPo = Object.fromEntries(result.matched.map(m => [m.poIngredientId, m.name]));
    expect(byPo.g).toBe('Tomate Grande'); // el más específico se queda con el match exacto
    expect(byPo.t).toBe('Tomate');
  });

  it('token overlap por debajo del umbral (0.6) → no match', () => {
    const result = fuzzyMatch([{ name: 'papa amarilla', quantity: 1, unitCost: 1 }], { p: { name: 'papa blanca' } });
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });

  it('token overlap sobre el umbral → match (2 de 3 tokens)', () => {
    const result = fuzzyMatch([{ name: 'arroz extra norte', quantity: 1, unitCost: 1 }], { a: { name: 'arroz extra' } });
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].poIngredientId).toBe('a');
  });

  it('maneja entradas vacías', () => {
    expect(fuzzyMatch([], { a: { name: 'papa' } }).matched).toHaveLength(0);
    expect(fuzzyMatch([{ name: 'papa', quantity: 1, unitCost: 1 }], {}).unmatched).toHaveLength(1);
    expect(fuzzyMatch(null, null).matched).toHaveLength(0);
    expect(fuzzyMatch(null, null).unmatched).toHaveLength(0);
  });

  it('item extraído sin nombre → unmatched sin explotar', () => {
    const result = fuzzyMatch([{ name: '', quantity: 1, unitCost: 1 }], { a: { name: 'papa' } });
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });
});
