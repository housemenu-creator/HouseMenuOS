# Cashier Module Redesign — Implementation Plan

> **For agentic workers:** TDD-first, granular steps, commit after each green test.

**Goal:** Transform the 1,640-line CajeroView monolith into a clean, modular Cashier module with industrial retro visual identity, 5 new features, and MODULE_STANDARD.md as the blueprint for all other modules.

**Architecture:** Clean Module Architecture — hooks own logic, components own rendering, services own pure computation. Single `useModalStack()` replaces 5 state booleans. CSS tokens scoped via `.cashier-theme` class.

**Tech Stack:** React 19 + Vite 8, Tailwind CSS, Framer Motion, Lucide, Firebase RTDB, Vitest, @testing-library/react, Inter + Share Tech Mono fonts.

**Timeline:** 4 weeks (July 5 – August 2, 2026)

## Global Constraints

- All new code in `src/cashier/` — zero changes to existing CajeroView.jsx until it's replaced
- CSS tokens use `--cashier-*` prefix, scoped to `.cashier-theme` — never modify `--cm-*`
- LCD font (Share Tech Mono) ONLY for total/amount/change displays — never for UI labels
- Every modal must be lazy-loaded via `React.lazy()`
- Hooks return data/callbacks only — never JSX
- Components receive props only — never Firebase calls
- Services are pure functions with zero React dependency
- Tests required for: all services (100%), all hooks (90%), all components (80%), 1 E2E flow
- Atajos de teclado: F1 (nuevo pedido), F2 (buscar), F3 (cobrar), F4 (caja), Escape (cerrar modal), 1/2/3 (método pago), / (shortcut hints)

---

## Phase 1: Foundation — Structure + Visual Identity + Hooks

### Task 1.1: Create directory structure and CSS token system

**Files:**
- Create: `src/cashier/types.ts`
- Create: `src/cashier/constants.ts`
- Create: `src/styles/cashier-theme.css`

**Step 1: Create `src/cashier/` directory tree**

```bash
mkdir -p src/cashier/{hooks,components/{modals,widgets},services,tests/{hooks,components,services,e2e}}
```

**Step 2: Create `src/cashier/types.ts`**

```ts
// Cashier-specific types
export type CashSessionStatus = 'open' | 'closed';
export type PaymentMethod = 'Efectivo' | 'Yape/Plin' | 'Tarjeta (POS)';
export type PaymentStatus = 'pendiente' | 'pagado' | 'por_verificar' | 'reembolsado' | 'partial';
export type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'entregado' | 'cancelado' | 'pendiente_pago';

export interface CashSession {
  id: string;
  openedAt: number;
  openingBalance: number;
  closedAt: number | null;
  closingBalance: number | null;
  expectedCash: number | null;
  difference: number | null;
  status: CashSessionStatus;
  openedBy: string;
  closedBy: string | null;
  notes: string;
}

export interface OrderItem {
  name?: string;
  productName?: string;
  productId?: string;
  quantity: number;
  price: number;
  selectedOptions?: { name: string }[];
  discount?: { type: 'percentage' | 'fixed'; value: number; reason: string };
  subtotal?: number;
}

export interface Order {
  id: string;
  customerName?: string;
  mesa?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  financials?: { total: number; [key: string]: any };
  totalAfterDiscount?: number;
  discount?: { type: string; value: number };
  items?: OrderItem[];
  notes?: { text: string; createdBy?: string; createdByName?: string; createdAt?: string }[];
  createdAt?: string;
  location?: string;
  payment_details?: { wallet_type?: string; operation_number?: string; voucherUrl?: string };
  splits?: Record<string, SplitDiner>;
  refund?: { amount: number; method: string; reason: string; items?: number[] };
}

export interface SplitDiner {
  name: string;
  items: number[]; // indices into order.items
  total: number;
  method: PaymentMethod;
  status: 'pending' | 'paid';
}

export interface OrderKPIs {
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  totalIngresos: number;
  expectedCash: number;
  porVerificar: Order[];
  pendingOrders: Order[];
  paidCount: number;
  cancelledCount: number;
  averageTicket: number;
}

export type ModalName = 'session' | 'quickPay' | 'splitBill' | 'verifyPayment' | 'cancelOrder' | 'transferTable' | 'receipt' | null;

export interface ModalStackItem {
  name: Exclude<ModalName, null>;
  props: Record<string, any>;
}

export type DiscountType = 'none' | 'percentage' | 'fixed';
export type SessionAction = 'closed' | 'opening' | 'open' | 'closing';
```

