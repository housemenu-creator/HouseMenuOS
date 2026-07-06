# Order Builder Specification

## Purpose

The order builder manages local cart state — items, quantities, customer name, table assignment, and notes — before the order is persisted. It is a client-side hook (`useOrderBuilder`) that produces a complete order payload for `useOrdersPipeline.createOrder()`.

## Requirements

### Requirement: Cart Item Management

The system MUST maintain an array of cart items, each containing `productId`, `name`, `quantity`, `price` (unit price from product), and optional `notes`. Items SHALL be added, removed, and quantity-adjusted.

#### Scenario: Add item to cart

- GIVEN an empty cart
- WHEN a product is selected from the catalog
- THEN a new cart entry is created with quantity 1
- AND the unit price is set from `product.base_price`

#### Scenario: Increment quantity of existing item

- GIVEN a cart containing 1 "Café Latte"
- WHEN the same product is selected again
- THEN quantity increments to 2
- AND no duplicate entry is created

#### Scenario: Remove item from cart

- GIVEN a cart with 3 items
- WHEN the user removes one item
- THEN that item is removed from the cart array
- AND remaining items and total update accordingly

#### Scenario: Update item quantity directly

- GIVEN a cart item with quantity 1
- WHEN the user sets quantity to 0
- THEN the item is removed from cart (quantity zero = remove)
- WHEN quantity is set to 5
- THEN the cart updates and total recalculates

### Requirement: Customer Metadata

The system MUST track `customerName`, `mesa` (table number), and free-text `notes`. These fields SHALL be optional and editable before order creation.

#### Scenario: Set customer name and table

- GIVEN an empty cart with no metadata
- WHEN the user enters "Juan Pérez" as name and "5" as table
- THEN `customerName` is "Juan Pérez"
- AND `mesa` is "5"

#### Scenario: Order-level notes

- GIVEN a cart with items
- WHEN the user types "Sin hielo" in order notes
- THEN the notes array contains `{ text: "Sin hielo", createdBy: "cashier", createdByName: "...", createdAt: "..." }`

### Requirement: Total Calculation

The system MUST compute `total` as the sum of all item `price * quantity`. The total SHALL be a derived value, recalculated on every cart mutation.

#### Scenario: Total reflects cart changes

- GIVEN items A (S/10 x 2) and B (S/15 x 1)
- WHEN the cart is evaluated
- THEN total = 35
- WHEN item B is removed
- THEN total = 20

### Requirement: Payload Assembly

The system MUST expose a `buildPayload()` function that returns an object compatible with `ordersService.createOrder()`. The payload SHALL contain `customerName`, `mesa`, `items[]`, `total`, `notes[]`, and `source: "cashier"`.

#### Scenario: Build complete payload

- GIVEN cart has items and metadata
- WHEN `buildPayload()` is called
- THEN the returned object matches the `Order` schema
- AND `items[].price` equals `unitPrice * quantity` for each item

### Requirement: Cart Validation

The system MUST prevent submission when the cart has zero items and SHALL warn when `customerName` is empty.

#### Scenario: Empty cart blocked

- GIVEN a cart with zero items
- WHEN `buildPayload()` is called
- THEN it returns `{ valid: false, reason: "Cart is empty" }`

#### Scenario: Missing customer name warning

- GIVEN a cart with items but no customer name
- WHEN `buildPayload()` is called
- THEN it returns a payload with `valid: true` AND `warnings: ["customer name missing"]`
- (Mesa and notes are optional; no warning for empty table)

### Requirement: Cart Reset

The system MUST provide a `reset()` function that clears all items, metadata, and notes back to initial state.

#### Scenario: Reset cart after submission

- GIVEN a non-empty cart with metadata
- WHEN `reset()` is called
- THEN items array is empty, customerName is empty, mesa is empty, notes is empty
- AND total is 0


