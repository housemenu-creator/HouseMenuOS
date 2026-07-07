import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describeProduct, suggestCampaign, AI_STEPS_DESCRIBE, AI_STEPS_CAMPAIGN } from '../aiService';

beforeEach(() => {
  vi.stubEnv('VITE_GEMINI_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('aiService', () => {
  describe('describeProduct', () => {
    it('lanza error si no hay VITE_GEMINI_API_KEY', async () => {
      await expect(describeProduct('fake-base64', ['Platos de Fondo']))
        .rejects.toThrow('VITE_GEMINI_API_KEY');
    });

    it('parsea respuesta JSON correctamente', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

      const mockResponse = {
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            name: 'Lomo Saltado',
            description: 'Clásico peruano',
            price: 28,
            category: 'Platos de Fondo',
            tags: ['Popular', 'Peruano'],
            isSpicy: false,
            isVegan: false,
            isGlutenFree: true,
          }) }] }
        }]
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await describeProduct('data:image/jpeg;base64,test', ['Platos de Fondo', 'Entradas']);
      expect(result.name).toBe('Lomo Saltado');
      expect(result.price).toBe(28);
      expect(result.category).toBe('Platos de Fondo');
      expect(result.tags).toContain('Popular');
      expect(result.isGlutenFree).toBe(true);
    });

    it('maneja respuesta vacía de Gemini', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [] } }] }),
      });

      await expect(describeProduct('base64test', ['Test'])).rejects.toThrow('Respuesta vacía');
    });

    it('maneja error HTTP de Gemini', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(describeProduct('base64test', ['Test'])).rejects.toThrow('Gemini API error: 400');
    });
  });

  describe('suggestCampaign', () => {
    it('lanza error sin API key', async () => {
      await expect(suggestCampaign({ name: 'Test', base_price: 20, category: 'Test' }))
        .rejects.toThrow('VITE_GEMINI_API_KEY');
    });

    it('genera campaña con valores por defecto si falta campo', async () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '{}' }] } }]
        }),
      });

      const result = await suggestCampaign({ name: 'Ceviche', base_price: 25, category: 'Entradas' });
      expect(result.heroTitle).toContain('Ceviche');
      expect(result.ctaText).toBe('Ordenar Ahora');
      expect(result.discountType).toBe('percentage');
      expect(result.discountValue).toBeGreaterThan(0);
    });
  });

  describe('step constants', () => {
    it('AI_STEPS_DESCRIBE tiene 4 pasos', () => {
      expect(AI_STEPS_DESCRIBE).toHaveLength(4);
    });

    it('AI_STEPS_CAMPAIGN tiene 4 pasos', () => {
      expect(AI_STEPS_CAMPAIGN).toHaveLength(4);
    });

    it('cada paso tiene label y status', () => {
      [...AI_STEPS_DESCRIBE, ...AI_STEPS_CAMPAIGN].forEach(step => {
        expect(step.label).toBeTruthy();
        expect(['pending', 'current', 'done', 'error']).toContain(step.status);
      });
    });
  });
});