**Step 3: Create `src/cashier/constants.ts`**

```ts
export const CASHIER_CONSTANTS = {
  MAX_SPLIT_DINERS: 6,
  ANIMATION_DURATION_MS: 150,
  REFRESH_INTERVAL_MS: 1000,
  SOUNDS: {
    CASH_REGISTER: '/sounds/cash-register.mp3',
    NOTIFICATION: '/sounds/notification.mp3',
    ERROR: '/sounds/error.mp3',
  },
  SHORTCUTS: {
    NEW_ORDER: 'F1',
    SEARCH: 'F2',
    QUICK_PAY: 'F3',
    SESSION: 'F4',
    PAY_CASH: 'Digit1',
    PAY_YAPE: 'Digit2',
    PAY_POS: 'Digit3',
    TOGGLE_SHORTCUTS: 'Slash',
  },
  DISPLAY_LABELS: {
    total: 'TOTAL',
    payment: 'VUELTO',
    closed: 'CAJA CERRADA',
    idle: 'LISTO',
  },
} as const;
```

**Step 4: Create `src/styles/cashier-theme.css`**

```css
/* Cashier Module — Industrial Retro Theme */
/* Scoped via .cashier-theme — does not affect rest of the app */

.cashier-theme {
  /* ── Core palette ── */
  --cashier-bg: #121212;
  --cashier-surface: #1B1B1B;
  --cashier-border: #343434;
  --cashier-text: #F2F2F2;
  --cashier-text-secondary: #B8B8B8;
  --cashier-text-muted: #6B6B6B;
  
  /* ── Status accents ── */
  --cashier-info: #3B82F6;
  --cashier-success: #22C55E;
  --cashier-warning: #F59E0B;
  --cashier-error: #EF4444;
  --cashier-accent: #A855F7;

  /* ── LED Display ── */
  --cashier-display-bg: #0A0A0A;
  --cashier-display-text: #22C55E;
  --cashier-display-dim: rgba(34, 197, 94, 0.3);

  /* ── Surface texture ── */
  --cashier-noise-opacity: 0.02;

  /* ── Typography ── */
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* ── Surface texture (industrial metal finish) ── */
.cashier-panel {
  position: relative;
  background-color: var(--cashier-surface);
}
.cashier-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: var(--cashier-noise-opacity, 0.02);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px 128px;
  pointer-events: none;
  z-index: 0;
}
.cashier-panel > * {
  position: relative;
  z-index: 1;
}

/* ── LED Display ── */
.cashier-display {
  background: var(--cashier-display-bg);
  border: 1px solid #2A2A2A;
  border-radius: 12px;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8), 0 0 4px rgba(34, 197, 94, 0.05);
  /* Scan lines */
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.15) 1px,
    rgba(0, 0, 0, 0.15) 2px
  );
  font-family: 'Share Tech Mono', monospace;
}

.cashier-display-text {
  font-family: 'Share Tech Mono', monospace;
  color: var(--cashier-display-text);
  text-shadow: 0 0 10px var(--cashier-display-dim), 0 0 20px var(--cashier-display-dim);
}

/* ── Physical buttons (for non-cashier modules) ── */
.btn-physical {
  border: 1px solid var(--cashier-border);
  border-top-color: #4A4A4A;
  border-bottom-color: #1A1A1A;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3);
  transition: all 120ms ease;
}
.btn-physical:active {
  transform: translateY(1px);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
}

/* ── KPI Cards ── */
.cashier-kpi-card {
  background: var(--cashier-surface);
  border: 1px solid var(--cashier-border);
  border-radius: 12px;
  padding: 1rem;
  transition: border-color 150ms ease;
}
.cashier-kpi-card:hover {
  border-color: var(--cashier-accent);
}

/* ── Order list items ── */
.cashier-order-item {
  background: var(--cashier-surface);
  border: 1px solid var(--cashier-border);
  border-left-width: 4px;
  transition: all 150ms ease;
}
.cashier-order-item:hover {
  border-color: var(--cashier-accent);
}
```

