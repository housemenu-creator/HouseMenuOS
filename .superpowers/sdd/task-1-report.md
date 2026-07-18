# Task 1 Report: Extender Supplier CRUD

## Changes

### logisticsService.js
- Extended `createSupplier` to include: `contacto`, `telefono`, `email`, `direccion`, `tipoDocumento`, `numDocumento`, `plazoPago`, `categorias`, `activo`

### LogisticsTab.jsx - SuppliersSection
- Updated form state to include all new fields
- Updated `resetForm` to match
- Added `editingSupplier()` helper for populating edit form
- Replaced form grid: now includes Dirección, Tipo Documento (select condicional), Plazo Pago, Nro Documento (condicional)
- Updated supplier cards to show tipo doc badge, plazo pago, categorías, inactive badge

## Build
- `npx vite build` — **success** (9.44s, no errors)
- LogisticsTab chunk: 105.89 kB (gzip: 22.26 kB)

## Concerns
- Existing suppliers won't have new fields until edited/saved — `subscribeSuppliers` returns whatever exists in FB, so new fields will be `undefined` (handled with `|| ''` fallbacks)
