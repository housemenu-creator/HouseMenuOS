# Cashier Module Redesign — Clean Module Architecture

**Date:** 2026-07-05
**Author:** AI Architect (Competition Entry)
**Status:** Draft — pending review

---

## 1. Why This Matters

The Cashier module is the most feature-dense view in the system (1,640 lines, 30+ states, 5 inline modals). This redesign is not merely a refactor — it establishes the **Clean Module Architecture** standard that will be replicated across all 14 views (Mozo, Repartidor, Admin, KDS, etc.).

Every architectural decision below is made with replication in mind. The patterns, file structure, and conventions documented here are designed to be copy-pasted into other modules.

---

## 2. Visual Identity — House Industrial Retro

### 2.1 Concept

The Cashier module adopts a **Industrial Retro** identity: 60% professional cash register robustness, 30% clean minimalism, 10% retro tech nostalgia. It must feel like operating a serious tool designed for 8-hour shifts in a demanding commercial environment — not a consumer app.

The design is inspired by the **ER-350** electronic cash register, but adapted as a modern web application. The user should *feel* the reliability of that machine without it being a literal copy.

### 2.2 Color Palette — Scoped Tokens

All Cashier tokens are prefixed with `--cashier-*` and scoped to the module via a wrapper class `.cashier-theme`. The rest of the system keeps `--cm-*` untouched.

| Token | Value | Usage |
|-------|-------|-------|
| `--cashier-bg` | `#121212` | Grafito negro — fondo principal del módulo |
| `--cashier-surface` | `#1B1B1B` | Antracita — paneles, cards, modales |
| `--cashier-border` | `#343434` | Gris metálico — bordes |
| `--cashier-text` | `#F2F2F2` | Blanco suave — texto principal |
| `--cashier-text-secondary` | `#B8B8B8` | Gris — texto secundario |
| `--cashier-text-muted` | `#6B6B6B` | Gris oscuro — hints, placeholders |

Status accent colors (only as accents, never full backgrounds):

| Token | Usage |
|-------|-------|
| `--cashier-info` `#3B82F6` | Navegación, información, módulos |
| `--cashier-success` `#22C55E` | Caja abierta, operaciones exitosas, total cobrado |
| `--cashier-warning` `#F59E0B` | Advertencias, descuentos, atención |
| `--cashier-error` `#EF4444` | Cancelar, eliminar, errores |
| `--cashier-accent` `#A855F7` | Destacados, venta actual, promociones |

### 2.3 Texture System

No flat surfaces. Every panel gets an **extremely subtle noise texture** (2% opacity grain overlay via CSS pseudo-element). This evokes:

- Metal pintado (painted metal)
- Plástico texturizado (textured plastic)
- Acabado mate industrial

```css
.cashier-panel::before {
  content: '';
  position: absolute; inset: 0;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,...noise...");
  pointer-events: none;
  z-index: 0;
}
```

### 2.4 Typography

| Role | Font | Usage |
|------|------|-------|
| UI | **Inter** | All interface: labels, menus, tables, buttons |
| Display | **Share Tech Mono** (or similar LCD) | Only for: TOTAL, importe, subtotal, cambio, hora, item count indicators |

The LCD font is reserved exclusively for the **LED Display** — the visual heart of the cashier module. Never use it for menus, tables, or navigation.

### 2.5 The LED Display — CashierDisplay Component

The most recognizable element. Inspired by the ER-350's physical display panel.

```
┌─────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░  │ ← very subtle scan lines
│                             │
│         TOTAL               │ ← small label
│      ┌───────┐              │
│      │ 64.00 │              │ ← LCD font, large
│      └───────┘              │
│     3 ARTÍCULOS             │ ← smaller label below
│                             │
│  ─────────────────────────  │ ← fine horizontal separator
│  CAJA ABIERTA    02:34:15  │ ← status + clock
└─────────────────────────────┘
```

**CSS:**
- Deep black background (`#0A0A0A`)
- Very fine horizontal scan lines (repeating linear-gradient at 1px)
- Subtle inner glow (box-shadow inset)
- LCD font, large size
- Ambient glow on the TOTAL number (text-shadow with accent color at 30%)

**States:**
- `total` — Current order total + item count
- `payment` — Amount received + change due
- `closed` — "CAJA CERRADA" + date
- `idle` — Clock + "LISTO" with pulsing dot

### 2.6 Physical Buttons (Non-Cashier Modules)