**Step 5: Add Inter and Share Tech Mono to the app's font loading**

Verify `index.html` or font loading mechanism includes:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

**Step 6: Run tests** (no tests yet, just verify build)

```bash
cd apps/house-menu && npm run build
```
Expected: Build succeeds, no errors

**Step 7: Commit**

```bash
git add src/cashier/ src/styles/cashier-theme.css
git commit -m "feat(cashier): scaffold module structure and retro-industrial CSS tokens"
```

---

### Task 1.2: Build CashierDisplay component (LED Display)

**Files:**
- Create: `src/cashier/components/CashierDisplay.tsx`
- Test: `src/cashier/tests/components/CashierDisplay.test.tsx`

This is the visual heart of the module — inspired by the ER-350's physical display panel.

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CashierDisplay } from './CashierDisplay';

describe('CashierDisplay', () => {
  it('renders total amount with LCD styling', () => {
    render(<CashierDisplay total={64.00} itemCount={3} mode="total" />);
    expect(screen.getByText('64.00')).toBeTruthy();
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText('3 ARTÍCULOS')).toBeTruthy();
  });

  it('renders change due in payment mode', () => {
    render(<CashierDisplay total={20.00} itemCount={0} mode="payment" change={5.50} />);
    expect(screen.getByText('VUELTO')).toBeTruthy();
  });

  it('renders idle state without total', () => {
    render(<CashierDisplay total={0} itemCount={0} mode="idle" />);
    expect(screen.getByText('LISTO')).toBeTruthy();
  });

  it('renders closed state', () => {
    render(<CashierDisplay total={0} itemCount={0} mode="closed" />);
    expect(screen.getByText('CAJA CERRADA')).toBeTruthy();
  });

  it('applies LCD font class to total value', () => {
    const { container } = render(<CashierDisplay total={64.00} itemCount={3} mode="total" />);
    const el = container.querySelector('.cashier-display-text');
    expect(el).toBeTruthy();
  });
});
```

Run: `npx vitest run src/cashier/tests/components/CashierDisplay.test.tsx`
Expected: FAIL

**Step 2: Implement CashierDisplay**

```tsx
import React from 'react';

interface CashierDisplayProps {
  total: number;
  itemCount: number;
  mode: 'total' | 'payment' | 'idle' | 'closed';
  change?: number;
  sessionStatus?: React.ReactNode;
  clock?: string;
  statusText?: string;
}

