# Orders Admin Specification

## Purpose

Admin order listing, filtering, status management, modals, and real-time updates.

## Requirements

### R1: Bugfixes — Service Layer

Four critical fixes in shared services. No behavioral change outside admin.

| Bug | Fix |
|-----|-----|
| `addOrderNote` double defined | Remove first overload (writes `internalNote`). Keep array-append (`notes[]`). OrdersTab reads `notes[]` with `internalNote` fallback. |
| `batchUpdateOrderStatus` wrong paths | Write `order.status` and `order.updatedAt` as root fields via `ordersPath`. |
| Delivery notification checks `status === 'pendiente'` | Check `(type\|order_type === 'delivery') && (payment_status !== 'pagado' \|\| status === 'recibido')` |
| `pendiente_pago` missing | Add to `ORDER_STATUSES`, `STATUS_WORKFLOW`, `StatusBadge`. |

### R2: Quick Status Actions

Expanded rows have single-click buttons (Preparando→Listo→Entregado). "Entregado" needs confirm. Gated by `orders:update_status`.

- GIVEN expanded row `preparando` WHEN "Listo" clicked THEN status updates AND next button appears
- GIVEN `listo` WHEN "Entregado" clicked THEN confirm dialog; only proceeds on confirm
- GIVEN no `orders:update_status` permission WHEN expanded row renders THEN buttons hidden

### R3: New Order Highlight

Orders <60s old get pulse + "NUEVO" badge. Fades after 60s.

- GIVEN order created 10s ago WHEN table renders THEN row pulse AND "NUEVO" badge
- GIVEN order created 90s ago WHEN table renders THEN no pulse, no badge

### R4: Extracted Modals

Five modals → `src/admin/components/orders/`:
`CobrarModal` (confirmation step), `EditOrderModal` (add items), `NotesModal` (notes[]), `RefundModal`, `VerifyPaymentModal`.

- GIVEN EditOrderModal WHEN "Agregar item" THEN empty row appears AND save persists full items[]
- GIVEN CobrarModal WHEN method+confirm THEN second confirmation required before payment

### R5: Pagination

50/page. Controls at bottom. Filters maintained. "Showing X-Y of Z".

- GIVEN 120 filtered orders, filter="recibido" WHEN page 2 THEN rows 51-100 AND filter unchanged
- GIVEN 0 results WHEN renders THEN empty state, no pagination

### R6: Order Type Filter

Pills: Todos, Delivery, Recojo, Local. Type = `order.type \|\| order.order_type \|\| 'local'`.

- GIVEN mixed types WHEN "Delivery" clicked THEN only orders with type containing 'delivery'
- GIVEN mixed types WHEN "Local" clicked THEN only type='local' (or undefined)

### R7: Column Sorting

Click headers (ID, Cliente, Estado, Total, Fecha) toggles sort. Arrow indicator. Preserved with filters.

- GIVEN populated table WHEN "Total" clicked twice THEN sort desc AND down-arrow on header

### R8: Keyboard Shortcuts

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| j/k | Navigate rows | 1-5 | Quick status |
| Enter | Expand row | Esc | Close/deselect |
| c | Cobrar | p | Print |

Hints shown on hover.

- GIVEN 10 orders WHEN `j`×3 THEN 3rd highlighted WHEN `Enter` THEN expands WHEN `3` THEN status→`listo`

### R9: Optimistic UI

Cobrar/edit/notes/refund update local state immediately. Revert on error. Toast on success/error.

- GIVEN `payment_status: 'pendiente'` WHEN cobrar confirmed THEN UI→`'pagado'` AND success-toast on confirm
- GIVEN same WHEN write fails THEN UI→`'pendiente'` AND error-toast

### R10: Four Display States

| State | Display |
|-------|---------|
| Loading | 6 skeleton rows, pulse |
| Empty | Illustration + "No hay pedidos" + CTA |
| Error | Message + "Reintentar" |
| Populated | Full table |

- GIVEN `loading=true` WHEN renders THEN 6 skeleton rows
- GIVEN 0 orders, not loading THEN illustration + CTA

### R11: Mobile Responsive

Card layout < md. Bottom sheet for modals. Swipeable actions.

- GIVEN viewport < 768px WHEN renders THEN each order is a card (customer, status, total)
- GIVEN mobile WHEN CobrarModal opens THEN bottom sheet from below

### Data Structures

| Field | Source | Consumers |
|-------|--------|-----------|
| `status` | Root | All |
| `payment_status` | Root | Admin, cashier |
| `type`/`order_type` | Root | Admin filter |
| `notes[]` | Root array | NotesModal |
| `internalNote` | Root (deprecated) | Fallback |
| `financials.total` | Nested | Most views |