For the rest of the system (Dashboard, Configuración, etc.), buttons should feel like physical keys:
- Beveled borders (1px lighter top, 1px darker bottom)
- Subtle inner shadow for depth
- Press effect: translateY(1px) + shadow reduction

The Cashier module itself keeps modern buttons (per prompt spec), but with the industrial color palette.

### 2.7 Key Visual Principles

1. **Colors only as accents** — never tint the entire screen
2. **Speed is the feature** — every interaction under 150ms
3. **The LCD Display is the soul** — it's what the jefe will remember
4. **Texture is invisible until you look for it** — that's the point
5. **No flat surfaces** — every panel feels like a physical machine part
6. **Inter for work, LCD for numbers** — strict separation of concerns

### 2.8 Coexistence with cm-* System

The Cashier module wraps in:
```tsx
<div className="cashier-theme">
  {/* All cashier content uses --cashier-* tokens */}
</div>
```

The `cashier-theme` class scopes all custom properties. The rest of the app remains untouched with `--cm-*`. This means:
- Zero risk of breaking other modules
- Gradual adoption path (other modules can adopt cashier-theme later)
- Clear CSS separation for the presentation to the jefe

---

## 3. Architecture Philosophy

### Law 1: Zero JSX in Hooks
Hooks return data and callbacks. Never JSX. This makes hooks testable without rendering, reusable across modules, and independently verifiable.

### Law 2: Zero Logic in Components
Components receive props and render. No Firebase calls, no data transformation, no business rules. All logic lives in hooks and services.

### Law 3: Modal as Stack, Not State
One `useModalStack()` replaces 5 separate `useState` booleans. Modals are lazy-loaded on open. This pattern alone saves ~200 lines and eliminates the `isAnyModalOpen` combinatorial explosion.

### Law 4: Services Are Pure Functions
Services (`calculator.ts`, `receiptEngine.ts`) have zero React dependency. They accept numbers/objects, return numbers/objects. Testable with plain Jest, no React testing library needed.

---

## 4. File Structure

```
src/cashier/
├── MODULE_STANDARD.md              # ← THE artifact. Template for all 14 modules.
├── index.tsx                       # Container: ~30 lines, orchestrates hooks → components
├── types.ts                        # All cashier-specific types
├── constants.ts                    # Config, defaults, enums
│
├── hooks/
│   ├── useSessionState.ts          # State machine: closed → opening → open → closing → closed
│   ├── useOrdersPipeline.ts        # Subscribe → filter → compute KPIs
│   ├── useModalStack.ts            # Unified modal manager. Reusable across ALL modules.
│   ├── usePaymentFlow.ts           # QuickPay + split bill + multi-method + discounts
│   └── useOfflineQueue.ts          # Queues operations when offline, replays on reconnect
│
├── components/
│   ├── modals/                     # Each modal is independently lazy-loadable
│   │   ├── SessionModal.tsx        # Open/Close cash session
│   │   ├── QuickPayModal.tsx       # Single payment + discounts (existing, enhanced)
│   │   ├── SplitBillModal.tsx      # NEW: divide total across diners
│   │   ├── VerifyPaymentModal.tsx  # Yape/Plin verification
│   │   ├── CancelOrderModal.tsx    # Full or partial cancellation
│   │   ├── TransferTableModal.tsx  # Move order to another table
│   │   ├── ReceiptModal.tsx        # Receipt preview + print + export
│   │   └── index.ts                # Barrel with React.lazy() for all modals
│   └── widgets/                    # Reusable UI blocks
│       ├── KpiGrid.tsx             # KPI cards row
│       ├── OrderListItem.tsx       # Single order row
│       ├── OrderDetailPanel.tsx    # Expanded order detail
│       ├── CashSessionHistory.tsx  # Past sessions table
│       ├── TopProducts.tsx         # Most-sold grid
│       └── ShiftSummary.tsx        # Session summary (reused in close modal + export)
│
├── services/                       # Pure logic, zero React dependency
│   ├── calculator.ts               # Financial calculations: KPIs, splits, discounts, refunds
│   ├── receiptEngine.ts            # Receipt generation (print HTML + text format)
│   └── reportGenerator.ts          # Session report → PDF/CSV export + download
│
└── tests/
    ├── hooks/
    │   ├── useSessionState.test.ts
    │   ├── useOrdersPipeline.test.ts
    │   ├── useModalStack.test.ts
    │   ├── usePaymentFlow.test.ts
    │   └── useOfflineQueue.test.ts
    ├── components/
    │   ├── QuickPayModal.test.tsx
    │   ├── SplitBillModal.test.tsx
    │   ├── KpiGrid.test.tsx
    │   └── OrderListItem.test.tsx
    ├── services/
    │   ├── calculator.test.ts
    │   ├── receiptEngine.test.ts
    │   └── reportGenerator.test.ts
    └── e2e/
        └── cashier-flow.test.tsx    # Full flow: open → create order → cobrar → close → verify
```