export function CashierDisplay({ total, itemCount, mode, change, sessionStatus, clock, statusText }: CashierDisplayProps) {
  const formatAmount = (val: number) => val.toFixed(2);

  const renderContent = () => {
    switch (mode) {
      case 'total':
        return (
          <>
            <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: 'var(--cashier-text-muted)' }}>
              {statusText || 'TOTAL'}
            </div>
            <div className="cashier-display-text text-4xl md:text-5xl font-black tracking-wider my-1">
              {formatAmount(total)}
            </div>
            <div className="text-xs tracking-widest font-bold" style={{ color: 'var(--cashier-text-secondary)' }}>
              {itemCount} {itemCount === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
            </div>
          </>
        );
      case 'payment':
        return (
          <>
            <div className="text-[10px] tracking-[0.2em] font-bold" style={{ color: 'var(--cashier-text-muted)' }}>
              {change !== undefined ? 'VUELTO' : 'TOTAL A PAGAR'}
            </div>
            <div className="cashier-display-text text-4xl md:text-5xl font-black tracking-wider my-1">
              {formatAmount(change !== undefined ? change : total)}
            </div>
            {change !== undefined && (
              <div className="text-xs tracking-widest font-bold" style={{ color: 'var(--cashier-success)' }}>
                PAGADO: {formatAmount(total)}
              </div>
            )}
          </>
        );
      case 'closed':
        return (
          <>
            <div className="cashier-display-text text-3xl font-black tracking-[0.3em] mt-2" style={{ color: 'var(--cashier-text-muted)' }}>
              CAJA CERRADA
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--cashier-text-secondary)' }}>
              {statusText || ''}
            </div>
          </>
        );
      case 'idle':
        return (
          <>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--cashier-success)' }} />
              <span className="cashier-display-text text-2xl font-black tracking-[0.2em]">
                {statusText || 'LISTO'}
              </span>
            </div>
          </>
        );
    }
  };

  return (
    <div className="cashier-display w-full px-5 py-4">
      <div className="flex flex-col items-center text-center">
        {renderContent()}
        <div className="w-full mt-2 pt-2 border-t" style={{ borderColor: '#2A2A2A' }}>
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider" style={{ color: 'var(--cashier-text-muted)' }}>
            <span>{sessionStatus || ''}</span>
            <span className="font-mono">{clock || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/cashier/tests/components/CashierDisplay.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cashier/components/CashierDisplay.tsx src/cashier/tests/components/CashierDisplay.test.tsx
git commit -m "feat(cashier): add CashierDisplay LED component with retro scan-line styling"
```

---

### Task 1.3: Build useModalStack hook

**Files:**
- Create: `src/cashier/hooks/useModalStack.ts`
- Test: `src/cashier/tests/hooks/useModalStack.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalStack } from './useModalStack';

describe('useModalStack', () => {
  it('starts with no active modal', () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.activeModal).toBeNull();
  });

  it('opens a modal with props', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('quickPay', { orderId: '123' }));
    expect(result.current.activeModal).toBe('quickPay');
    expect(result.current.modalProps).toEqual({ orderId: '123' });
  });

  it('closes the active modal', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', {}));
    act(() => result.current.close());
    expect(result.current.activeModal).toBeNull();
  });

  it('stacks modals and returns to previous on close', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', { a: 1 }));
    act(() => result.current.open('quickPay', { b: 2 }));
    expect(result.current.activeModal).toBe('quickPay');
    act(() => result.current.close());
    expect(result.current.activeModal).toBe('session');
    expect(result.current.modalProps).toEqual({ a: 1 });
  });

  it('clears stack on closeAll', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', {}));
    act(() => result.current.open('quickPay', {}));
    act(() => result.current.closeAll());
    expect(result.current.activeModal).toBeNull();
  });

  it('isOpen returns true only for matching modal', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('quickPay', {}));
    expect(result.current.isOpen('quickPay')).toBe(true);
    expect(result.current.isOpen('session')).toBe(false);
  });
});
```

Run: `npx vitest run src/cashier/tests/hooks/useModalStack.test.ts`
Expected: FAIL

**Step 2: Implement useModalStack**

```ts
import { useState, useCallback } from 'react';
import type { ModalName } from '../types';

interface ModalStackItem {
  name: Exclude<ModalName, null>;
  props: Record<string, any>;
}

export function useModalStack() {
  const [stack, setStack] = useState<ModalStackItem[]>([]);

  const activeModal = stack.length > 0 ? stack[stack.length - 1].name : null;
  const modalProps = stack.length > 0 ? stack[stack.length - 1].props : {};

  const open = useCallback((name: ModalStackItem['name'], props: Record<string, any> = {}) => {
    setStack(prev => [...prev, { name, props }]);
  }, []);

  const close = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : []);
  }, []);

  const closeAll = useCallback(() => {
    setStack([]);
  }, []);

  const isOpen = useCallback((name: ModalName) => {
    return stack.some(item => item.name === name);
  }, [stack]);

  return { activeModal, modalProps, open, close, closeAll, isOpen, stack };
}
```

**Step 3: Run tests**

Run: `npx vitest run src/cashier/tests/hooks/useModalStack.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cashier/hooks/useModalStack.ts src/cashier/tests/hooks/useModalStack.test.ts
git commit -m "feat(cashier): add useModalStack hook for unified modal management"
```

---

### Task 1.4: Build calculator service (pure financial logic)

**Files:**
- Create: `src/cashier/services/calculator.ts`
- Test: `src/cashier/tests/services/calculator.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { calculateKPIs, applyDiscount, calculateSplitTotal, calculateChange } from './calculator';

const mockOrders = [
  { id: '1', status: 'entregado', payment_status: 'pagado', payment_method: 'Efectivo', financials: { total: 50 } },
  { id: '2', status: 'entregado', payment_status: 'pagado', payment_method: 'Yape/Plin', financials: { total: 30 } },
  { id: '3', status: 'entregado', payment_status: 'pagado', payment_method: 'Tarjeta (POS)', financials: { total: 20 } },
  { id: '4', status: 'recibido', payment_status: 'pendiente', financials: { total: 15 } },
  { id: '5', status: 'entregado', payment_status: 'por_verificar', payment_method: 'Yape/Plin', financials: { total: 25 } },
  { id: '6', status: 'cancelado', payment_status: 'reembolsado', financials: { total: 10 } },
];

