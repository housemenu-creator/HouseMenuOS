# Catalog Browser Specification

## Purpose

Cashier staff MUST browse and search the branch product catalog in real time, grouped by category, to select items for order creation. The catalog reflects live availability from Firebase RTDB via `menuService.subscribeToCatalog`.

## Requirements

### Requirement: Subscribe to Real-time Catalog

The system SHALL subscribe via `menuService.subscribeToCatalog(branchId, callback)` and surface the result as reactive state. The subscription SHALL begin when a valid `branchId` is available and SHALL auto-cleanup on unmount.

#### Scenario: Catalog loads on valid branch

- GIVEN a cashier session with an active `branchId`
- WHEN the catalog browser mounts
- THEN `menuService.subscribeToCatalog` is called with that `branchId`
- AND the callback returns `{ products: {}, modifiers: {}, variations: {} }`
- AND products are grouped by category for display

#### Scenario: Catalog error surface

- GIVEN `subscribeToCatalog` triggers the error path
- WHEN the hook receives an error
- THEN error state is set
- AND a user-facing error message is rendered

### Requirement: Categorized Product Grid

The system MUST render products grouped by their `category` field. Each group SHALL be displayed as a distinct section with the category name as a header. Only products with `available: true` SHALL appear in the grid.

#### Scenario: Products grouped by category

- GIVEN the catalog contains products across 3 categories
- WHEN the browser renders
- THEN each category appears as a named section
- AND each product card shows name, price (`base_price`), and availability indicator

#### Scenario: Unavailable products hidden

- GIVEN a product with `available: false`
- WHEN the catalog renders
- THEN that product is NOT shown in the grid

### Requirement: Search with Keyboard Filtering

The system MUST provide a text input that filters products by name in real time. When a search query is active, the category grouping SHALL be preserved but sections with zero matching products SHALL be hidden.

#### Scenario: Search filters visible products

- GIVEN the catalog has products "Café Latte", "Café Americano", and "Tea"
- WHEN the user types "café"
- THEN only products matching "café" (case-insensitive) are shown
- AND the "Tea" category section is hidden

#### Scenario: No results state

- GIVEN the catalog has products
- WHEN the user types a query matching zero products
- THEN a clear "Sin resultados" empty state is displayed
- AND the user knows no products match

### Requirement: Product Selection

Each product card MUST be clickable. Clicking a product SHALL call an `onSelect(product)` callback provided by the parent component, passing the full product object.

#### Scenario: Product selected

- GIVEN a visible product card
- WHEN the user taps/clicks it
- THEN `onSelect(product)` is called with the product data
- AND a brief visual feedback (scale/opacity) confirms the selection

### Requirement: Four Display States

The component MUST handle these states: **loading**, **empty**, **error**, **populated**.

#### Scenario: Loading spinner

- GIVEN the subscription has not delivered data yet
- WHEN the component renders
- THEN a centered spinner is displayed

#### Scenario: Empty catalog

- GIVEN the catalog subscription returns `{ products: {}, modifiers: {}, variations: {} }`
- WHEN the component renders
- THEN a "Catálogo vacío" message is shown

#### Scenario: Error state with retry

- GIVEN the catalog subscription fails
- WHEN the error state renders
- THEN an error message with retry action is displayed


