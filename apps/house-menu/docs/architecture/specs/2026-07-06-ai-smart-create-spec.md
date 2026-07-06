# AI Smart Create + Campaign — Spec

**Date:** 2026-07-06
**Status:** Draft
**Author:** Gentle Orchestrator
**Context:** Concurso — demo en vivo en restaurante real

---

## 1. Objetivo

Permitir que un waiter en un restaurante tome una foto de un plato y, con AI, cree el producto en el catálogo del Menu Builder y genere una campaña de marketing activa, todo en menos de 60 segundos, con datos reales persistentes en Firebase RTDB.

---

## 2. Demo Flow (guión de concurso)

```
1. [Waiter] Admin Hub → Menu Builder → [+ AI Smart Create]
2. [📸] Captura foto del plato (cámara o upload)
3. [🧠 2-3s] AI procesa: reconoce ingredientes, sugiere nombre, descripción, precio, categoría
4. [📝] Waiter ajusta campos pre-filled → Guardar
5. [✅] Producto creado en RTDB → catálogo en vivo
6. [✨] "Crear Campaña" → AI genera hero creatives
7. [📢] Waiter ajusta → Activar
8. [👁️] Cliente abre menú → ve la campaña activa
```

---

## 3. Arquitectura

### 3.1 AI Service (`src/lib/aiService.ts`)

```
describeProduct(imageBase64: string): Promise<ProductDescription>
  → POST Gemini 2.0 Flash (JSON mode)
  → Retorna { name, description, price, category, tags, isSpicy, isVegan }

suggestCampaign(product: MenuProduct): Promise<CampaignSuggestion>
  → POST Gemini 2.0 Flash (JSON mode)
  → Retorna { heroTitle, heroSubtitle, ctaText, discountType, discountValue }
```

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **API Key:** `VITE_GEMINI_API_KEY` en `.env.production`
- **Timeout:** 8s con fallback a formulario manual
- **Output:** Strict JSON mode (`response_mime_type: "application/json"`)
- **Image format:** El hook convierte `File` a base64 antes de enviar a Gemini (`FileReader.readAsDataURL`)
- **Categories:** Las categorías existentes se pasan desde `useMenuStats` como contexto en el prompt para que AI sugiera una categoría existente
- **Error handling:** Si AI falla, el modal opera en modo manual sin bloqueo

### 3.2 Component Tree

```
MenuBuilder.tsx
  └── <SmartCreateModal>
        ├── CameraUpload (dropzone + webcam capture)
        ├── AIProcessingDisplay (LED industrial style — Cashier DNA)
        ├── ProductForm (pre-filled editable)
        ├── SuccessActions → "✨ Crear Campaña"
        └── CampaignQuickWizard
              ├── AIProcessingDisplay
              ├── BannerPreview (live WYSIWYG)
              ├── CampaignForm (edits update preview)
              └── Activate → RTDB

CustomerView
  └── CampaignBanner (reads active campaigns from RTDB)
```

### 3.3 Hooks

**`useAIProduct.ts`**
```typescript
function useAIProduct(branchId: string) {
  const [image, setImage] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProductDescription | null>(null);
  const [progress, setProgress] = useState(0); // 0-100
  const [steps, setSteps] = useState<AIProcessingStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (file: File) => Promise<void>;
  const saveProduct = async (overrides: Partial<MenuProduct>) => Promise<string>;
  const reset = () => void;
  
  return { image, setImage, processing, result, progress, steps, error, analyze, saveProduct, reset };
}
```

**`useAICampaign.ts`**
```typescript
function useAICampaign(branchId: string, product: MenuProduct) {
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<CampaignSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => Promise<void>;
  const saveCampaign = async (overrides: Partial<Campaign>) => Promise<string>;
  const reset = () => void;
  
  return { generating, suggestion, error, generate, saveCampaign, reset };
}
```

### 3.4 RTDB paths

| Operación | Path |
|-----------|------|
| Crear producto | `branches/{branchId}/catalog/products/{pushKey}` |
| Crear campaña | `branches/{branchId}/marketing/campaigns/{pushKey}` |
| Leer campañas activas | `branches/{branchId}/marketing/campaigns/` (ya existente) |
| Leer catálogo | `branches/{branchId}/catalog/products/` (ya existente) |

No se crean nuevos paths — se reusan los existentes.