describe('calculator', () => {
  it('calculateKPIs: groups by payment method', () => {
    const kpis = calculateKPIs(mockOrders, 100);
    expect(kpis.totalEfectivo).toBe(50);
    expect(kpis.totalYapePlin).toBe(30);
    expect(kpis.totalPos).toBe(20);
    expect(kpis.totalPendiente).toBe(15);
    expect(kpis.totalPorVerificar).toBe(25);
    expect(kpis.totalIngresos).toBe(100);
    expect(kpis.expectedCash).toBe(150); // openingBalance + efectivo
  });

  it('calculateKPIs: filters por_verificar orders', () => {
    const kpis = calculateKPIs(mockOrders, 100);
    expect(kpis.porVerificar.length).toBe(1);
  });

  it('applyDiscount: percentage discount', () => {
    expect(applyDiscount(100, 'percentage', 15)).toBe(85);
    expect(applyDiscount(50, 'percentage', 100)).toBe(0);
  });

  it('applyDiscount: fixed discount', () => {
    expect(applyDiscount(100, 'fixed', 20)).toBe(80);
    expect(applyDiscount(30, 'fixed', 50)).toBe(0);
  });

  it('applyDiscount: no discount returns original', () => {
    expect(applyDiscount(100, 'none', 0)).toBe(100);
  });

  it('calculateSplitTotal: sums items by indices', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 25, quantity: 1 },
      { price: 5, quantity: 3 },
    ];
    expect(calculateSplitTotal(items, [0, 2])).toBe(35); // 10*2 + 5*3
  });

  it('calculateChange: positive change', () => {
    expect(calculateChange(100, 80)).toBe(20);
  });

  it('calculateChange: exact payment', () => {
    expect(calculateChange(80, 80)).toBe(0);
  });

  it('calculateChange: insufficient payment returns negative', () => {
    expect(calculateChange(50, 80)).toBe(-30);
  });
});
```

Run: `npx vitest run src/cashier/tests/services/calculator.test.ts`
Expected: FAIL

**Step 2: Implement calculator.ts**

```ts
import type { Order } from '../types';

export interface KPIs {
  totalEfectivo: number;
  totalYapePlin: number;
  totalPos: number;
  totalPendiente: number;
  totalPorVerificar: number;
  totalIngresos: number;
  expectedCash: number;
  porVerificar: Order[];
  pendingOrders: Order[];
  paidCount: number;
  cancelledCount: number;
  averageTicket: number;
}

