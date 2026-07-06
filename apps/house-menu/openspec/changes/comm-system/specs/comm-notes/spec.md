# comm-notes Specification

## Purpose
Internal order notes that attach to orders and persist through KDS→cooking→expo flow.

## Requirements

### Requirement: Note Creation
Kitchen/bar staff MAY add a note to any order. The note MUST be stored as part of the order document in RTDB.

#### Scenario: Add note to order
- GIVEN kitchen staff views an order
- WHEN they tap add note and enter "client allergic, no onion"
- THEN note saves to order with { orderId, text, createdAt, createdBy }
- AND note persists on order through all subsequent views

### Requirement: Note Display
Order notes MUST display as a small badge/icon on KDS tickets. The badge SHALL be expandable to show note preview.

#### Scenario: View note on ticket
- GIVEN KDS ticket has attached note
- WHEN staff views the ticket
- THEN small 📝 badge appears
- AND tapping expands to show full note text

### Requirement: Note Visibility
Notes MUST be visible on all KDS screens: MonitorView, KitchenView, DispatchView.

#### Scenario: Note propagates to dispatch
- GIVEN note was added to order in kitchen
- WHEN order reaches dispatch view
- THEN note badge still visible
- AND note text unchanged

## RTDB Schema
```
/orderNotes/{orderId}
  - text, createdAt, createdBy, updatedAt
```

Note: Stored as part of order document in RTDB under `/orders/{orderId}/note`.