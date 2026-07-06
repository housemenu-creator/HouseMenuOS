# 🏗️ Module Standard — House-Portal-OS

> **Adopta este estándar para TODOS los módulos nuevos o rediseñados.**
> Inspirado en el rediseño del módulo Cashier (antes `CajeroView.jsx`, 1640 líneas → `src/cashier/`, 151 tests, 0 TypeScript errors).

---

## Índice

1. [File Structure](#1-file-structure)
2. [Architecture Principles](#2-architecture-principles)
3. [Hooks (Lógica pura, sin JSX)](#3-hooks)
4. [Components (JSX puro, sin lógica)](#4-components)
5. [Services (Funciones puras, sin React)](#5-services)
6. [Types & Constants](#6-types--constants)
7. [CSS Token System](#7-css-token-system)
8. [Testing Standards](#8-testing-standards)
9. [Modal Stack Pattern](#9-modal-stack-pattern)
10. [Container/Presenter Pattern](#10-containerpresenter-pattern)
11. [Feature Addition Checklist](#11-feature-addition-checklist)
12. [Performance Checklist](#12-performance-checklist)

---

## 1. File Structure

Cada módulo vive en `src/<module-name>/`. La estructura es **obligatoria** — no se desvía.

```
src/<module-name>/
├── components/
│   ├── <ModuleName>UI.tsx        # Presenter — puro JSX, props tipadas, 0 lógica
│   ├── modals/
│   │   ├── index.ts              # Barrel con React.lazy() para todos los modales
│   │   ├── <ModalName>Modal.tsx  # Un modal por archivo, AnimatePresence interno
│   │   └── __tests__/            # Tests colocalizados de modales
│   │       └── <ModalName>Modal.test.tsx
│   └── widgets/
│       ├── index.ts              # Barrel de widgets
│       ├── <WidgetName>.tsx      # Componentes reutilizables del módulo
│       └── ...
├── hooks/
│   ├── use<Feature>.ts           # Hook — lógica sin JSX, retorna data/callbacks
│   └── ...
├── services/
│   ├── <domain>Service.ts        # Servicio — funciones puras, sin React
│   └── ...
├── types.ts                      # Tipos del módulo
├── constants.ts                  # Constantes y configuración
├── index.tsx                     # Container — orquesta hooks, exporta default
└── tests/
    ├── components/               # Tests de componentes/widgets
    ├── hooks/                    # Tests de hooks
    ├── services/                 # Tests de servicios
    └── e2e/                      # Tests end-to-end (1 mínimo)
```

### Reglas de estructura

| Elemento | ¿Obligatorio? | Notas |
|----------|--------------|-------|
| `index.tsx` | ✅ SI | Entry point. Orquesta hooks → pasa props al presenter |
| `<ModuleName>UI.tsx` | ✅ SI | Presenter. Recibe props, renderiza. 0 lógica, 0 Firebase |
| `types.ts` | ✅ SI | Todos los tipos del módulo |
| `constants.ts` | ✅ SI | Constantes, config, atajos de teclado |
| `modals/index.ts` | ✅ SI | Barrel con `React.lazy()` |
| `services/` | ✅ SI | Al menos 1 servicio puro |
| `hooks/` | ✅ SI | Al menos 1 hook |
| `tests/` | ✅ SI | Coverage targets obligatorios |

---

## 2. Architecture Principles

### Clean Module Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    index.tsx (Container)                │
│  Orquesta hooks, maneja estado de búsqueda/filtro      │
│  Pasa props al presenter, 0 renderizado directo         │
├─────────────────────────────────────────────────────────┤
│              ModuleNameUI.tsx (Presenter)               │
│  Puro JSX. Recibe props. Sin lógica, sin Firebase       │
│  Compone widgets y modales. Sin useState (a menos que   │
│  sea UI state como expandido/seleccionado)              │
├─────────────────────────┬───────────────────────────────┤
│      hooks/*.ts         │      services/*.ts            │
│  Lógica de estado       │  Funciones puras              │
│  Acceso a Firebase      │  Sin React, sin Firebase      │
│  Retorna data/callbacks │  Testeables al 100%           │
│  Sin JSX                │  Sin efectos secundarios      │
├─────────────────────────┴───────────────────────────────┤
│                    lib/*.ts (Legacy)                     │
│  Servicios Firebase existentes — NO MODIFICAR           │
│  Los hooks los envuelven                                │
└─────────────────────────────────────────────────────────┘
```

### Las 4 Leyes de Clean Module Architecture

1. **Hooks** → NUNCA renderizan JSX. Solo retornan `{ data, callbacks }`.
2. **Components** → NUNCA llaman a Firebase. Solo reciben props y renderizan.
3. **Modales** → Se manejan como STACK, no como N estados booleanos.
4. **Servicios** → Funciones puras. Misma entrada → misma salida. Cero dependencias de React.

---

## 3. Hooks

### Patrón general

```ts
// hooks/use<Domain>.ts
import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import type { DomainType } from '../types';

interface State {
  data: DomainType | null;
  loading: boolean;
  error: string | null;
}

export function useDomain(branchId: string | null) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!branchId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const unsub = firebaseService.subscribe(branchId, (data) => {
      setState({ data, loading: false, error: null });
    });
    return unsub;
  }, [branchId]);

  const action = useCallback(async (params: Params) => {
    if (!branchId) return { success: false, error: 'No branch' };
    return await firebaseService.action(branchId, params);
  }, [branchId]);

  return { ...state, action };
}
```

### Hooks disponibles como referencia

| Hook | Propósito | Estado |
|------|-----------|--------|
| `useModalStack` | Manejo unificado de modales | ✅ Production-ready |
| `useSessionState` | Sesión de caja (open/close) | ✅ Production-ready |
| `useOrdersPipeline` | Pipeline de órdenes con filtro | ✅ Production-ready |
| `useOfflineQueue` | Cola de operaciones offline | ✅ Production-ready |

### Reglas para hooks

- ✅ NUNCA importan `react-dom` o componentes
- ✅ Retornan `{ data, loading, error }` para estados de carga
- ✅ Usan `useCallback` para funciones expuestas
- ✅ Limpian subscriptions en el return de `useEffect`
- ✅ Manejan `null` branch/context como "no data"
- ❌ NUNCA tienen JSX
- ❌ NUNCA llaman a `setState` después de unmount

---

## 4. Components

### Presenter (`<ModuleName>UI.tsx`)

```tsx
interface ModuleUIProps {
  data: DomainType | null;
  loading: boolean;
  error: string | null;
  onAction: (id: string) => Promise<Result>;
  onClose: () => void;
}

export function ModuleUI({ data, loading, error, onAction, onClose }: ModuleUIProps) {
  // ✅ UI state local (expandido, seleccionado, hover)
  const [expanded, setExpanded] = useState<string | null>(null);

  // ✅ Loading state
  if (loading) return <LoadingSkeleton />;
  
  // ✅ Empty state
  if (!data) return <EmptyState />;
  
  // ✅ Error state
  if (error) return <ErrorState message={error} />;

  // ✅ Populated state
  return <div className="module-theme">{/* JSX */}</div>;
}
```

### Los 4 estados obligatorios

TODO componente que maneja datos DEBE renderizar:

```tsx
if (loading) return <Skeleton />;
if (error) return <ErrorBanner message={error} />;
if (!data || (Array.isArray(data) && data.length === 0)) return <EmptyState message="Sin datos" />;
return <DataView data={data} />;
```

### Widgets

- Cada widget en su propio archivo dentro de `components/widgets/`
- Props completamente tipadas
- Sin lógica de negocio — solo renderizado
- Reutilizables entre módulos (pueden moverse a `src/components/shared/` si se reusan)

### Reglas para componentes

- ✅ Props tipadas con interface (no type) para mejor DX
- ✅ NUNCA llaman a hooks de Firebase
- ✅ UI state SOLAMENTE (expandido, hover, selected)
- ✅ Loading/Empty/Error/Data states obligatorios
- ❌ NUNCA importan de `../../lib/` directamente

---

## 5. Services

### Patrón

```ts
// services/<domain>.ts
import type { DomainType } from '../types';

export function computeSomething(input: Input): Output {
  // Función pura, sin efectos secundarios
  return result;
}
```

### Servicios disponibles como referencia

| Servicio | Funciones |
|----------|-----------|
| `calculator.ts` | `calculateKPIs`, `applyDiscount`, `calculateChange`, `calculateDiscountedPrice`, `calculateSplitDistribution`, `getUnassignedItems`, `validateSplitBalance` |
| `receiptEngine.ts` | Generación de comprobantes HTML/texto |
| `reportGenerator.ts` | `buildShiftReport`, `buildOrderReport`, `generateShiftCSV`, `generateOrdersCSV`, `generateShiftSummary`, `downloadCSV`, `downloadText` |

### Reglas para servicios

- ✅ Funciones puras — mismas entradas, mismas salidas
- ✅ Sin imports de React, hooks, o Firebase
- ✅ Fáciles de testear (100% coverage target)
- ✅ Un archivo por dominio
- ❌ Sin efectos secundarios (no `console.log`, no localStorage)
- ❌ Sin clases — solo funciones exportadas

---

## 6. Types & Constants

### `types.ts`

```ts
// <Module> — Domain Types
export type ModuleStatus = 'active' | 'inactive';
export type ModuleAction = 'create' | 'update' | 'delete';

export interface ModuleEntity {
  id: string;
  // ...
}

export type ModalName = 'modal1' | 'modal2' | null;

export interface ModalStackItem {
  name: Exclude<ModalName, null>;
  props: Record<string, unknown>;
}
```

### `constants.ts`

```ts
export const MODULE_CONSTANTS = {
  MAX_ITEMS: 10,
  ANIMATION_DURATION_MS: 150,
  REFRESH_INTERVAL_MS: 5000,
  SHORTCUTS: {
    ACTION: 'F1',
    SEARCH: 'F2',
  },
} as const;
```

---

## 7. CSS Token System

### Scoped Theme

Cada módulo define su propio tema scoped via clase contenedora:

```css
/* styles/<module>-theme.css */
.module-theme {
  --module-bg: #121212;
  --module-surface: #1B1B1B;
  --module-border: #343434;
  --module-text: #F2F2F2;
  --module-text-secondary: #B8B8B8;
  --module-text-muted: #6B6B6B;
  --module-accent: #A855F7;
  --module-success: #22C55E;
  --module-error: #EF4444;
  --module-warning: #F59E0B;
  --module-info: #3B82F6;
  
  font-family: 'Inter', system-ui, sans-serif;
}
```

### Reglas CSS

| Regla | Explicación |
|-------|-------------|
| Prefijo `--module-*` | NUNCA `--cm-*` — los tokens globales no se modifican |
| Scope via clase | `.module-theme` en el contenedor raíz |
| Sin hex hardcodeados | Siempre via `var(--module-*)` |
| Mobile-first | Sin `@media (max-width)` — usar `min-width` siempre |
| Dark mode by default | El tema base es dark |

---

## 8. Testing Standards

### Coverage Targets

| Capa | Coverage Mínimo |
|------|----------------|
| Services | **100%** (líneas, branches, functions) |
| Hooks | **90%** (líneas) |
| Components | **80%** (líneas, incluyendo 4 estados) |
| E2E | **1 flujo crítico** (feliz + error) |

### Test structure

```
tests/
├── components/
│   └── <Component>.test.tsx    # Testing Library, render + fireEvent
├── hooks/
│   └── <Hook>.test.ts          # renderHook + act + waitFor
├── services/
│   └── <Service>.test.ts       # Unit tests, pure functions
└── e2e/
    └── critical-flow.test.ts   # Playwright o similar
```

### Mock Strategy

```ts
// Para servicios Firebase: mock a nivel de importación
vi.mock('../../lib/cashService', () => ({
  cashService: {
    getActiveSession: vi.fn(),
    openSession: vi.fn(),
    closeSession: vi.fn(),
    subscribeToSessions: vi.fn((_bid, cb) => { cb([]); return () => {}; }),
  },
}));

// Para modales con Framer Motion: usar getAllByText cuando el texto
// se fragmenta en múltiples nodos por AnimatePresence
// En vez de: screen.getByText('Cancelar Orden')
// Usar: screen.getAllByRole('button').find(b => /Cancelar/.test(b.textContent!))
```

### Reglas de testing

- ✅ Tests colocalizados en `__tests__/` para modales, en `tests/` para hooks/services
- ✅ Cada test cubre UN comportamiento
- ✅ `waitFor` para operaciones asíncronas
- ✅ `vi.fn().mockResolvedValue()` para mocks de Firebase
- ✅ Tests de modales: verificar render, acciones, cierre (backdrop + botón)
- ❌ Sin `screen.debug()` en tests committed
- ❌ Sin tests que dependen de timers reales

---

## 9. Modal Stack Pattern

### Por qué un stack en vez de N booleanos

**Antes:** 5 `useState(false)` + 5 funciones `openModal1/closeModal1` → prop drilling infinito.

**Después:** `useModalStack()` → `{ activeModal, modalProps, open, close, closeAll, isOpen }`.

### Implementación

```tsx
// En el container:
const modal = useModalStack();

// Pasar al presenter:
<Presenter
  modal={{
    activeModal: modal.activeModal,
    open: (name) => modal.open(name, props),
    close: modal.close,
  }}
/>

// En el presenter:
<Suspense fallback={<Loading />}>
  {modal.activeModal === 'myModal' && selectedEntity && (
    <MyModal entity={selectedEntity} onAction={onAction} onClose={modal.close} />
  )}
</Suspense>
```

### Barrel de modales con lazy loading

```ts
// components/modals/index.ts
import { lazy } from 'react';

export const MyModal = lazy(() => import('./MyModal').then(m => ({ default: m.MyModal })));
export const OtherModal = lazy(() => import('./OtherModal').then(m => ({ default: m.OtherModal })));
```

### Reglas del Modal Stack

- ✅ Cada modal es lazy-loaded con `React.lazy()`
- ✅ `AnimatePresence` dentro de cada modal (no en el padre)
- ✅ Stack depth: 2+ (modal encima de modal)
- ✅ Backdrop click → cierra modal actual (no todo el stack)
- ❌ No usar N estados booleanos para N modales

---

## 10. Container/Presenter Pattern

### Container (`index.tsx`)

```tsx
export default function ModuleView() {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();
  const data = useDomain(activeBranchId);
  const modal = useModalStack();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data.items;
    return data.items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data.items, searchQuery]);

  const handleAction = async (id: string) => {
    // Lógica de negocio
    return { success: true };
  };

  return (
    <ModuleUI
      data={filteredData}
      loading={data.loading}
      error={data.error}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      modal={{ activeModal: modal.activeModal, open: modal.open, close: modal.close }}
      onAction={handleAction}
    />
  );
}
```

### Reglas del Container

- ✅ Orquesta hooks y contextos
- ✅ Maneja estado de búsqueda/filtro (porque es UI state)
- ✅ Define handlers que conectan callbacks de UI con hooks
- ✅ ~30–80 líneas — si es más grande, extraer lógica a hooks
- ❌ Sin JSX de presentación
- ❌ Sin renderizado directo

---

## 11. Feature Addition Checklist

Cuando agregás un feature nuevo a un módulo, seguí estos pasos en orden:

### 1. ✍️ Spec
- [ ] Definir el "por qué" y "para quién"
- [ ] Escribir scenarios de éxito y error

### 2. 🎨 Design
- [ ] Elegir el patrón: ¿nuevo modal? ¿nuevo widget? ¿nuevo hook? ¿nuevo service?
- [ ] Si es modal → agregar a `ModalName` type y al barrel
- [ ] Si es widget → crear archivo en `widgets/`

### 3. 🧪 Tests First
- [ ] Service: escribir test → implementar → test pasa
- [ ] Hook: escribir test → implementar → test pasa
- [ ] Component: escribir test → implementar → test pasa

### 4. 🔌 Integración
- [ ] Conectar en el presenter (`ModuleUI.tsx`)
- [ ] Conectar en el container (`index.tsx`)
- [ ] TypeScript: 0 errores

### 5. ✅ Verify
- [ ] `npm run type-check` — 0 errores
- [ ] `npx vitest run` — todos los tests pasan
- [ ] Coverage: services 100%, hooks 90%, components 80%

### 6. 📚 Document
- [ ] Si agrega un patrón nuevo, actualizar este MODULE_STANDARD.md
- [ ] Commit con conventional commit

---

## 12. Performance Checklist

- [ ] `React.lazy()` para todos los modales (suspense boundary en el presenter)
- [ ] `useMemo` para filtered/computed data
- [ ] `useCallback` para handlers pasados a componentes hijos
- [ ] Sin inline arrow functions en props de child components (cuando sea posible)
- [ ] Bundle size: cada modal es su propio chunk
- [ ] Scoped CSS: las animaciones no causan re-layout
- [ ] `AnimatePresence` con `exit` animations para modales

---

## Apéndice A: Template Rápido

Para crear un módulo nuevo, copiá esta terminal:

```bash
mkdir -p src/<module>/{components/{modals,widgets},hooks,services,tests/{components,hooks,services,e2e}}
touch src/<module>/types.ts
touch src/<module>/constants.ts
touch src/<module>/index.tsx
touch src/<module>/components/<Module>UI.tsx
touch src/<module>/components/modals/index.ts
touch src/<module>/hooks/use<Feature>.ts
touch src/<module>/services/<domain>.ts
```

Luego implementá en este orden:
1. `types.ts` + `constants.ts`
2. Services (TDD: test → implementación)
3. Hooks (TDD: test → implementación)
4. Component UI + Widgets (TDD: test → implementación)
5. Modales (lazy-loaded)
6. Container (`index.tsx`)
7. CSS theme scoped
8. E2E test
9. `MODULE_STANDARD.md` section si aplica

---

## Apéndice B: Convención de Nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Módulo | `src/<module>/` | `src/cashier/` |
| Container | `index.tsx` | `index.tsx` |
| Presenter | `<ModuleName>UI.tsx` | `CashierUI.tsx` |
| Modal | `<Name>Modal.tsx` | `QuickPayModal.tsx` |
| Widget | `<Name>.tsx` | `KpiGrid.tsx` |
| Hook | `use<Feature>.ts` | `useModalStack.ts` |
| Service | `<domain>.ts` | `calculator.ts` |
| Types | `types.ts` | `types.ts` |
| Constants | `constants.ts` | `constants.ts` |
| Test | `<name>.test.ts` | `calculator.test.ts` |
| CSS Theme | `<module>-theme.css` | `cashier-theme.css` |

---

> **Este documento es el estándar ganador.** Todos los módulos nuevos DEBEN seguirlo.
> Los módulos existentes DEBEN migrar a este estándar durante su rediseño.
>
> Versión 1.0 — Julio 2026 — Inspirado en el módulo Cashier (151 tests, 20 suites, 0 errores TS)
