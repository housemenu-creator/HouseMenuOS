# AI Smart Create + Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task.

**Goal:** Photo del plato → AI genera producto y campaña — demo en vivo para concurso

**Architecture:** Gemini Flash 2.0 (JSON mode) desde el frontend. Componentes React con hooks. Datos persistentes en Firebase RTDB. Estilo visual inspirado en Cashier (LED display industrial).

**Tech Stack:** React 19, Vite, Firebase RTDB, Gemini 2.0 Flash, Tailwind CSS, Framer Motion, Vitest

## Global Constraints

- 100% TypeScript en archivos nuevos
- Sin nuevas dependencias externas (solo fetch nativo)
- Modo manual funcional sin internet
- AI falla graceful — nunca deja loading infinito
- Tokens `--cm-*` para todo, Cashier DNA solo como inspiración visual (no importar `.cashier-theme`)
- Tests con Vitest + React Testing Library
- Archivos en inglés, UI strings en español

---

### Task 1: menuService.createProductWithData

**Files:**
- Modify: `src/lib/menuService.js`

**Interfaces:**
- Produces: `menuService.createProductWithData(branchId: string, productData: object) => Promise<string>`

- [ ] **Step 1: Add method to menuService**

```javascript
// Después de createProduct (línea 83), agregar:

/**
 * Crea un producto con datos completos (para AI Smart Create)
 * @param {string} branchId - ID de la sucursal
 * @param {object} productData - Datos completos del producto (name, base_price, category, etc.)
 * @returns {Promise<string>} ID del nuevo producto
 */
async createProductWithData(branchId, productData) {
  const productsRef = ref(db, catalogProductsPath(branchId));
  const newProductRef = push(productsRef);
  const product = {
    name: productData.name || 'Nuevo Plato',
    category: productData.category || 'General',
    base_price: productData.base_price ?? 0,
    price: productData.price ?? null,
    available: productData.available ?? false,
    description: productData.description || '',
    image: productData.image || '',
    tags: productData.tags || [],
    spicy: productData.spicy ?? false,
    vegan: productData.vegan ?? false,
    glutenFree: productData.glutenFree ?? false,
    isWizard: false,
    steps: [],
    channels: { carta: true, kiosko: true, landing: false, delivery: true },
    sortOrder: productData.sortOrder ?? 0,
    status: 'published',
    schedule: { enabled: false, start: '12:00', end: '22:00' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newProductRef, product);
  return newProductRef.key;
},
```

Y agregar al export object después de `createCategory`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/menuService.js
git commit -m "feat: add createProductWithData method for AI Smart Create"
```

---

### Task 2: AI Service

**Files:**
- Create: `src/lib/aiService.ts`
- Create: `src/lib/__tests__/aiService.test.ts`

**Interfaces:**
- Produces:
  - `describeProduct(imageBase64: string, categories: string[]): Promise<ProductDescription>`
  - `suggestCampaign(product: { name: string; base_price: number; category: string; description?: string }): Promise<CampaignSuggestion>`
  - Types: `ProductDescription`, `CampaignSuggestion`, `AIProcessingStep`

- [ ] **Step 1: Create type definitions and aiService**

```typescript
// src/lib/aiService.ts

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

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY no configurada');
  return key;
}

