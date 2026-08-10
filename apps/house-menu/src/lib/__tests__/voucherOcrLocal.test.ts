import { describe, it, expect } from 'vitest';
import { parseBoletaText, canRunLocalOcr } from '../voucherOcrLocal';

describe('parseBoletaText', () => {
  it('extrae líneas de producto típicas de boleta térmica peruana', () => {
    const text = [
      'BOLETA DE VENTA',
      'RUC: 20123456789',
      'Julio Sernaque',
      '----------------------------------',
      'PAPA 10 KG S/ 2.50',
      'CEBOLLA CHINA 5 KG S/ 1.80',
      '----------------------------------',
      'TOTAL: S/ 34.00',
      'Gracias por su compra',
    ].join('\n');

    const items = parseBoletaText(text);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'PAPA', quantity: 10, unit: 'kg', unitCost: 2.5 });
    expect(items[1]).toMatchObject({ name: 'CEBOLLA CHINA', quantity: 5, unit: 'kg', unitCost: 1.8 });
  });

  it('soporta formato "1 sol x S/ 3.00" (unidad sol)', () => {
    const items = parseBoletaText('AJI LIMO 1 sol x S/ 3.00');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'AJI LIMO', quantity: 1, unit: 'sol', unitCost: 3 });
  });

  it('soporta precio sin prefijo S/', () => {
    const items = parseBoletaText('tomate 2 kg 4.50');
    expect(items[0]).toMatchObject({ name: 'tomate', quantity: 2, unit: 'kg', unitCost: 4.5 });
  });

  it('ignora líneas de totales/impuestos/datos', () => {
    const text = [
      'TOTAL: S/ 99.00',
      'IGV: S/ 5.00',
      'VUELTO S/ 1.00',
      'RUC: 20123456789',
      'yape al 999 888 777',
    ].join('\n');
    expect(parseBoletaText(text)).toHaveLength(0);
  });

  it('maneja comas decimales', () => {
    const items = parseBoletaText('arroz 1,5 kg S/ 7,76');
    expect(items[0]).toMatchObject({ quantity: 1.5, unitCost: 7.76 });
  });

  it('canRunLocalOcr es falso en node (sin window)', () => {
    expect(canRunLocalOcr()).toBe(false);
  });
});
