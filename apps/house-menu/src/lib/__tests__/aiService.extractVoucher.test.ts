import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractVoucher, AI_STEPS_EXTRACT_VOUCHER } from '../aiService';

const realFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = realFetch;
});

function mockGeminiResponse(payload) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
  });
}

describe('extractVoucher', () => {
  it('lanza error si no hay VITE_GEMINI_API_KEY', async () => {
    await expect(extractVoucher('base64data', [])).rejects.toThrow('VITE_GEMINI_API_KEY');
  });

  it('quita el prefijo data:image antes de enviar a Gemini', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({ items: [] });

    await extractVoucher('data:image/jpeg;base64,raw-data-123', []);

    const [, opts] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.contents[0].parts[0].inline_data.data).toBe('raw-data-123');
  });

  it('pasa los items esperados como contexto en el prompt', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({ items: [] });

    await extractVoucher('base64data', [
      { name: 'cebolla roja', quantity: 10, unit: 'kg', unitCost: 3.5 },
    ]);

    const [, opts] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    const promptText = body.contents[0].parts.map(p => p.text || '').join('\n');
    expect(promptText).toContain('cebolla roja');
    expect(promptText).toContain('Items esperados en la orden');
  });

  it('parsea items estructurados y normaliza valores', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({
      items: [
        { name: 'CEBOLLA ROJA KG', quantity: 10, unit: 'kg', unitCost: 3.5, confidence: 0.9 },
        { name: 'TOMATE KG', quantity: 5, unit: 'kg', unitCost: 4.0, confidence: 0.6 },
      ],
    });

    const result = await extractVoucher('base64data', []);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      name: 'CEBOLLA ROJA KG',
      quantity: 10,
      unit: 'kg',
      unitCost: 3.5,
      confidence: 0.9,
    });
    expect(result.items[1].quantity).toBe(5);
  });

  it('clampa confidence fuera de rango a 0-1', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({
      items: [
        { name: 'Papa', quantity: 2, unitCost: 1.5, confidence: 1.7 },
        { name: 'Zanahoria', quantity: 1, unitCost: 0.8, confidence: -0.3 },
      ],
    });

    const result = await extractVoucher('base64data', []);

    expect(result.items[0].confidence).toBe(1);
    expect(result.items[1].confidence).toBe(0);
  });

  it('aplica defaults a campos faltantes y default unit "unidad"', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({
      items: [{ name: 'Limon' }],
    });

    const result = await extractVoucher('base64data', []);

    expect(result.items[0]).toEqual({
      name: 'Limon',
      quantity: 0,
      unit: 'unidad',
      unitCost: 0,
      confidence: 0.5,
    });
  });

  it('devuelve items vacios si la respuesta no trae un array', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    mockGeminiResponse({ items: 'nope' });

    const result = await extractVoucher('base64data', []);

    expect(result.items).toEqual([]);
  });

  it('propaga error HTTP de Gemini', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(extractVoucher('base64data', [])).rejects.toThrow('Gemini API error: 429');
  });

  it('propaga error de timeout (AbortError)', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const err = await extractVoucher('base64data', []).catch(e => e);
    expect(err.name).toBe('AbortError');
  });

  describe('AI_STEPS_EXTRACT_VOUCHER', () => {
    it('tiene 4 pasos con label y status', () => {
      expect(AI_STEPS_EXTRACT_VOUCHER).toHaveLength(4);
      AI_STEPS_EXTRACT_VOUCHER.forEach(step => {
        expect(step.label).toBeTruthy();
        expect(['pending', 'current', 'done', 'error']).toContain(step.status);
      });
    });
  });
});
