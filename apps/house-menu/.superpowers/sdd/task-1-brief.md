# Task 1: menuService.createProductWithData

**Context:** Part of AI Smart Create feature. This method is needed so the AI hook can save a full product to the catalog in one call, instead of creating defaults and updating field by field.

**File to modify:**
- `src/lib/menuService.js`

**Method to add (after `createProduct` around line 83, before `createCategory`):**

```javascript
async createProductWithData(branchId, productData) {
  const productsRef = ref(db, catalogProductsPath(branchId));
  const newProductRef = push(productsRef);
  const product = {
    name: productData.name || 'Nuevo Plato',
    category: productData.category || 'General',
    base_price: productData.base_price ?? 0,
    price: productData.price ?? null,
    available: productData.available ?? false,
    description: productData.description || '',
    image: productData.image || '',
    tags: productData.tags || [],
    spicy: productData.spicy ?? false,
    vegan: productData.vegan ?? false,
    glutenFree: productData.glutenFree ?? false,
    isWizard: false,
    steps: [],
    channels: { carta: true, kiosko: true, landing: false, delivery: true },
    sortOrder: productData.sortOrder ?? 0,
    status: 'published',
    schedule: { enabled: false, start: '12:00', end: '22:00' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(newProductRef, product);
  return newProductRef.key;
},
```

**Also add to the export object** in the same file (the `export const menuService = { ... }` block), alongside `createProduct`.

**Requirements:**
1. Read the existing file first to understand the patterns and imports
2. Add the method at the right spot (after `createProduct`, before `createCategory`)
3. Export it inside the `menuService` object
4. Do NOT modify any existing method
5. Run the existing tests to make sure nothing broke
6. Commit with message: `feat: add createProductWithData method for AI Smart Create`

**Existing imports at top of file (for reference):**
```javascript
import { ref, onValue, set, push, remove, get, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { normalizeFirebaseData } from './normalizeFirebaseData';
import { catalogPath, catalogProductsPath, catalogFieldPath, catalogCategoryPath } from './paths';
```

**Report file:** `.superpowers/sdd/task-1-report.md`
After implementing, write a report with:
- Status (DONE / DONE_WITH_CONCERNS / BLOCKED)
- Commits made
- Test results (command run + output)
- Any concerns