### 3.5 Nuevo método en menuService

Se agrega un método adicional (backward-compatible) para crear producto con datos completos:

```typescript
async createProductWithData(branchId, productData): Promise<string>
  // push(newRef) + set(newRef, { ...productData, createdAt, updatedAt })
  // Retorna newRef.key
```

Esto evita crear producto con defaults y luego actualizar campo por campo. El método `createProduct(branchId, category)` existente no se modifica.

---

## 4. Cashier DNA — Visual Design

### 4.1 AI Processing Display

```
┌──────────────────────────────────┐
│  🧠 ANALIZANDO                   │
│                                  │
│  ✓ Reconociendo ingredientes     │
│  → Identificando categoría...    │
│  ○ Calculando precio sugerido    │
│                                  │
│  [████████████░░░░░░░░░░]  45%   │
└──────────────────────────────────┘
```

**Implementation:**
- Fondo: `bg-[#0A0A0A]` — replica el LED display del Cashier
- Texto: `text-cm-success` + `text-shadow` glow
- Scanline: CSS `::after` con `repeating-linear-gradient` (herencia directa de `.cashier-display`)
- Steps animados con `framer-motion` (`AnimatePresence`)
- Barra de progreso con gradiente animado

### 4.2 Physical Action Buttons

```tsx
<button className="px-5 py-3 rounded-xl font-black text-xs tracking-wider uppercase
  bg-cm-accent text-white shadow-lg
  active:translate-y-px active:shadow-inner
  transition-all duration-100 select-none">
```

### 4.3 Dark Industrial Panels

Cards con fondo oscuro, borde sutil, textura noise (CSS `::before` pseudo-elemento), heredado del `.cashier-panel` pero adaptado a tokens `--cm-surface`.

---

## 5. Archivos

### Crear:
| Archivo | Descripción |
|---------|-------------|
| `src/lib/aiService.ts` | Gemini Flash wrapper (describeProduct, suggestCampaign) |
| `src/admin/components/ai/SmartCreateModal.tsx` | Modal principal: camera → AI → form → save |
| `src/admin/components/ai/CampaignQuickWizard.tsx` | Modal: AI → preview → form → activate |
| `src/admin/components/ai/AIProcessingDisplay.tsx` | LED display component |
| `src/admin/hooks/useAIProduct.ts` | Hook: image → AI → product creation |
| `src/admin/hooks/useAICampaign.ts` | Hook: product → AI → campaign creation |
| `src/customer/components/CampaignBanner.tsx` | Customer-facing campaign banner |

### Modificar:
| Archivo | Cambio |
|---------|--------|
| `src/admin/components/menu-builder/MenuBuilder.tsx` | Agregar botón "+ Smart Create" |
| `src/admin/components/menu-builder/MenuItemRow.tsx` | Agregar "✨" campaign CTA en hover |

### Tests:
| Archivo | Descripción |
|---------|-------------|
| `src/lib/__tests__/aiService.test.ts` | JSON parsing, error handling, fallback |
| `src/admin/components/ai/__tests__/SmartCreateModal.test.tsx` | Upload, AI state, form, save |
| `src/admin/components/ai/__tests__/CampaignQuickWizard.test.tsx` | AI generation, preview, activation |

---

## 6. Edge Cases

| Caso | Comportamiento |
|------|---------------|
| Foto borrosa/oscura | AI intenta igual, si falla → mensaje "No pudimos reconocer el plato, completa los campos manualmente" |
| Sin internet | Modal opera en modo manual completo (sin AI) |
| AI timeout (8s) | Timeout → fallback manual, no bloquea |
| JSON inválido de AI | Retry 1 vez, si falla → "No pudimos procesar la respuesta" → manual |
| Producto duplicado | Sin detección automática (se puede agregar en futura versión) |
| Usuario no admin | El botón solo aparece si tiene rol admin/superadmin (herencia del sistema existente) |

---

## 7. Criterios de éxito

- [ ] Foto → producto creado en RTDB en < 10 segundos (con AI)
- [ ] Campaña creada en RTDB en < 5 segundos (con AI)
- [ ] Producto visible en customer menu sin refresh
- [ ] Campaña visible en customer app sin refresh
- [ ] Modo manual funciona sin internet
- [ ] AI falla graceful — no crashea, no deja estado loading infinito
- [ ] Todos los tests verdes
- [ ] Build sin errores