export function calculateKPIs(orders: Order[], openingBalance: number): KPIs {
  const active = orders.filter(o => o.status !== 'cancelado');

  const totalEfectivo = active
    .filter(o => o.payment_method === 'Efectivo' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalYapePlin = active
    .filter(o => o.payment_method === 'Yape/Plin' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalPos = active
    .filter(o => o.payment_method === 'Tarjeta (POS)' && o.payment_status === 'pagado')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const totalPendiente = active
    .filter(o => o.payment_status !== 'pagado' && o.payment_status !== 'reembolsado' && o.payment_status !== 'por_verificar')
    .reduce((s, o) => s + (o.financials?.total || 0), 0);

  const porVerificar = orders.filter(o => o.payment_status === 'por_verificar');
  const totalPorVerificar = porVerificar.reduce((s, o) => s + (o.financials?.total || 0), 0);

  const paid = active.filter(o => o.payment_status === 'pagado');
  const totalIngresos = totalEfectivo + totalYapePlin + totalPos;

  const pendingOrders = orders.filter(o =>
    o.status !== 'cancelado' &&
    o.payment_status !== 'pagado' &&
    o.payment_status !== 'reembolsado' &&
    o.payment_status !== 'por_verificar'
  );

  return {
    totalEfectivo,
    totalYapePlin,
    totalPos,
    totalPendiente,
    totalPorVerificar,
    totalIngresos,
    expectedCash: openingBalance + totalEfectivo,
    porVerificar,
    pendingOrders,
    paidCount: paid.length,
    cancelledCount: orders.filter(o => o.status === 'cancelado').length,
    averageTicket: paid.length > 0 ? totalIngresos / paid.length : 0,
  };
}

export function applyDiscount(base: number, type: 'none' | 'percentage' | 'fixed', value: number): number {
  if (type === 'none' || !value || value <= 0) return base;
  if (type === 'percentage') return Math.max(0, base * (1 - Math.min(value, 100) / 100));
  return Math.max(0, base - value);
}

export function calculateSplitTotal(items: { price: number; quantity: number }[], indices: number[]): number {
  return indices.reduce((sum, i) => {
    const item = items[i];
    return sum + (item?.price || 0) * (item?.quantity || 1);
  }, 0);
}

export function calculateChange(paid: number, total: number): number {
  return paid - total;
}

export function calculateDiscountedPrice(item: { price: number; quantity: number }, discount?: { type: 'percentage' | 'fixed'; value: number } | null): number {
  if (!discount) return (item.price || 0) * (item.quantity || 1);
  const base = (item.price || 0) * (item.quantity || 1);
  return applyDiscount(base, discount.type, discount.value);
}
```

**Step 3: Run tests**

Run: `npx vitest run src/cashier/tests/services/calculator.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cashier/services/calculator.ts src/cashier/tests/services/calculator.test.ts
git commit -m "feat(cashier): add calculator service with KPI and discount logic"
```

---

### Task 1.5: Build useSessionState hook

**Files:**
- Create: `src/cashier/hooks/useSessionState.ts`
- Test: `src/cashier/tests/hooks/useSessionState.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionState } from './useSessionState';

const mockCashService = {
  getActiveSession: vi.fn(),
  openSession: vi.fn(),
  closeSession: vi.fn(),
  subscribeToSessions: vi.fn((_bid, cb) => { cb([]); return () => {}; }),
};

vi.mock('../../lib/cashService', () => ({
  cashService: mockCashService,
}));

describe('useSessionState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes as closed with no session', async () => {
    mockCashService.getActiveSession.mockResolvedValue(null);
    const { result } = renderHook(() => useSessionState('branch-1', 'user@test.com'));
    expect(result.current.session).toBeNull();
  });

  it('opens a session', async () => {
    mockCashService.getActiveSession.mockResolvedValue(null);
    mockCashService.openSession.mockResolvedValue({ success: true, sessionId: 'sess-1' });
    const { result } = renderHook(() => useSessionState('branch-1', 'user@test.com'));
    await act(async () => {
      await result.current.openSession({ openingBalance: 100, openedBy: 'user@test.com', notes: '' });
    });
    expect(mockCashService.openSession).toHaveBeenCalledWith('branch-1', {
      openingBalance: 100, openedBy: 'user@test.com', notes: '',
    });
  });

  it('closes a session', async () => {
    mockCashService.closeSession.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useSessionState('branch-1', 'user@test.com'));
    await act(async () => {
      await result.current.closeSession('sess-1', { closingBalance: 500, expectedCash: 480, closedBy: 'user@test.com', notes: '' });
    });
    expect(mockCashService.closeSession).toHaveBeenCalledWith('branch-1', 'sess-1', {
      closingBalance: 500, expectedCash: 480, closedBy: 'user@test.com', notes: '',
    });
  });
});
```

Run: `npx vitest run src/cashier/tests/hooks/useSessionState.test.ts`
Expected: FAIL

**Step 2: Implement useSessionState**

```ts
import { useState, useEffect, useCallback } from 'react';
import { cashService } from '../../lib/cashService';
import type { CashSession } from '../types';

interface SessionState {
  session: CashSession | null;
  loading: boolean;
  error: string | null;
}