---

## 5. Key Architecture Patterns

### 4.1 Modal Stack Pattern (`useModalStack`)

```ts
// SINGLE hook replaces ALL modal state variables
const { open, close, activeModal, modalProps } = useModalStack();

// Usage in view:
<button onClick={() => open('quickPay', { order })} />
{activeModal === 'quickPay' && (
  <QuickPayModal {...modalProps} onClose={() => close()} />
)}

// Benefits:
// - One hook per module, not one state per modal
// - Props are typed per modal name (discriminated union)
// - Lazy loading built in (import on open)
// - Stack mode: can layer modals (e.g., confirm on top of payment)
// - Works identically in MozoView, AdminView, etc.
```

### 4.2 State Machine Pattern (`useSessionState`)

```
States:  closed → opening → open → closing → closed
         (user clicks)   (success)  (user clicks)  (success)
                → error ←               → error ←
```

Each state transition is logged and recorded. This makes the cash session flow auditable and the UI always consistent.

### 4.3 Container / Presenter Pattern

```tsx
// index.tsx (CONTAINER) — handles data, passes props
export default function CashierView() {
  const { session, openSession, closeSession } = useSessionState();
  const { orders, kpis } = useOrdersPipeline();
  const { open, ...modal } = useModalStack();
  // ~30 lines, no JSX beyond orchestration
  return <CashierUI {...{ session, orders, kpis, modal, openSession, closeSession }} />;
}

// CashierUI.tsx (PRESENTER) — pure JSX, receives everything as props
// Testable by just passing props, no Firebase mocking needed
```

---

## 6. New Features — Design

### 5.1 Split Bill

**How it works:**
- User clicks "Dividir Cuenta" on a pending order
- `SplitBillModal` shows the order items grouped by product
- User assigns each item to a diner (Diner 1, Diner 2, etc.)
- Each diner selects their payment method independently
- System creates N sub-transactions, marks parent as paid when all diners pay

**Database impact:**
- `orders/{orderId}/splits` → `{ dinerId: { items: [...], total, method, status } }`
- `orders/{orderId}/payment_status` → `'partial'` until all splits paid

**UI states:**
- Pending splits shown as a badge on the order
- Partial payment highlighted in KPI section
- Re-open split to assign remaining items

### 5.2 Multi-Method Payment

**How it works:**
- In QuickPayModal, user can add multiple payment methods
- Each method row: method selector + amount
- System validates sum matches total (or allows over/under with warning)
- Each method creates its own transaction record

**UI states:**
- Validation: total mismatch warning (not blocking, but visible)
- Method rows can be added/removed
- Summary shows: "S/20 Efectivo + S/15 Yape = S/35"

### 5.3 Per-Item Discount

**How it works:**
- In OrderDetailPanel, each item shows a discount toggle
- User can apply % or S/ discount to individual items
- Discount reason is recorded (e.g., "cortesía", "promoción", "defecto")
- Discounted items are visually marked in the expanded panel

**Database:**
- `items/{index}/discount` → `{ type, value, reason }`
- `items/{index}/subtotal` → final price after discount

### 5.4 Partial Refund

**How it works:**
- On a paid order, user can select specific items to refund
- Refund method can differ from original (e.g., paid with Yape, refund in cash)
- System creates a refund record and updates order totals
- If all items refunded, order status → `'reembolsado'`

### 5.5 Exportable Report (Shift Summary)

**How it works:**
- On session close, `ShiftSummaryModal` shows a complete financial breakdown
- User exports as PDF (window.print with thermal format) or CSV (download)
- Report includes: opening balance, totals by method, discounts, refunds, difference

**UI states:**
- Preview before export (current "Resumen de Facturación" enhanced)
- Print button opens optimized print view
- CSV download button for spreadsheet

---

## 7. Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Bundle size (cashier module) | ~64KB (inline in view) | <30KB (lazy modals) |
| Re-renders on order update | Whole view | Only affected list items |
| Modal load time | Instant (all in bundle) | <50ms (React.lazy + Suspense) |
| Memory | All data in component state | Zustand store + selectors |

---