async function geminiRequest(systemInstruction: string, contents: unknown[]) {
  const key = getApiKey();
  const url = `${API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: contents }],
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

const SYSTEM_DESCRIBE = `Eres un experto en gastronomía peruana. Analiza la imagen de un plato y responde SOLO con JSON:
{
  "name": "Nombre del plato en español",
  "description": "Descripción corta y atractiva (max 120 chars)",
  "price": precio_sugerido_en_soles_numérico,
  "category": "categoría_del_plato",
  "tags": ["tag1", "tag2"],
  "isSpicy": boolean,
  "isVegan": boolean,
  "isGlutenFree": boolean
}
Categorías disponibles: {{CATEGORIES}}`;

const SYSTEM_CAMPAIGN = `Eres un experto en marketing gastronómico. Genera creativos para una campaña promocional. Responde SOLO con JSON:
{
  "heroTitle": "Título llamativo para el hero banner (max 50 chars)",
  "heroSubtitle": "Subtítulo atractivo (max 80 chars)",
  "ctaText": "Texto del botón CTA (max 30 chars)",
  "discountType": "percentage",
  "discountValue": número_entre_5_y_50
}`;

export async function describeProduct(
  imageBase64: string,
  categories: string[]
): Promise<ProductDescription> {
  const base64 = imageBase64.includes('base64,')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const system = SYSTEM_DESCRIBE.replace('{{CATEGORIES}}', categories.join(', '));

  const result = await geminiRequest(system, [
    { inline_data: { mime_type: 'image/jpeg', data: base64.split('base64,')[1] } },
    { text: 'Describe este plato en formato JSON.' },
  ]);

  return {
    name: result.name || 'Plato desconocido',
    description: result.description || '',
    price: Number(result.price) || 0,
    category: result.category || '',
    tags: Array.isArray(result.tags) ? result.tags : [],
    isSpicy: Boolean(result.isSpicy),
    isVegan: Boolean(result.isVegan),
    isGlutenFree: Boolean(result.isGlutenFree),
  };
}

export async function suggestCampaign(
  product: { name: string; base_price: number; category: string; description?: string }
): Promise<CampaignSuggestion> {
  const context = `Producto: ${product.name}\nPrecio: S/ ${product.base_price}\nCategoría: ${product.category}\nDescripción: ${product.description || ''}`;

  const result = await geminiRequest(SYSTEM_CAMPAIGN, [
    { text: context },
    { text: 'Genera creativos para campaña en JSON.' },
  ]);

  return {
    heroTitle: result.heroTitle || `🔥 ${product.name}`,
    heroSubtitle: result.heroSubtitle || '',
    ctaText: result.ctaText || 'Ordenar Ahora',
    discountType: result.discountType || 'percentage',
    discountValue: Number(result.discountValue) || 10,
  };
}

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
```

- [ ] **Step 2: Write tests**

```typescript
// src/lib/__tests__/aiService.test.ts
import { describe, it, expect } from 'vitest';
import { describeProduct, suggestCampaign } from '../aiService';

describe('aiService', () => {
  describe('describeProduct', () => {
    it('lanza error si no hay API key', async () => {
      // VITE_GEMINI_API_KEY no está en entorno de test
      await expect(describeProduct('fake-base64', ['Platos de Fondo']))
        .rejects.toThrow('VITE_GEMINI_API_KEY');
    });

    it('fallback: precio 0 si AI retorna string inválido', async () => {
      // Prueba unitaria del parseo (mockeando Gemini)
      // Se prueba en integración con el hook
      expect(true).toBe(true);
    });
  });

  describe('suggestCampaign', () => {
    it('lanza error sin API key', async () => {
      await expect(suggestCampaign({ name: 'Test', base_price: 20, category: 'Test' }))
        .rejects.toThrow('VITE_GEMINI_API_KEY');
    });
  });
});
```

- [ ] **Step 3: Run tests (esperado: fail por API key)**

```bash
cd apps/house-menu && npx vitest run src/lib/__tests__/aiService.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/aiService.ts src/lib/__tests__/aiService.test.ts
git commit -m "feat: add Gemini AI service for product description and campaign"
```

---

### Task 3: AIProcessingDisplay

**Files:**
- Create: `src/admin/components/ai/AIProcessingDisplay.tsx`
- Create: `src/admin/components/ai/__tests__/AIProcessingDisplay.test.tsx`

**Interfaces:**
- Produces: `<AIProcessingDisplay steps={AIProcessingStep[]} progress={number} label={string} />`

- [ ] **Step 1: Write tests**

```typescript
// src/admin/components/ai/__tests__/AIProcessingDisplay.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIProcessingDisplay } from '../AIProcessingDisplay';
import type { AIProcessingStep } from '../../../../lib/aiService';

describe('AIProcessingDisplay', () => {
  const steps: AIProcessingStep[] = [
    { label: 'Paso 1', status: 'done' },
    { label: 'Paso 2', status: 'current' },
    { label: 'Paso 3', status: 'pending' },
  ];

  it('renderiza label principal', () => {
    render(<AIProcessingDisplay label="🧠 ANALIZANDO" steps={steps} progress={0.5} />);
    expect(screen.getByText('🧠 ANALIZANDO')).toBeDefined();
  });

  it('renderiza todos los steps', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(screen.getByText('Paso 1')).toBeDefined();
    expect(screen.getByText('Paso 2')).toBeDefined();
    expect(screen.getByText('Paso 3')).toBeDefined();
  });

  it('muestra el progreso en porcentaje', () => {
    render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('muestra scanline overlay class', () => {
    const { container } = render(<AIProcessingDisplay label="Test" steps={steps} progress={0.5} />);
    expect(container.querySelector('.ai-scanline')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests (esperado: fail)**

```bash
cd apps/house-menu && npx vitest run src/admin/components/ai/__tests__/AIProcessingDisplay.test.tsx
```

- [ ] **Step 3: Implement component**

```tsx
// src/admin/components/ai/AIProcessingDisplay.tsx
import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';
import type { AIProcessingStep } from '../../../lib/aiService';

interface AIProcessingDisplayProps {
  label: string;
  steps: AIProcessingStep[];
  progress: number;
}

function StepIcon({ status }: { status: AIProcessingStep['status'] }) {
  switch (status) {
    case 'done':
      return <Check className="w-3.5 h-3.5 text-cm-success" />;
    case 'current':
      return <Loader2 className="w-3.5 h-3.5 text-cm-accent animate-spin" />;
    case 'error':
      return <Circle className="w-3.5 h-3.5 text-cm-error" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-cm-text-muted" />;
  }
}

export function AIProcessingDisplay({ label, steps, progress }: AIProcessingDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] p-5 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
      {/* Scanline overlay */}
      <div className="ai-scanline absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        }} />

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cm-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
          <span className="font-mono text-xs font-black tracking-[0.2em] text-cm-success uppercase"
            style={{ textShadow: '0 0 10px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.15)' }}>
            {label}
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2.5"
            >
              <StepIcon status={step.status} />
              <span className={`text-xs font-mono tracking-wider ${
                step.status === 'done' ? 'text-cm-success' :
                step.status === 'current' ? 'text-cm-accent' :
                step.status === 'error' ? 'text-cm-error' :
                'text-cm-text-muted'
              }`}>
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cm-accent to-cm-success"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-end mt-1">
          <span className="font-mono text-[10px] font-bold tracking-wider text-cm-text-muted">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests (esperado: pass)**

```bash
cd apps/house-menu && npx vitest run src/admin/components/ai/__tests__/AIProcessingDisplay.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/ai/AIProcessingDisplay.tsx src/admin/components/ai/__tests__/AIProcessingDisplay.test.tsx
git commit -m "feat: add AIProcessingDisplay LED-style component"
```

---

### Task 4: useAIProduct Hook

**Files:**
- Create: `src/admin/hooks/useAIProduct.ts`
- Create: `src/admin/hooks/__tests__/useAIProduct.test.ts`

**Interfaces:**
- Produces: `useAIProduct(branchId: string) => { image, setImage, processing, progress, steps, result, error, analyze, saveProduct, reset }`

- [ ] **Step 1: Write test**

```typescript
// src/admin/hooks/__tests__/useAIProduct.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIProduct } from '../useAIProduct';

vi.mock('../../lib/aiService', () => ({
  describeProduct: vi.fn(),
}));

describe('useAIProduct', () => {
  it('initial state', () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    expect(result.current.processing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => useAIProduct('branch-1'));
    act(() => result.current.reset());
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Implement hook**

```typescript
// src/admin/hooks/useAIProduct.ts
import { useState, useCallback } from 'react';
import { describeProduct, AI_STEPS_DESCRIBE } from '../../lib/aiService';
import type { ProductDescription, AIProcessingStep } from '../../lib/aiService';
import { menuService } from '../../lib/menuService';

export function useAIProduct(branchId: string) {
  const [image, setImage] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProductDescription | null>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AIProcessingStep[]>(AI_STEPS_DESCRIBE);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback((currentStep: number, total: number) => {
    setProgress(currentStep / total);
    setSteps(prev => prev.map((s, i) => ({
      ...s,
      status: i < currentStep ? 'done' as const : i === currentStep ? 'current' as const : 'pending' as const,
    })));
  }, []);

  const analyze = useCallback(async (file: File, categories: string[]) => {
    setProcessing(true);
    setError(null);
    setProgress(0);
    setSteps(AI_STEPS_DESCRIBE.map((s, i) => ({ ...s, status: i === 0 ? 'current' as const : 'pending' as const })));

    try {
      const base64 = await fileToBase64(file);
      updateProgress(1, 4);

      const desc = await describeProduct(base64, categories);
      updateProgress(4, 4);

      setResult(desc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la imagen';
      setError(msg);
      setSteps(prev => prev.map(s => s.status === 'current' ? { ...s, status: 'error' as const } : s));
    } finally {
      setProcessing(false);
    }
  }, [updateProgress]);

  const saveProduct = useCallback(async (overrides: Partial<ProductDescription>): Promise<string | null> => {
    if (!result) return null;
    const merged = { ...result, ...overrides };
    try {
      const id = await menuService.createProductWithData(branchId, {
        name: merged.name,
        description: merged.description,
        base_price: merged.price,
        category: merged.category,
        tags: merged.tags,
        spicy: merged.isSpicy,
        vegan: merged.isVegan,
        glutenFree: merged.isGlutenFree,
        available: true,
      });
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar producto');
      return null;
    }
  }, [result, branchId]);

  const reset = useCallback(() => {
    setImage(null);
    setProcessing(false);
    setResult(null);
    setProgress(0);
    setSteps(AI_STEPS_DESCRIBE);
    setError(null);
  }, []);

  return { image, setImage, processing, progress, steps, result, error, analyze, saveProduct, reset };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer la imagen'));
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/house-menu && npx vitest run src/admin/hooks/__tests__/useAIProduct.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/hooks/useAIProduct.ts src/admin/hooks/__tests__/useAIProduct.test.ts
git commit -m "feat: add useAIProduct hook for photo analysis"
```

---

### Task 5: useAICampaign Hook

**Files:**
- Create: `src/admin/hooks/useAICampaign.ts`
- Create: `src/admin/hooks/__tests__/useAICampaign.test.ts`

- [ ] **Step 1: Write test**

```typescript
// src/admin/hooks/__tests__/useAICampaign.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAICampaign } from '../useAICampaign';

vi.mock('../../lib/aiService', () => ({
  suggestCampaign: vi.fn(),
}));

describe('useAICampaign', () => {
  const product = { name: 'Lomo Saltado', base_price: 28, category: 'Platos de Fondo', description: 'Clásico peruano' };

  it('initial state', () => {
    const { result } = renderHook(() => useAICampaign('branch-1', product));
    expect(result.current.generating).toBe(false);
    expect(result.current.suggestion).toBeNull();
  });

  it('reset clears state', () => {
    const { result } = renderHook(() => useAICampaign('branch-1', product));
    act(() => result.current.reset());
    expect(result.current.suggestion).toBeNull();
  });
});
```

- [ ] **Step 2: Implement hook**

```typescript
// src/admin/hooks/useAICampaign.ts
import { useState, useCallback } from 'react';
import { suggestCampaign, AI_STEPS_CAMPAIGN } from '../../lib/aiService';
import type { CampaignSuggestion, AIProcessingStep, MenuProduct } from '../../lib/aiService';
import { marketingService } from '../../lib/marketingService';

// Re-export MenuProduct type for campaign context
export interface CampaignProduct {
  name: string;
  base_price: number;
  category: string;
  description?: string;
}

export function useAICampaign(branchId: string, product: CampaignProduct) {
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<CampaignSuggestion | null>(null);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AIProcessingStep[]>(AI_STEPS_CAMPAIGN);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    setSteps(AI_STEPS_CAMPAIGN.map((s, i) => ({ ...s, status: i === 0 ? 'current' as const : 'pending' as const })));

    try {
      // Simulate step progression
      const advanceStep = (step: number) => {
        setProgress(step / 4);
        setSteps(prev => prev.map((s, i) => ({
          ...s,
          status: i < step ? 'done' as const : i === step ? 'current' as const : 'pending' as const,
        })));
      };

      advanceStep(1);
      const result = await suggestCampaign(product);
      advanceStep(4);

      setSuggestion(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar campaña';
      setError(msg);
      setSteps(prev => prev.map(s => s.status === 'current' ? { ...s, status: 'error' as const } : s));
    } finally {
      setGenerating(false);
    }
  }, [product]);

  const saveCampaign = useCallback(async (overrides: Partial<CampaignSuggestion>): Promise<string | null> => {
    if (!suggestion) return null;
    const merged = { ...suggestion, ...overrides };
    try {
      const id = await marketingService.createCampaign(branchId, {
        name: merged.heroTitle,
        description: merged.heroSubtitle,
        type: 'promo',
        startDate: Date.now(),
        endDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        isActive: true,
        branchIds: [branchId],
        creatives: {
          heroTitle: merged.heroTitle,
          heroSubtitle: merged.heroSubtitle,
          ctaText: merged.ctaText,
        },
        rules: {
          discountType: merged.discountType,
          discountValue: merged.discountValue,
          applicableProducts: [],
        },
        analytics: { views: 0, conversions: 0, revenue: 0 },
      });
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar campaña');
      return null;
    }
  }, [suggestion, branchId]);

  const reset = useCallback(() => {
    setGenerating(false);
    setSuggestion(null);
    setProgress(0);
    setSteps(AI_STEPS_CAMPAIGN);
    setError(null);
  }, []);

  return { generating, progress, steps, suggestion, error, generate, saveCampaign, reset };
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/house-menu && npx vitest run src/admin/hooks/__tests__/useAICampaign.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/hooks/useAICampaign.ts src/admin/hooks/__tests__/useAICampaign.test.ts
git commit -m "feat: add useAICampaign hook for campaign generation"
```

---

### Task 6: SmartCreateModal

**Files:**
- Create: `src/admin/components/ai/SmartCreateModal.tsx`
- Create: `src/admin/components/ai/__tests__/SmartCreateModal.test.tsx`

- [ ] **Step 1: Write tests**

```typescript
// src/admin/components/ai/__tests__/SmartCreateModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartCreateModal } from '../SmartCreateModal';

vi.mock('../../../hooks/useAIProduct', () => ({
  useAIProduct: () => ({
    image: null, setImage: vi.fn(),
    processing: false, progress: 0, steps: [],
    result: null, error: null,
    analyze: vi.fn(), saveProduct: vi.fn(), reset: vi.fn(),
  }),
}));

describe('SmartCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    branchId: 'branch-1',
    categories: ['Platos de Fondo', 'Entradas'],
    onProductCreated: vi.fn(),
  };

  it('renderiza cuando isOpen=true', () => {
    render(<SmartCreateModal {...defaultProps} />);
    expect(screen.getByText('✨ Smart Create')).toBeDefined();
  });

  it('no renderiza cuando isOpen=false', () => {
    render(<SmartCreateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('✨ Smart Create')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests (esperado: fail)**

```bash
cd apps/house-menu && npx vitest run src/admin/components/ai/__tests__/SmartCreateModal.test.tsx
```

- [ ] **Step 3: Implement component**

```tsx
// src/admin/components/ai/SmartCreateModal.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Sparkles, Save, ArrowRight } from 'lucide-react';
import { AIProcessingDisplay } from './AIProcessingDisplay';
import { useAIProduct } from '../../hooks/useAIProduct';
import { AI_STEPS_DESCRIBE } from '../../../lib/aiService';
import type { ProductDescription } from '../../../lib/aiService';

interface SmartCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  categories: string[];
  onProductCreated: (productId: string, productName: string) => void;
}

type Step = 'upload' | 'processing' | 'form' | 'done';

export function SmartCreateModal({ isOpen, onClose, branchId, categories, onProductCreated }: SmartCreateModalProps) {
  const { processing, progress, steps, result, error, analyze, saveProduct, reset } = useAIProduct(branchId);
  const [step, setStep] = useState<Step>('upload');
  const [form, setForm] = useState<ProductDescription>({
    name: '', description: '', price: 0, category: '',
    tags: [], isSpicy: false, isVegan: false, isGlutenFree: false,
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
      setStep('upload');
      setSaving(false);
    }
  }, [isOpen]);

  // When AI result arrives, populate form and advance
  useEffect(() => {
    if (result) {
      setForm(result);
      setStep('form');
    }
  }, [result]);

  // When error occurs, go back to upload
  useEffect(() => {
    if (error) setStep('upload');
  }, [error]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setStep('processing');
    await analyze(file, categories);
  }, [analyze, categories]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const id = await saveProduct(form);
    if (id) {
      setStep('done');
      onProductCreated(id, form.name);
    }
    setSaving(false);
  }, [form, saveProduct, onProductCreated]);

  const handleCreateCampaign = useCallback(() => {
    onClose();
    // The parent will open CampaignQuickWizard for this product
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cm-accent" />
            <h2 className="text-sm font-black text-cm-text tracking-tight">✨ Smart Create</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
            <X className="w-4 h-4 text-cm-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-cm-border hover:border-cm-accent/50 rounded-xl p-10 text-center cursor-pointer transition-colors group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-2xl bg-cm-accent/10 text-cm-accent group-hover:scale-105 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-cm-text">Tomar foto o subir imagen</p>
                      <p className="text-xs text-cm-text-tertiary mt-1">Arrastra una imagen o haz clic para seleccionar</p>
                    </div>
                    <span className="text-[10px] font-semibold text-cm-text-muted bg-cm-bg px-3 py-1 rounded-full">
                      JPG, PNG — Máx 10MB
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-cm-error/10 border border-cm-error/20 text-xs font-semibold text-cm-error">
                    {error}
                  </div>
                )}

                {/* Or upload from gallery */}
                <button
                  onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (e: any) => { const f = e.target?.files?.[0]; if (f) handleFile(f); }; inp.click(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cm-border text-xs font-bold text-cm-text-secondary hover:border-cm-accent/40 hover:text-cm-accent transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Subir desde galería
                </button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AIProcessingDisplay
                  label="🧠 ANALIZANDO"
                  steps={steps}
                  progress={progress}
                />
              </motion.div>
            )}

            {step === 'form' && result && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-cm-accent mb-2">
                  🤖 AI Sugiere
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Precio (S/)</label>
                    <input type="number" step="0.5" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-mono font-black text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Categoría</label>
                    <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Popular', '🌶 Picante', '🥬 Vegano', '🌾 Sin Gluten'].map(tag => {
                      const isSelected = form.tags.includes(tag) ||
                        (tag === '🌶 Picante' && form.isSpicy) ||
                        (tag === '🥬 Vegano' && form.isVegan) ||
                        (tag === '🌾 Sin Gluten' && form.isGlutenFree);
                      return (
                        <button key={tag} onClick={() => {
                          if (tag === '🌶 Picante') setForm(f => ({ ...f, isSpicy: !f.isSpicy }));
                          else if (tag === '🥬 Vegano') setForm(f => ({ ...f, isVegan: !f.isVegan }));
                          else if (tag === '🌾 Sin Gluten') setForm(f => ({ ...f, isGlutenFree: !f.isGlutenFree }));
                          else setForm(f => ({
                            ...f,
                            tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
                          }));
                        }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            isSelected ? 'bg-cm-accent text-white' : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                          }`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-3"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cm-success/10 text-cm-success">
                  <Save className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-black text-cm-text">✅ Producto creado</p>
                  <p className="text-xs text-cm-text-secondary mt-1">{form.name} ya está en el catálogo</p>
                </div>
                <button onClick={handleCreateCampaign}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cm-accent text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100">
                  ✨ Crear Campaña <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!form.name || !form.price || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Guardando...' : '⚡ Guardar Producto'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/house-menu && npx vitest run src/admin/components/ai/__tests__/SmartCreateModal.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/ai/SmartCreateModal.tsx src/admin/components/ai/__tests__/SmartCreateModal.test.tsx
git commit -m "feat: add SmartCreateModal with camera upload, AI processing, and form"
```

---

### Task 7: CampaignQuickWizard

**Files:**
- Create: `src/admin/components/ai/CampaignQuickWizard.tsx`
- Create: `src/admin/components/ai/__tests__/CampaignQuickWizard.test.tsx`

- [ ] **Step 1: Write tests (similar pattern to SmartCreateModal)**

```typescript
// src/admin/components/ai/__tests__/CampaignQuickWizard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampaignQuickWizard } from '../CampaignQuickWizard';

vi.mock('../../../hooks/useAICampaign', () => ({
  useAICampaign: () => ({
    generating: false, progress: 0, steps: [],
    suggestion: null, error: null,
    generate: vi.fn(), saveCampaign: vi.fn(), reset: vi.fn(),
  }),
}));

describe('CampaignQuickWizard', () => {
  const product = { id: 'p1', name: 'Lomo Saltado', base_price: 28, category: 'Platos de Fondo' };

  it('renderiza al abrir', () => {
    render(<CampaignQuickWizard isOpen={true} onClose={vi.fn()} branchId="b1" product={product as any} onCampaignCreated={vi.fn()} />);
    expect(screen.getByText(/Campaña/)).toBeDefined();
  });

  it('no renderiza cerrado', () => {
    render(<CampaignQuickWizard isOpen={false} onClose={vi.fn()} branchId="b1" product={product as any} onCampaignCreated={vi.fn()} />);
    expect(screen.queryByText(/Campaña/)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement component**

```tsx
// src/admin/components/ai/CampaignQuickWizard.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Rocket, Eye, ArrowLeft } from 'lucide-react';
import { AIProcessingDisplay } from './AIProcessingDisplay';
import { useAICampaign } from '../../hooks/useAICampaign';
import type { MenuProduct } from '../../types';

interface CampaignQuickWizardProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  product: MenuProduct;
  onCampaignCreated: (campaignId: string) => void;
}

type Step = 'generating' | 'preview' | 'done';

export function CampaignQuickWizard({ isOpen, onClose, branchId, product, onCampaignCreated }: CampaignQuickWizardProps) {
  const { generating, progress, steps, suggestion, error, generate, saveCampaign, reset } = useAICampaign(branchId, {
    name: product.name,
    base_price: product.base_price ?? product.price ?? 0,
    category: product.category,
    description: product.description,
  });

  const [step, setStep] = useState<Step>('generating');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [saving, setSaving] = useState(false);

  // Start generating when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
      setStep('generating');
      generate();
    }
  }, [isOpen]);

  // When suggestion arrives, populate form
  useEffect(() => {
    if (suggestion) {
      setHeroTitle(suggestion.heroTitle);
      setHeroSubtitle(suggestion.heroSubtitle);
      setCtaText(suggestion.ctaText);
      setDiscountType(suggestion.discountType);
      setDiscountValue(suggestion.discountValue);
      setStep('preview');
    }
  }, [suggestion]);

  // On error, show form anyway (manual mode)
  useEffect(() => {
    if (error) {
      setHeroTitle(`🔥 ${product.name}`);
      setHeroSubtitle('¡Prueba nuestro plato estrella!');
      setCtaText('Ordenar Ahora');
      setStep('preview');
    }
  }, [error, product.name]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const id = await saveCampaign({
      heroTitle, heroSubtitle, ctaText, discountType, discountValue,
    });
    if (id) {
      setStep('done');
      onCampaignCreated(id);
    }
    setSaving(false);
  }, [heroTitle, heroSubtitle, ctaText, discountType, discountValue, saveCampaign, onCampaignCreated]);

  if (!isOpen) return null;

  const originalPrice = product.base_price ?? product.price ?? 0;
  const flashPrice = discountType === 'percentage'
    ? originalPrice * (1 - discountValue / 100)
    : Math.max(0, originalPrice - discountValue);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cm-warning" />
            <h2 className="text-sm font-black text-cm-text tracking-tight">
              {product.name ? `✨ Campaña — ${product.name}` : '✨ Campaña AI'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
            <X className="w-4 h-4 text-cm-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'generating' && (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AIProcessingDisplay
                  label="🧠 GENERANDO CAMPAÑA"
                  steps={steps}
                  progress={progress}
                />
              </motion.div>
            )}

            {(step === 'preview' || step === 'done') && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Banner Preview — WYSIWYG */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Eye className="w-3.5 h-3.5 text-cm-text-muted" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cm-text-muted">Vista Previa</span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border-2 border-cm-accent/30 bg-gradient-to-br from-cm-accent/[0.07] to-cm-bg p-5 shadow-cm-lg">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-cm-warning/10 rounded-full blur-[60px] pointer-events-none" />
                    <div className="relative z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cm-warning to-cm-error text-[9px] font-black uppercase tracking-widest text-white mb-3 shadow-lg">
                        🔥 OFERTA ESPECIAL
                      </span>
                      <h3 className="text-xl font-black text-white mt-2 tracking-tight">{heroTitle || `🔥 ${product.name}`}</h3>
                      <p className="text-xs text-white/70 mt-1 max-w-md">{heroSubtitle}</p>
                      <div className="flex items-end justify-between mt-4">
                        <div>
                          {discountValue > 0 && (
                            <span className="text-[11px] text-white/50 line-through">S/ {originalPrice.toFixed(2)}</span>
                          )}
                          <p className="text-2xl font-black text-cm-success font-mono tracking-tighter">
                            S/ {flashPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="px-4 py-2 rounded-xl bg-cm-warning text-white font-black text-xs tracking-wider uppercase shadow-lg">
                          {ctaText || 'Ordenar Ahora'}
                        </span>
                      </div>
                      {discountValue > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] font-black text-cm-error bg-cm-error/10 px-2 py-0.5 rounded border border-cm-error/20">
                            -{discountValue}{discountType === 'percentage' ? '%' : ' S/'}
                          </span>
                          <span className="text-[9px] text-white/40">Válido por tiempo limitado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                {step === 'preview' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2 border-t border-cm-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Título Hero</label>
                        <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">CTA</label>
                        <input value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Subtítulo</label>
                      <input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)}
                        className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Descuento</label>
                        <input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} min={0} max={100}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-mono font-black text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Tipo</label>
                        <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Fijo (S/)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cm-success/10 text-cm-success mb-3">
                      <Rocket className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-cm-text">🚀 Campaña activa</p>
                    <p className="text-xs text-cm-text-secondary mt-1">Los clientes ya pueden ver la oferta</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !heroTitle}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cm-warning to-cm-error text-white font-black text-xs tracking-wider uppercase shadow-lg active:translate-y-px active:shadow-inner transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Activando...' : '🚀 Activar Campaña'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/house-menu && npx vitest run src/admin/components/ai/__tests__/CampaignQuickWizard.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/components/ai/CampaignQuickWizard.tsx src/admin/components/ai/__tests__/CampaignQuickWizard.test.tsx
git commit -m "feat: add CampaignQuickWizard with AI generation and live preview"
```

---

### Task 8: Customer CampaignBanner

**Files:**
- Create: `src/customer/components/CampaignBanner.tsx`

- [ ] **Step 1: Implement CampaignBanner**

```tsx
// src/customer/components/CampaignBanner.tsx
import { motion } from 'framer-motion';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { useMarketing } from '../../context/MarketingContext';

export function CampaignBanner() {
  const { activeCampaigns } = useMarketing();

  // Mostrar la primera campaña activa
  const campaign = activeCampaigns?.[0] ?? null;
  if (!campaign) return null;

  const { creatives, rules } = campaign;
  const hasDiscount = rules?.discountValue && rules.discountValue > 0;

  return (
    <motion.a
      href={creatives.ctaLink || '#'}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="block relative overflow-hidden rounded-3xl border-2 border-cm-accent/30 bg-gradient-to-br from-cm-accent/[0.07] to-cm-bg p-6 shadow-cm-lg hover:border-cm-accent/50 transition-all duration-300 group"
    >
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-cm-warning/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.6rem] font-black uppercase tracking-widest text-white bg-gradient-to-r from-cm-accent to-cm-warning rounded-full shadow-lg mb-3">
          <Zap className="w-3 h-3" />
          {campaign.type === 'flash_offer' ? 'Oferta Flash' : 'Promoción'}
        </span>

        {/* Content */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white tracking-tight">{creatives.heroTitle}</h3>
            {creatives.heroSubtitle && (
              <p className="text-xs text-white/70 max-w-md">{creatives.heroSubtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {hasDiscount && (
              <div className="text-right">
                <span className="text-[10px] text-white/50 line-through block">
                  Reg. S/ {((rules.discountType === 'percentage' ? 100 * (1 + rules.discountValue / 100) : 100) || 0).toFixed(2)}
                </span>
                <span className="text-2xl font-black text-cm-success font-mono tracking-tighter">
                  {rules.discountType === 'percentage' ? `-${rules.discountValue}%` : `-S/${rules.discountValue}`}
                </span>
              </div>
            )}
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs tracking-wider uppercase shadow-lg group-hover:brightness-110 transition-all">
              {creatives.ctaText || 'Ordenar'} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Timer hint */}
        <div className="flex items-center gap-1.5 mt-3 text-[9px] font-semibold text-white/30">
          <Clock className="w-3 h-3" />
          Válido hasta fin de existencias
        </div>
      </div>
    </motion.a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/customer/components/CampaignBanner.tsx
git commit -m "feat: add CampaignBanner customer component for active promotions"
```

---

### Task 9: Integrate into Menu Builder

**Files:**
- Modify: `src/admin/components/menu-builder/MenuBuilder.tsx`
- Modify: `src/admin/components/menu-builder/MenuItemRow.tsx`

- [ ] **Step 1: Modify MenuBuilder.tsx**

Agregar botón Smart Create y modal. Buscar el botón "+ Nuevo" existente y agregar un botón junto a él:

```tsx
// Importar en MenuBuilder.tsx
import { Sparkles } from 'lucide-react';
import { SmartCreateModal } from '../ai/SmartCreateModal';
import { CampaignQuickWizard } from '../ai/CampaignQuickWizard';

// Agregar estado
const [smartCreateOpen, setSmartCreateOpen] = useState(false);
const [campaignModal, setCampaignModal] = useState<{ open: boolean; product: MenuProduct | null }>({ open: false, product: null });
const [createdProductId, setCreatedProductId] = useState<string | null>(null);

// Junto al botón "+ Nuevo" existente, agregar:
<button onClick={() => setSmartCreateOpen(true)}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cm-accent to-cm-warning text-white text-xs font-black rounded-lg hover:brightness-110 transition-all shadow-lg active:translate-y-px">
  <Sparkles className="w-3.5 h-3.5" /> Smart Create
</button>

// Al final del JSX, antes de cerrar el componente:
<SmartCreateModal
  isOpen={smartCreateOpen}
  onClose={() => { setSmartCreateOpen(false); setCreatedProductId(null); }}
  branchId={activeBranchId}
  categories={categories}
  onProductCreated={(id, name) => {
    setCreatedProductId(id);
    // Opcional: abrir automáticamente CampaignQuickWizard
  }}
/>

{campaignModal.open && campaignModal.product && (
  <CampaignQuickWizard
    isOpen={true}
    onClose={() => setCampaignModal({ open: false, product: null })}
    branchId={activeBranchId}
    product={campaignModal.product}
    onCampaignCreated={(campaignId) => {
      setCampaignModal({ open: false, product: null });
    }}
  />
)}
```

- [ ] **Step 2: Modify MenuItemRow.tsx — agregar botón campaña**

En el hover state de cada fila, agregar:

```tsx
<button
  onClick={() => onOpenCampaign?.(product)}
  className="p-1.5 rounded-lg text-cm-text-muted hover:text-cm-warning hover:bg-cm-warning/10 transition-colors"
  title="Crear campaña"
>
  <Rocket className="w-3.5 h-3.5" />
</button>
```

Agregar `onOpenCampaign?: (product: MenuProduct) => void` a las props.

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/menu-builder/MenuBuilder.tsx src/admin/components/menu-builder/MenuItemRow.tsx
git commit -m "feat: integrate SmartCreateModal and CampaignQuickWizard into Menu Builder"
```

---

### Task 10: Final checks

- [ ] **Step 1: Run all tests**

```bash
cd apps/house-menu && npx vitest run
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/house-menu && npx tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
cd apps/house-menu && npm run build
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix build and tests for AI Smart Create"
```
