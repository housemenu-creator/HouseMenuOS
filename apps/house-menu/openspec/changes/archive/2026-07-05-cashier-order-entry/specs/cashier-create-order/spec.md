# Cashier Create Order Specification

## Purpose

Wire the order builder payload into `useOrdersPipeline.createOrder()` with the active cashier session, display confirmation, and optionally open `QuickPayModal` for immediate payment.

## Requirements

### Requirement: Create Order from Cart

When the cashier confirms the order, the system MUST call `useOrdersPipeline.createOrder(orderPayload)` with the cart payload from `order-builder`. The `orderPayload` SHALL include `sessionId` from the active cash session and `source: "cashier"`.

#### Scenario: Confirm creates order successfully

- GIVEN a cart with items and an active cash session
- WHEN the cashier taps "Confirmar"
- THEN `createOrder(branchId, payload, userEmail)` is called
- AND the order appears in the RTDB
- AND a success toast says "Pedido #XYZ creado"
- AND the cart is reset

#### Scenario: Create order fails

- GIVEN a valid cart and active session
- WHEN `createOrder()` throws or returns error
- THEN an error toast is displayed with the error message
- AND the cart state is preserved for retry
- AND the modal stays open

#### Scenario: No active session blocks order

- GIVEN no active cash session (session is null/closed)
- WHEN the cashier taps "Confirmar"
- THEN `createOrder()` is NOT called
- AND a warning says "No hay sesión activa"
- AND the "Nuevo Pedido" button is disabled

### Requirement: Immediate Payment Option

After order creation, the system SHOULD offer an optional "Cobrar ahora" checkbox. When checked, the system SHALL open `QuickPayModal` with the newly created order. On payment success, the order list SHALL refresh.

#### Scenario: Pay now after creation

- GIVEN an order is created successfully
- WHEN "Cobrar ahora" was checked
- THEN `QuickPayModal` opens with the created order
- AND the cashier can process payment immediately

#### Scenario: Skip payment, create only

- GIVEN an order is created successfully
- WHEN "Cobrar ahora" was NOT checked
- THEN the modal closes
- AND the new order appears in the pending orders list with `payment_status: "pendiente"`

### Requirement: Confirmar Button States

The "Confirmar" button MUST support four states: **enabled**, **loading**, **disabled** (empty cart), and **error**.

#### Scenario: Button disabled with empty cart

- GIVEN an empty cart
- WHEN the modal renders
- THEN the "Confirmar" button is visually disabled

#### Scenario: Loading during creation

- GIVEN the cashier tapped "Confirmar" with a valid cart
- WHEN the request is in flight
- THEN the button shows a spinner and "Creando..."
- AND all inputs are disabled to prevent double-submission

### Requirement: Order Created Confirmation

After successful creation, the system MUST show a brief confirmation (inline or toast) and reset the `order-builder` state so the cashier can start a new order immediately.

#### Scenario: Cart resets after creation

- GIVEN an order was created successfully
- WHEN the creation response returns
- THEN `useOrderBuilder.reset()` is called
- AND the cart UI shows empty/initial state

### Requirement: Nuevo Pedido Button

A "Nuevo Pedido" button SHALL appear in `CashierUI.tsx`. It SHALL be disabled when no active session exists.

#### Scenario: Button opens NewOrderModal

- GIVEN an active cash session
- WHEN the cashier taps "Nuevo Pedido"
- THEN `modal.open('newOrder')` is called
- AND `NewOrderModal` renders with catalog browser + order builder

#### Scenario: Button disabled without session

- GIVEN no open cash session (`session.status === 'closed'`)
- WHEN the cashier sees the UI
- THEN the "Nuevo Pedido" button is visually disabled
- AND a tooltip "Abrí caja primero" appears on hover


