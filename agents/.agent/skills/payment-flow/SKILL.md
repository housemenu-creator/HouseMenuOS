---
name: payment-flow
description: Document and implement the complete Yape/Plin payment verification flow
version: 1.0.0
---

# Payment Flow

## Purpose
Standardize the entire payment lifecycle from user submission to ticket generation.

## Payment States
```
USER SUBMITS → pendiente → [ADMIN REVIEWS] → aprobado/rechazado
                                                   ↓
                                            TICKET CREATED
```

## When to Use
- Debugging payment issues
- Adding new payment methods
- Training new team members

## Complete Flow

### Step 1: User Initiates Purchase
- **Location**: `SorteoDetail.tsx`
- **Action**: User clicks "Comprar Ticket"
- **Modal**: Shows Yape/Plin number + upload form

### Step 2: User Submits Voucher
- **Upload**: Image goes to Firebase Storage `/vouchers/{userId}/{timestamp}_{filename}`
- **Document**: Created in `payments` collection with:
  - `status: 'pendiente'`
  - `voucherUrl`: Storage download URL
  - `operationNumber`: User-provided
  - `amount`: Raffle price

### Step 3: Admin Reviews
- **Location**: `Admin.tsx` → Verification Section
- **Options**:
  1. **AI Verify** → Calls `verifyVoucher.ts`
  2. **Manual Approve** → Updates status + creates ticket
  3. **Reject** → Updates status only

### Step 4: Ticket Generation (on Approve)
- **Transaction**: Uses `runTransaction` for concurrency safety
- **Actions**:
  1. Check raffle has available tickets
  2. Increment `soldTickets`
  3. Update payment `status: 'aprobado'`
  4. Create ticket document with random number
  5. Send notification

## Rules
- **MUST**: Use transactions for approval (prevent overselling)
- **MUST**: Validate voucher URL exists before approval
- **MUST NOT**: Allow duplicate operation numbers
- **SHOULD**: Notify user via webhook after approval

## Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| Ticket not created | Transaction failed | Check Firestore rules |
| Voucher upload fails | CORS/Storage rules | Check storage.rules |
| Payment stuck pending | Admin not notified | Add admin alerts |
