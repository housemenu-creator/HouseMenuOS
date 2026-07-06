# Design: Cashier Order Entry

## Technical Approach

Compose three new capabilities (catalog browsing, cart building, order creation) into a single modal launched from `CashierUI`. Catalog subscription lives inside `NewOrderModal` via `useCatalog`; cart state via `useOrderBuilder`. On confirm, call existing `useOrdersPipeline.createOrder()`, then optionally open `QuickPayModal` for immediate payment.

## Architecture Decisions

| Option | Alternatives | Rationale |
|--------|-------------|-----------|
| `useCatalog` inside `NewOrderModal` | Lifted to container | Catalog only needed when modal open; avoids subscription when idle, follows existing modal pattern |
| `useOrderBuilder` as local hook | Zustand store, lifted state | Cart is ephemeral — exists only during order creation. No cross-component consumers. Reset on close. |
| Single modal with two internal sections | Separate page, stacked modals | Keeps cashier in same view; left panel (catalog) + right panel (cart) fits existing modal pattern |
| `'newOrder'` added to `ModalName` union | Separate modal system | Follows existing type-safe modal dispatch pattern in `CashierUI.tsx` |
| `createOrder` passed from container | Modal imports service directly | Container owns `branchId` and `sessionId`; modal stays presentational with injected handler |

## Component Tree

```
CashierUI
  ├─ "Nuevo Pedido" button (header, disabled when no session)
  └─ <Suspense>
       └─ NewOrderModal
            ├─ CatalogBrowser     (product grid, search, category tabs)
            └─ CartPanel          (items, customer fields, total, confirm)
```

## Data Flow

```
menuService.subscribeToCatalog(branchId, cb)
  → useCatalog                                 → NewOrderModal
       → CatalogBrowser renders grouped grid       → onSelect(product)
                                                       → useOrderBuilder.addItem(product)
                                                       → CartPanel renders items
                                                       → "Confirmar" → buildPayload()
                                                         → pipeline.createOrder(payload)
                                                           → success → toast + optional QuickPayModal
                                                           → error   → preserve cart, show toast
```

## New Hooks API

### `useCatalog(branchId: string | null)`

```typescript
interface CatalogState {
  products: CatalogProduct[];   // flat array, available:true only
  categories: string[];         // sorted category names
  loading: boolean;
  error: string | null;
}
// Returns: CatalogState + retry(): void
// Internal: useEffect subscribes via menuService.subscribeToCatalog
//           onError param for error state; cleanup on unmount
```

### `useOrderBuilder()`

```typescript
interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;    // base_price per unit
  notes?: string;
}

interface OrderBuilder {
  items: CartItem[];
  customerName: string;
  mesa: string;
  notes: string;
  total: number;                    // derived: sum(qty * price)
  valid: boolean;                   // items.length > 0
  warnings: string[];               // e.g. ["customer name missing"]
  addItem: (product: CatalogProduct) => void;     // increments qty if exists
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;  // qty=0 → remove
  setCustomerName: (name: string) => void;
  setMesa: (table: string) => void;
  setNotes: (text: string) => void;
  buildPayload: () => OrderPayload | { valid: false; reason: string };
  reset: () => void;
}
```

### New Types (in `types.ts`)

```typescript
interface CatalogProduct {
  id: string;
  name: string;
  base_price: number;
  category: string;
  available: boolean;
  description?: string;
  image?: string;
}

interface OrderPayload {
  customerName: string;
  mesa: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total: number;
  notes: Array<{ text: string; createdBy: string; createdAt: string }>;
  source: 'cashier';
  sessionId: string;
}
```

## New Component API

### `NewOrderModal`

```typescript
interface NewOrderModalProps {
  branchId: string;
  sessionId: string;
  userEmail: string;
  onClose: () => void;
  onCreateOrder: (payload: OrderPayload) => Promise<{
    success: boolean; orderId?: string; error?: string;
  }>;
  onOpenQuickPay: (orderId: string) => void;   // navigates to QuickPayModal
}
```

Internal composition: `CatalogBrowser` + `CartPanel` as private sub-components within the file (same pattern as `KpiCardSmall`/`SessionModal` in `CashierUI.tsx`).

## Modified Files

| File | Change |
|------|--------|
| `types.ts` | Add `'newOrder'` to `ModalName`, add `CatalogProduct`, `OrderPayload` interfaces |
| `CashierUI.tsx` | Add "Nuevo Pedido" button in header; lazy import `NewOrderModal`; render in Suspense block; pass `onCreateOrder` |
| `index.tsx` | Pass `onCreateOrder` handler wiring `pipeline.createOrder` + `session.session?.id`; pass `onOpenQuickPay` via `modal.open` |
| `modals/index.ts` | Add `NewOrderModal` lazy export |

## Payment Flow

1. `NewOrderModal` has a "Cobrar ahora" checkbox (default: off)
2. On confirm → `buildPayload()` → `onCreateOrder(payload)`
3. On success: if checkbox checked → call `onOpenQuickPay(orderId)` which calls `modal.open('quickPay', { order })` → existing `QuickPayModal` renders
4. If unchecked → `onClose()`, toast "Pedido #XYZ creado", cart resets

## Edge Cases

| Case | Handling |
|------|----------|
| No active session | Button disabled, tooltip "Abrí caja primero" — already handled by `CashierUI` |
| Empty catalog | "Catálogo vacío" state in catalog panel |
| Catalog error | Error banner with retry button |
| 0 items → confirm | Button disabled (`valid === false`) |
| No customer name | Warning displayed, submit allowed (per spec) |
| Create order fails | Error toast, cart preserved, modal stays open |
| Double-submit | Loading state disables button and all inputs |

## Session Integration

`createOrder` payload includes `sessionId: session.id`. The order list in `CashierUI` filters by session `openedAt` timestamp (already implemented in `index.tsx` via `sessionOrders`). New orders appear automatically via RTDB subscription.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `useOrderBuilder` — add, increment, remove, reset, buildPayload, validation | Pure function tests |
| Unit | `useCatalog` — subscription lifecycle, error state | Mock `menuService.subscribeToCatalog` |
| Component | `NewOrderModal` — render, search, filter, confirm flow | RTL + mocked hooks |
| Integration | Full flow: button → modal → create → QuickPay | RTL + mocked services |

## Migration

No migration required. `createOrder()` was already in the pipeline — this change wires UI to it. Rollback: revert `CashierUI.tsx`, `index.tsx`, `types.ts`; drop `NewOrderModal.tsx`, `useCatalog.ts`, `useOrderBuilder.ts`.
