# Design: Admin Orders Overhaul

## Technical Approach

Refactor the monolithic 763-line `OrdersTab.jsx` into a self-contained module with extracted components, hooks, and modals. Move filter/sort/page logic out of `AdminView` into `OrdersTab` via a new `useOrdersDisplay` hook — keeping backward compat by ignoring legacy prop overrides. Fix four bugs in `ordersService.js`, `useAdminOrders.ts`, and `workerTypes.ts` as high-priority pre-work.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| Keep filters in AdminView vs move to OrdersTab | AdminView owns filter state for PendingPaymentBanner; OrdersTab needs its own for encapsulation | OrdersTab self-contains via `useOrdersDisplay(allOrders)`. AdminView still passes old props (no-op) for seamless rollback |
| Single master hook vs domain hooks | Single hook is simpler but harder to test | `useOrdersDisplay` for display logic, `useKeyboardNav` for keyboard, `useOptimistic` for mutations — separated by concern |
| Extract modals vs keep inline | Inline makes OrdersTab huge (763→~150 lines after extraction). Modals are self-contained state machines | Extract all 5 modals — each becomes a standalone component with its own state/submit/error handling |

## Component Tree (NEW files)

```
src/admin/
├── hooks/
│   ├── useOrdersDisplay.ts     ───── NEW: filter + sort + paginate allOrders locally
│   ├── useKeyboardNav.ts       ───── NEW: arrow-key row navigation
│   └── useOptimistic.ts        ───── NEW: save/revert pattern for mutations
├── components/orders/          ───── NEW directory
│   ├── OrdersToolbar.jsx       ───── SearchBar + StatusFilter + PaymentFilter + TypePills + PaginationInfo
│   ├── OrdersTable.jsx         ───── Sortable <table> wrapper (receives rows, renders header + body)
│   ├── OrdersTableRow.jsx      ───── Single row: ID, customer, status, total, actions
│   ├── OrdersTableExpandable.jsx ─── Expandable detail (items, financials, action buttons)
│   ├── OrderDetailPanel.jsx    ───── Content of expanded row: ItemsTable + FinancialSummary + ActionButtons
│   ├── CobrarModal.jsx         ───── Extracted from OrdersTab (Efectivo/Yape/Tarjeta selector)
│   ├── EditOrderModal.jsx      ───── Extracted from OrdersTab (inline item editing)
│   ├── NotesModal.jsx          ───── Extracted from OrdersTab (textarea note)
│   ├── RefundModal.jsx         ───── Extracted from OrdersTab (amount + method + reason)
│   └── VerifyPaymentModal.jsx  ───── Extracted from OrdersTab (voucher img + confirm/reject)
```

## Data Flow

```
AdminView ──→ allOrders (prop) ──→ OrdersTab
                                       │
                              useOrdersDisplay(allOrders)
                              ├─ state: searchQuery, statusFilter, paymentFilter, typeFilter, sortBy, page
                              ├─ computed: filtered → sorted → paginated rows
                              └─ returns: { rows, totalCount, page, setPage, ...filters }
                                       │
                              Renders: OrdersToolbar + OrdersTable
                                       │
                              Each modal: gets order data + onClose + activeBranchId + can()
                              Modal actions → ordersService (optimistic via useOptimistic)
```

Key point: `OrdersTab` ignores incoming `filteredOrders`, `searchQuery`, `onSearchQueryChange`, `statusFilter`, `onStatusFilterChange`, `paymentFilter`, `onPaymentFilterChange` props. They exist in the prop signature for backward compat but are never read at runtime.

## Hook Designs

### useOrdersDisplay

```typescript
interface OrdersDisplayReturn {
  rows: Order[];           // current page
  totalCount: number;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  searchQuery: string;
  statusFilter: string;
  paymentFilter: string;
  orderTypeFilter: string;   // '' | 'delivery' | 'recojo' | 'local'
  sortField: string;
  sortDir: 'asc' | 'desc';
  setSearchQuery: (q: string) => void;
  setStatusFilter: (f: string) => void;
  setPaymentFilter: (f: string) => void;
  setOrderTypeFilter: (f: string) => void;
  setSort: (field: string) => void;
  setPage: (p: number) => void;
}
```

- `pageSize = 50`, reset to 1 on any filter change
- Sorting defaults to `createdAt desc`
- Order type filter matches against `order.type || order.order_type`

### useKeyboardNav

```typescript
interface KeyboardNavReturn {
  highlightedIndex: number;
  setHighlightedIndex: (i: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}
// ↑↓: nav rows, Enter: toggle expand, Esc: collapse, /: focus search
```

### useOptimistic

```typescript
function useOptimistic<T>(initial: T): {
  state: T;
  setState: (next: T) => void;
  execute: (mutation: () => Promise<void>, rollback: (prev: T) => void) => Promise<void>;
}
// On execute(): save current state, call mutation, on error call rollback(prev)
```