export function useSessionState(branchId: string | null, userEmail: string) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true, error: null });

  useEffect(() => {
    if (!branchId) {
      setState({ session: null, loading: false, error: null });
      return;
    }
    setState(prev => ({ ...prev, loading: true }));
    const unsub = cashService.subscribeToSessions(branchId, (sessions) => {
      const active = sessions.find((s: CashSession) => s.status === 'open') || null;
      setState({ session: active, loading: false, error: null });
    });
    return unsub;
  }, [branchId]);

  const openSession = useCallback(async (data: { openingBalance: number; openedBy: string; notes: string }) => {
    if (!branchId) return { success: false, error: 'No branch selected' };
    setState(prev => ({ ...prev, error: null }));
    const result = await cashService.openSession(branchId, data);
    if (!result.success) {
      setState(prev => ({ ...prev, error: result.error || 'Error opening session' }));
    }
    return result;
  }, [branchId]);

  const closeSession = useCallback(async (sessionId: string, data: { closingBalance: number; expectedCash: number; closedBy: string; notes: string }) => {
    if (!branchId) return { success: false, error: 'No branch selected' };
    setState(prev => ({ ...prev, error: null }));
    const result = await cashService.closeSession(branchId, sessionId, data);
    if (!result.success) {
      setState(prev => ({ ...prev, error: result.error || 'Error closing session' }));
    }
    return result;
  }, [branchId]);

  return { ...state, openSession, closeSession };
}
```

**Step 3: Run tests**

Run: `npx vitest run src/cashier/tests/hooks/useSessionState.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cashier/hooks/useSessionState.ts src/cashier/tests/hooks/useSessionState.test.ts
git commit -m "feat(cashier): add useSessionState hook with open/close session logic"
```

---

### Task 1.6: Build useOrdersPipeline hook

**Files:**
- Create: `src/cashier/hooks/useOrdersPipeline.ts`
- Test: `src/cashier/tests/hooks/useOrdersPipeline.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrdersPipeline } from './useOrdersPipeline';

const mockOrders = [
  { id: '1', status: 'entregado', payment_status: 'pagado', payment_method: 'Efectivo', financials: { total: 50 } },
  { id: '2', status: 'recibido', payment_status: 'pendiente', financials: { total: 30 } },
];

vi.mock('../../lib/ordersService', () => ({
  ordersService: {
    subscribeToOrders: vi.fn((_bid, cb) => { cb(mockOrders); return () => {}; }),
  },
}));

describe('useOrdersPipeline', () => {
  it('subscribes to orders for the given branch', () => {
    const { result } = renderHook(() => useOrdersPipeline('branch-1', 100));
    expect(result.current.orders.length).toBe(2);
    expect(result.current.kpis.totalEfectivo).toBe(50);
    expect(result.current.kpis.totalPendiente).toBe(30);
  });

  it('filters orders by search query', () => {
    const { result } = renderHook(() => useOrdersPipeline('branch-1', 100));
    act(() => result.current.setSearchQuery('efectivo'));
    // Only order 1 has "Efectivo" as payment_method
    expect(result.current.filteredOrders.length).toBe(1);
  });

  it('returns loading state', () => {
    const { result } = renderHook(() => useOrdersPipeline(null, 0));
    expect(result.current.loading).toBe(false);
  });
});
```

Run: `npx vitest run src/cashier/tests/hooks/useOrdersPipeline.test.ts`
Expected: FAIL

**Step 2: Implement useOrdersPipeline**

```ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ordersService } from '../../lib/ordersService';
import { calculateKPIs } from '../services/calculator';
import type { Order } from '../types';