## 8. Testing Strategy

| Layer | Framework | What to test |
|-------|-----------|-------------|
| Services (`services/`) | Vitest (pure) | Calculator, receipt, report logic |
| Hooks (`hooks/`) | Vitest + renderHook | State transitions, edge cases |
| Components (`components/`) | Vitest + @testing-library/react | Render states, interactions |
| E2E (`tests/e2e/`) | Vitest + msck | Full cashier flow |

**Coverage targets:**
- Services: 100%
- Hooks: 90%
- Components: 80%
- E2E: 1 full flow test

---

## 9. Implementation Plan — 4 Weeks

### Week 1: Foundation (Structure + Visual Identity + Hooks)
- [ ] Create `src/cashier/` directory structure
- [ ] Implement `--cashier-*` CSS tokens + noise texture + `.cashier-theme` scoping
- [ ] Build **`CashierDisplay`** component (LED panel with scan lines, glow, LCD font)
- [ ] Import Inter + LCD font `(Share Tech Mono)` into the module
- [ ] Implement `useModalStack` (reusable across all modules)
- [ ] Implement `useSessionState` (state machine)
- [ ] Implement `useOrdersPipeline` (subscribe + filter + compute)
- [ ] Write `calculator.ts` (pure financial functions)
- [ ] Extract `StatusBadge` and `KPICard` into components
- [ ] Tests for all hooks + calculator + CashierDisplay

**Checkpoint:** Foundation stable, hooks pass tests, CashierDisplay renders with retro identity.

### Week 2: Components (Migrate existing UI)
- [ ] Create `CashierUI.tsx` (presenter — pure JSX, receives props)
- [ ] Rewrite `CajeroView.jsx` → `index.tsx` as container (~30 lines orchestrating hooks)
- [ ] Extract all 5 existing modals into `components/modals/` with lazy loading
- [ ] Apply `cashier-theme` to all modals (retro tokens)
- [ ] Extract all widgets into `components/widgets/` with retro styling
- [ ] Write `receiptEngine.ts`
- [ ] Apply physical button classes to non-cashier elements
- [ ] Tests for all components
- [ ] Verify bundle size matches targets

**Checkpoint:** All existing functionality works, now well-architected and visually transformed.

### Week 3: New Features
- [ ] Split Bill (modal + database schema + calculator integration)
- [ ] Multi-method payment (QuickPayModal enhancement)
- [ ] Per-item discount (OrderDetailPanel enhancement)
- [ ] Partial refund (modal + database logic)
- [ ] Tests for new features

**Checkpoint:** All 5 new features functional and tested.

### Week 4: Polish + Documentation
- [ ] `reportGenerator.ts` + export buttons (PDF + CSV)
- [ ] ShiftSummary enhancement (preview + export)
- [ ] `useOfflineQueue` (offline resilience)
- [ ] **Write `MODULE_STANDARD.md`** — THE artifact. Complete template for 14 modules
- [ ] E2E test for full cashier flow
- [ ] Performance audit (bundle, re-renders, lazy load timing)
- [ ] Final review: before/after screenshots, metric comparisons
- [ ] Presentation prep: 5-minute demo script

**Checkpoint:** Everything documented, tested, and presentation-ready.

---

## 10. The Winning Argument

When the jefe sees this module, he should see:

> **"This is not just a refactored view. This is the blueprint for every module in the system."**

The deliverables:
1. **A working Cashier module** — no es solo código limpio, tiene **ALMA**. El LCD display retro con scan lines, textura industrial, botones físicos. El jefe LO VE y sabe que es diferente.
2. **`MODULE_STANDARD.md`** — copy this to `/mozo/`, `/delivery/`, `/admin/` and they follow the same architecture AND visual identity system.
3. **5 new features** — Split Bill, Multi-method payment, Per-item discount, Partial refund, Exportable reports
4. **Tests at every layer** — services (100%), hooks (90%), components (80%), e2e
5. **Performance data** — before/after bundle size, re-render count, lazy load timing
6. **All documentation in Spanish** for the team, **architecture in English** for code consistency

---

## 11. Open Questions

- Split bill: ¿máximo de comensales permitidos por split? (propongo: 6)
- Reporte exportable: ¿solo PDF o también CSV/Excel? (propongo: ambos)
- Per-item discount: ¿se registra quién autorizó el descuento? (propongo: sí, con user email)
- `cashier/` o `src/features/cashier/`? (vamos con `src/cashier/` por ser el mismo nivel que `mozo/` y `delivery/`)