## Bugfix Implementation Plans

| ID | Problem | Fix | Files |
|----|---------|-----|-------|
| **R1** | Two `addOrderNote` defs — first writes `internalNote` (line 441), second appends to `notes[]` (line 554) | Remove first def (lines 441-454). Update OrdersTab `openNotes`/`saveNotes` to read `notes[last].text` instead of `internalNote`. Keep `internalNote` as read-only fallback | `ordersService.js` delete lines 441-454; `OrdersTab.jsx` line 187: `order.notes?.[order.notes.length-1]?.text \|\| order.internalNote` |
| **R2** | `batchUpdateOrderStatus` writes `ordersStatusPath` + `ordersUpdatedAtPath` per order (2 paths) instead of one root write | Replace with `ordersPath(branchId, orderId)` as key + `{ status, updatedAt }` value per order — single path per order | `ordersService.js` lines 369-372 |
| **R3** | Delivery notification checks `order.status === 'pendiente'` which never fires (no order has that status) | Change to `order.status === 'recibido'` to catch new delivery orders | `useAdminOrders.ts` line 37 |
| **R4** | `pendiente_pago` not in `ORDER_STATUSES` (used by `createOrder` for Yape/Plin orders) | Add `{ value: 'pendiente_pago', label: 'Pendiente de pago', color: 'bg-cm-warning' }` to `ORDER_STATUSES` and to `ACTIVE_STATUSES`. `programado` already present. | `workerTypes.ts` line 125 (ORDER_STATUSES) and line 141 (ACTIVE_STATUSES) |

## Status State Machine

```
Order lifecycle (Firebase RTDB):
  pendiente_pago ──→ recibido ──→ preparando ──→ listo ──→ en_camino ──→ entregado
       ↓ (verify)       │                                            ↑
      recibido          └──────── cancelado (any active state) ───────┘

Payment lifecycle (parallel):
  pendiente ──→ por_verificar ──→ pagado ──→ reembolsado
                             ↓
                        pendiente (rejected)
```

`batchUpdateOrderStatus` handles `recibido→preparando→listo→{en_camino,entregado}` transitions in bulk. Single-order cancellations use existing `updateOrderStatus` (handles stock revert).

## Pagination Strategy

- `pageSize = 50`, `page` starts at 1
- On filter/sort change: `page → 1`
- Controls: Previous/Next buttons + page number buttons (max 5 visible) + "Showing X-Y of Z"
- Empty state: centered "No se encontraron pedidos" (already exists in template)
- Loading state: skeleton rows via `<Skeleton />` (exists in `admin/components/Skeleton.tsx`)

## Keyboard Shortcut Mappings

| Key | Context | Action |
|-----|---------|--------|
| `↑` / `↓` | Table focused | Move highlight up/down |
| `Enter` | Row highlighted | Toggle expand |
| `Esc` | Expanded/Modal | Close |
| `1`-`5` | Row expanded | Set status (recibido→entregado) |
| `/` | Any | Focus search input |
| `m` | Row expanded | Open payment modal |

## Animation Strategy

Keep existing patterns: `AnimatePresence` for modals, scale+fade for open/close, `motion.tr` for row expand with layout animation. Add `whileTap={{ scale: 0.95 }}` to all action buttons (match existing cobrar modal pattern). No new animation dependencies.

## Migration Plan

| Phase | Scope | Risk | Verification |
|-------|-------|------|-------------|
| **1** | Bugfixes R1-R4 | Low — each is isolated | `npm run test -w apps/house-menu` |
| **2** | Extract modals (CobrarModal, EditOrderModal, NotesModal, RefundModal, VerifyPaymentModal) | Medium — imports change | OrdersTab still renders same output |
| **3** | Create hooks (useOrdersDisplay, useKeyboardNav, useOptimistic) | Low — pure logic, testable | Unit tests for filter/sort/paginate |
| **4** | Extract components (OrdersToolbar, OrdersTable+Row+Expandable) | Medium — visual refactor | Snapshot test each state |
| **5** | Wire OrdersTab to use hooks + extracted components | Medium — remove inline code | Full orders flow test |
| **6** | Clean up AdminView — remove unused filter props | Low — no behavioral change | Smoke test admin view |

Phases 1-2 are safe to parallelize. Phase 3-4 can run after. Phase 5-6 are cleanup.

## Open Questions

- [ ] `pendiente_pago` in workerTypes — confirm it should also show in KDS (kitchen display) or only admin
- [ ] `batchUpdateOrderStatus` callers — grep to verify no other components depend on the sub-path behavior
- [ ] `internalNote` fallback in R1 — are there historical orders with only `internalNote` and no `notes[]`?
