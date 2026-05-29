---
name: sorteo-creator
description: Create new raffles with consistent validation and structure
version: 1.0.0
---

# Sorteo Creator

## Purpose
Standardize the creation of new raffles (sorteos) in Solayni, ensuring all required fields, validations, and UI components are properly configured.

## When to Use
- Creating a new raffle type
- Adding a raffle to Firestore
- Generating raffle UI components

## Instructions

### Phase 1: Validate Requirements
1. Confirm raffle has: `title`, `description`, `price`, `totalTickets`, `drawDate`, `image`
2. Verify price format: `S/ XX.XX`
3. Ensure `totalTickets` is a positive integer
4. Validate `drawDate` is in the future

### Phase 2: Create in Firestore
1. Use `addDoc` to create in `raffles` collection
2. Set `status: 'Activo'`, `soldTickets: 0`
3. Add `createdAt: serverTimestamp()`
4. Include default `features` and `rules` arrays

### Phase 3: Verify
1. Query the new document to confirm creation
2. Check it appears in the Home page grid

## Rules
- **MUST**: Include all 6 required fields
- **MUST**: Set initial `soldTickets` to 0
- **MUST NOT**: Allow `drawDate` in the past
- **SHOULD**: Use high-quality images (min 800x600)

## Firestore Document Schema
```typescript
interface Raffle {
  id: string;           // Auto-generated
  title: string;        // Required
  description: string;  // Required
  price: string;        // Format: "S/ XX.XX"
  totalTickets: number; // Positive integer
  soldTickets: number;  // Starts at 0
  drawDate: string;     // Future date
  image: string;        // URL
  status: 'Activo' | 'Finalizado';
  features: string[];   // Product features
  rules: string[];      // Raffle rules
  createdAt: Timestamp;
  winnerTicketId?: string;    // Set when finished
  winnerUserId?: string;
  winnerTicketNumber?: number;
}
```

## Verification
- [ ] Raffle appears in Admin panel
- [ ] Raffle appears on Home page
- [ ] RaffleCard displays correctly
- [ ] "Comprar Ticket" button works