export function useOrdersPipeline(branchId: string | null, openingBalance: number) {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!branchId) {
      setAllOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = ordersService.subscribeToOrders(branchId, (data: Order[]) => {
      setAllOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [branchId]);

  const sessionOrders = useMemo(() => {
    // Session orders would need a reference point (openedAt)
    // For now, returns all orders sorted by createdAt desc
    return [...allOrders].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return sessionOrders;
    const q = searchQuery.toLowerCase();
    return sessionOrders.filter(o =>
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.mesa && o.mesa.toLowerCase().includes(q))
    );
  }, [sessionOrders, searchQuery]);

  const kpis = useMemo(() => calculateKPIs(allOrders, openingBalance), [allOrders, openingBalance]);

  return { orders: allOrders, sessionOrders, filteredOrders, kpis, loading, searchQuery, setSearchQuery };
}
```

**Step 3: Run tests**

Run: `npx vitest run src/cashier/tests/hooks/useOrdersPipeline.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/cashier/hooks/useOrdersPipeline.ts src/cashier/tests/hooks/useOrdersPipeline.test.ts
git commit -m "feat(cashier): add useOrdersPipeline hook for order subscription, filtering and KPI computation"
```

---

## Phase 2: Components — Migrate existing UI (Week 2)

### Task 2.1: Create CashierUI presenter and modals index

**Files:**
- Create: `src/cashier/components/CashierUI.tsx`
- Create: `src/cashier/components/modals/index.ts` (lazy barrel exports)

**Key patterns:**
- CashierUI receives ALL data as props — props interface matches return types of hooks
- All modals lazy-loaded: `const QuickPayModal = React.lazy(() => import('./modals/QuickPayModal'));`
- Suspense boundary wraps modals

### Tasks 2.2–2.7: Extract each modal

Each modal follows the same pattern:
1. Write test
2. Extract existing JSX from CajeroView.jsx lines into new file
3. Apply `cashier-theme` CSS classes
4. Verify test passes
5. Commit

Modals to extract (in order):
- SessionModal (open/close cash) — CajeroView.jsx lines 1024–1178
- QuickPayModal (payment + discounts) — lines 1303–1432
- CancelOrderModal — lines 1180–1233
- TransferTableModal — lines 1235–1301
- VerifyPaymentModal — lines 1434–1502
- ReceiptModal — lines 1504–1586

### Task 2.8: Extract widgets

Widgets to extract:
- KpiGrid (KPICard component) — lines 650–658, 1624–1640
- OrderListItem + OrderDetailPanel — lines 743–948
- CashSessionHistory — lines 957–1021
- TopProducts — lines 674–710

### Task 2.9: Create container index.tsx

Rewrite CajeroView.jsx → `src/cashier/index.tsx` as container:

```tsx
export default function CashierView() {
  const { user, logout } = useAuth();
  const { activeBranchId, branches } = useBranch();
  const { session, loading: sessionLoading, openSession, closeSession } = useSessionState(activeBranchId, user?.email || '');
  const { orders, sessionOrders, filteredOrders, kpis, searchQuery, setSearchQuery } = useOrdersPipeline(activeBranchId, session?.openingBalance || 0);
  const modal = useModalStack();

  // Wire up QuickPay, display state, etc.
  // Return <CashierUI ...props />
}
```

---

## Phase 3: New Features (Week 3)

### Task 3.1: Split Bill
- Create `SplitBillModal.tsx`
- Add `splits` field to order schema in database
- Update calculator.ts with split logic
- Tests

### Task 3.2: Multi-method Payment
- Enhance QuickPayModal with "Add method" row
- Validation: sum of methods must equal total
- Tests

### Task 3.3: Per-Item Discount
- Enhance OrderDetailPanel with discount toggle per item
- Update calculator.ts
- Database: add discount field to item
- Tests

### Task 3.4: Partial Refund
- Enhance CancelOrderModal to support item selection
- Create refund database logic
- Tests

---

## Phase 4: Polish + Documentation (Week 4)

### Task 4.1: Exportable Report
- Create `reportGenerator.ts` service
- Create CSV download logic
- Enhance ShiftSummary with export buttons
- Tests

### Task 4.2: Offline Queue
- Create `useOfflineQueue.ts`
- Queue operations when offline
- Replay on reconnect
- Tests

### Task 4.3: MODULE_STANDARD.md
The winning artifact. Complete template documenting:
- File structure (copy this to every module)
- Hook patterns (useModalStack, useSessionState, etc.)
- Component patterns (container/presenter, lazy modals)
- Service patterns (pure functions)
- CSS token system (how to add scoped themes)
- Testing standards (coverage targets, test structure)
- Feature addition checklist

### Task 4.4: Performance Audit
- Bundle size before/after
- Re-render profiling
- Lazy load timing
- Lighthouse audit
- Document results for presentation

### Task 4.5: Presentation Prep
- Before/after screenshots
- 5-minute demo script
- Key technical achievements summary
- ROI argument for adopting this as the standard

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CajeroView.jsx is still the active route | HIGH — dual maintenance | Keep old file until full migration, route switch at end of Week 2 |
| New CSS tokens conflict with existing cm-* | MEDIUM | Scoped via `.cashier-theme` — zero conflict |
| Firebase RTDB permission errors on new fields | HIGH | Test new DB writes with rules before deploying |
| Split bill schema change breaks existing orders | MEDIUM | schema validation — `splits` field is optional |
| Team not adopting MODULE_STANDARD.md | LOW (out of scope) | Deliverable is the standard, not enforcement |
