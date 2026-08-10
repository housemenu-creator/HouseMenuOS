/**
 * AI Service — Gemini Flash wrapper for Smart Create + Campaign
 *
 * Uses Gemini 2.0 Flash with JSON mode for structured output.
 * Falls back gracefully — never blocks the UI.
 */

export interface ProductDescription {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  isSpicy: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
}

export interface CampaignSuggestion {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

export interface AIProcessingStep {
  label: string;
  status: 'pending' | 'current' | 'done' | 'error';
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_DESCRIBE = `Eres un experto en gastronomía peruana. Analiza la imagen del plato y responde SOLO con JSON válido:
{
  "name": "Nombre del plato en español",
  "description": "Descripción corta y atractiva (max 120 caracteres)",
  "price": precio_sugerido_en_soles,
  "category": "categoría del plato",
  "tags": ["tag1", "tag2"],
  "isSpicy": true_o_false,
  "isVegan": true_o_false,
  "isGlutenFree": true_o_false
}
Categorías disponibles: {{CATEGORIES}}`;

const SYSTEM_CAMPAIGN = `Eres un experto en marketing gastronómico. Genera creativos para una campaña promocional. Responde SOLO con JSON válido:
{
  "heroTitle": "Título llamativo para el banner (max 50 chars)",
  "heroSubtitle": "Subtítulo atractivo (max 80 chars)",
  "ctaText": "Texto del botón (max 30 chars)",
  "discountType": "percentage",
  "discountValue": numero_entre_5_y_50
}`;

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY no configurada');
  return key;
}

async function geminiRequest(systemInstruction: string, parts: unknown[]): Promise<Record<string, unknown>> {
  const key = getApiKey();
  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respuesta vacía de Gemini');

  return JSON.parse(text);
}

/**
 * Envía una imagen a Gemini Flash y obtiene una descripción estructurada del plato.
 * @param imageBase64 - Imagen en base64 (con o sin prefijo data:image)
 * @param categories - Lista de categorías existentes para guiar la clasificación
 */
export async function describeProduct(
  imageBase64: string,
  categories: string[]
): Promise<ProductDescription> {
  const base64 = imageBase64.includes('base64,')
    ? imageBase64.split('base64,')[1]
    : imageBase64;

  const system = SYSTEM_DESCRIBE.replace('{{CATEGORIES}}', categories.join(', '));

  const result = await geminiRequest(system, [
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
    { text: 'Describe este plato en formato JSON.' },
  ]);

  return {
    name: String(result.name || 'Plato desconocido'),
    description: String(result.description || ''),
    price: Number(result.price) || 0,
    category: String(result.category || ''),
    tags: Array.isArray(result.tags) ? result.tags.map(String) : [],
    isSpicy: Boolean(result.isSpicy),
    isVegan: Boolean(result.isVegan),
    isGlutenFree: Boolean(result.isGlutenFree),
  };
}

/**
 * Genera creativos de campaña para un producto existente.
 * @param product - Datos del producto para contextualizar la generación
 */
export async function suggestCampaign(
  product: { name: string; base_price: number; category: string; description?: string }
): Promise<CampaignSuggestion> {
  const context = [
    `Producto: ${product.name}`,
    `Precio: S/ ${product.base_price}`,
    `Categoría: ${product.category}`,
    product.description ? `Descripción: ${product.description}` : '',
  ].filter(Boolean).join('\n');

  const result = await geminiRequest(SYSTEM_CAMPAIGN, [
    { text: context },
    { text: 'Genera creativos para campaña en formato JSON.' },
  ]);

  return {
    heroTitle: String(result.heroTitle || `🔥 ${product.name}`),
    heroSubtitle: String(result.heroSubtitle || ''),
    ctaText: String(result.ctaText || 'Ordenar Ahora'),
    discountType: result.discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Math.max(0, Number(result.discountValue) || 10),
  };
}

export interface VoucherLineItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  confidence: number; // 0-1
}

export interface VoucherExtractionResult {
  items: VoucherLineItem[];
  rawText?: string;
}

const SYSTEM_EXTRACT_VOUCHER = `Eres un experto en lectura de boletas/facturas peruanas (SUNAT).
Analiza la imagen y extrae SOLO las líneas de productos comprados.
Responde EXCLUSIVAMENTE con JSON válido:
{
  "items": [
    {
      "name": "Nombre del producto tal como aparece",
      "quantity": numero_cantidad,
      "unit": "kg|gr|unidad|litro|ml|docena",
      "unitCost": precio_unitario_en_soles,
      "confidence": 0_a_1
    }
  ]
}
Ignora: totales, impuestos, datos del proveedor, número de documento, fechas.
Si no se detecta unidad, usa "unidad".`;

/**
 * Extrae líneas de productos de una boleta/factura (imagen) usando Gemini Flash.
 * @param imageBase64 - Imagen en base64 (con o sin prefijo data:image)
 * @param expectedItems - Items esperados de la orden, para guiar la extracción
 */
export async function extractVoucher(
  imageBase64: string,
  expectedItems: Array<{ name: string; quantity: number; unit: string; unitCost: number }>
): Promise<VoucherExtractionResult> {
  const base64 = imageBase64.includes('base64,')
    ? imageBase64.split('base64,')[1]
    : imageBase64;

  const context = `Items esperados en la orden (para guiar la extracción):\n` +
    expectedItems.map(i => `- ${i.name}: ${i.quantity} ${i.unit} x S/ ${i.unitCost.toFixed(2)}`).join('\n');

  const result = await geminiRequest(SYSTEM_EXTRACT_VOUCHER, [
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
    { text: context },
    { text: 'Extrae las líneas de productos en formato JSON.' },
  ]);

  return {
    items: Array.isArray(result.items)
      ? result.items.map((it: any) => ({
          name: String(it.name || ''),
          quantity: Number(it.quantity) || 0,
          unit: String(it.unit || 'unidad'),
          unitCost: Number(it.unitCost) || 0,
          confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0.5)),
        }))
      : [],
    rawText: result.rawText,
  };
}

export const AI_STEPS_EXTRACT_VOUCHER: AIProcessingStep[] = [
  { label: 'Subiendo imagen...', status: 'pending' },
  { label: 'Analizando boleta con IA...', status: 'current' },
  { label: 'Extrayendo líneas de productos', status: 'pending' },
  { label: 'Emparejando con tu orden', status: 'pending' },
];

export const AI_STEPS_DESCRIBE: AIProcessingStep[] = [
  { label: 'Analizando imagen...', status: 'current' },
  { label: 'Reconociendo ingredientes', status: 'pending' },
  { label: 'Identificando categoría', status: 'pending' },
  { label: 'Calculando precio sugerido', status: 'pending' },
];

export const AI_STEPS_CAMPAIGN: AIProcessingStep[] = [
  { label: 'Analizando producto...', status: 'current' },
  { label: 'Generando título promocional', status: 'pending' },
  { label: 'Calculando descuento sugerido', status: 'pending' },
  { label: 'Creando banner preview', status: 'pending' },
];
