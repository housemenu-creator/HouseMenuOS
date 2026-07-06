# Tasks: Cashier Order Entry

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~680–780 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (UI + Wiring) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types, useCatalog, useOrderBuilder + tests | PR 1 | Self-contained, no UI deps |
| 2 | NewOrderModal, CashierUI wiring, integration tests | PR 2 | Depends on PR 1 hooks |

## Phase 1: Types & Infrastructure

- [x] T1.1 Add `CatalogProduct`, `OrderPayload`, `CartItem` interfaces + `'newOrder'` to `ModalName` in `types.ts`
- [x] T1.2 Create `useCatalog(branchId)` hook — subscribe via `menuService.subscribeToCatalog`, 4-state lifecycle, filter `available:true`, group by category, search by name
- [x] T1.3 Create `useOrderBuilder()` hook — `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `setCustomerName`, `setMesa`, `setNotes`, computed `total`/`valid`/`warnings`, `buildPayload()`, `reset()`
- [x] T1.4 Unit tests: `useCatalog` — subscription lifecycle, loading/error/empty/populated states, filter/search/group
- [x] T1.5 Unit tests: `useOrderBuilder` — add/increment/remove/quantity-zero, metadata, total calc, validation, buildPayload, reset

## Phase 2: UI & Integration

- [x] T2.1 Create `NewOrderModal.tsx` — lazy modal with `CatalogBrowser` (category tabs + product grid + search) + `CartPanel` (cart items, customer/mesa/notes fields, total, confirm). 4 states: loading/empty/error/populated. AnimatePresence, glassmorphism per project tokens
- [x] T2.2 Add "Cobrar ahora" checkbox to NewOrderModal — conditionally opens `QuickPayModal` post-creation
- [x] T2.3 Add "Nuevo Pedido" button to `CashierUI.tsx` header — disabled when no active session, tooltip "Abrí caja primero"
- [x] T2.4 Wire `NewOrderModal` in `CashierUI.tsx` — lazy import, render in Suspense block when `modal.activeModal === 'newOrder'`
- [x] T2.5 Wire `handleCreateOrder` in `index.tsx` — pass `onCreateOrder` (calls `pipeline.createOrder` with session data) + `onOpenQuickPay` (opens QuickPayModal)
- [x] T2.6 Export `NewOrderModal` from `modals/index.ts`
- [x] T2.7 Component test: `NewOrderModal` — search, add items, empty cart blocked, confirm flow, error state
- [ ] T2.8 Integration test: full flow — open modal → browse → add items → confirm → verify order in RTDB list → optional QuickPay
