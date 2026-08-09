# Design: Admin CRM Overhaul

## Technical Approach

Replace the flat `CustomersTab` with a **CrmView shell** containing 5 sub-tabs (list, profile, segments, analytics, communication). Data flows through 3 new hooks that wrap `subscribeCustomers` + `findCustomerAndOrders`. Pagination (50pp) and segment filtering run client-side over the in-memory customer array from RTDB. Existing `CustomerAnalyticsTab` and `WhatsAppSender` are imported directly — no rewrite, just adaptation.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `customers` tab vs new `crm` key | Rename requires updating sidebar, nav groups, roleRegistry, tabDefs | **Keep `customers` key** — zero config changes, swap component only |
| Server-side vs client-side pagination | Server = less data over wire but needs RTDB query indexes; Client = simple, works with `onValue` subscription | **Client-side** — 50pp slice over subscribed array, RTDB lacks pagination API |
| Segments as RTDB query vs composable filters | RTDB query needs new indexes; composable filters re-use existing `subscribeCustomers` | **Composable filters** — apply sequentially over customers array |
| New analytics module vs wrap existing | Rewrite = duplicate logic; Wrap = reuse proven charts | **Wrap CustomerAnalyticsTab** inside CrmAnalytics, pass through |
| Mobile table vs card-switch | Separate views = maintenance; conditional render = one component | **Conditional** — `<table>` on `md:`, card grid below |

## Data Flow

```
AdminView ──→ AdminTabRenderer ──→ CrmView (activeBranchId, allOrders)
                                         │
                            ┌────────────┼────────────┬────────────┬────────────┐
                            ▼            ▼            ▼            ▼            ▼
                     CustomerList  CustomerProfile  Segments   CrmAnalytics  CrmComm
                            │            │            │            │            │
                     useCustomerList useCustomerProfile useSegments  │       WhatsAppSender
                            │            │            │            │            │
                     └──────┴──── RTDB /customers ────┘     CustomerAnalyticsTab
```

**Subscription model**: `useCustomerList` calls `subscribeCustomers` once. The customer array is shared via React context or prop-drilled to sibling hooks. `useCustomerSegments` receives the same array as input.

## Component Tree & Props

```
CrmView
  props: { activeBranchId: string, allOrders: Order[] }
  state: activeSubTab ('list' | 'profile' | 'segments' | 'analytics' | 'comm')
  children:
    ├── CustomerTable
    │     props: { customers, pagination, filters, sort, onSort, onPage, onSelectCustomer }
    │     children: CustomerTableRow (x pageSize)
    ├── CustomerProfile
    │     props: { customerId, allOrders, onBack }
    │     children: CustomerProfileOrders, CustomerTimeline
    ├── SegmentBuilder
    │     props: { customers, onSegmentChange }
    │     children: SegmentPreview
    ├── CrmAnalytics
    │     props: {} — delegates to CustomerAnalyticsTab (self-subscribes)
    └── CrmCommunication
          props: { targetCustomers, allOrders }
          wraps WhatsAppSender — maps targetCustomers to WhatsAppSender's GROUPS
```

## Hook APIs

### `useCustomerList`
```
Input: (void) — subscribes to /customers via subscribeCustomers
Output: {
  customers: Customer[],          // full subscribed array
  pagination: { page, pageSize:50, totalPages, pageItems: Customer[] },
  filters: { search, tier, minSpent, maxSpent, dateRange },
  sort: { field: keyof Customer, dir: 'asc'|'desc' },
  setPage, setFilters, setSort
}
Algo: filter(customers, filters) → sort(, field, dir) → slice(page*50, (page+1)*50)
States: loading → skeleton; !customers.length → empty; error → retry button
```

### `useCustomerProfile`
```
Input: { customerId: string, allOrders: Order[] }
Output: {
  customer: Customer | null,
  orders: CrossBranchOrder[],
  loading, error
}
Algo: find customer from subscribed list, call findCustomerAndOrders(email) for cross-branch history
```

### `useCustomerSegments`
```
Input: customers: Customer[]
Output: {
  filter: SegmentFilter,
  filteredCount: number,
  filteredCustomers: Customer[],
  setFilter: (f: Partial<SegmentFilter>) => void,
  applyBulkAction: (action: BulkAction) => Promise<void>
}
Algo: filter(tiers) → filter(minSpent) → filter(maxSpent) → filter(minOrders) → filter(recencyDays)
BulkAction: { type: 'addPoints'|'export'|'whatsapp', payload?: any }
```

### `SegmentFilter`
```typescript
interface SegmentFilter {
  tiers?: ('bronze'|'silver'|'gold'|'platinum')[];
  minSpent?: number;
  maxSpent?: number;
  minOrders?: number;
  recencyDays?: number;  // lastOrderAt within N days
}
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/admin/components/crm/CrmView.jsx` | Create | Shell with 5 sub-tabs + navigation |
| `src/admin/components/crm/CustomerTable.jsx` | Create | Paginated table (50pp), multi-col sort, tier/gasto/fecha/search filters, export CSV, mobile card fallback |
| `src/admin/components/crm/CustomerTableRow.jsx` | Create | Expandible row: inline orders preview + quick actions |
| `src/admin/components/crm/CustomerProfile.jsx` | Create | Detailed view with edit, points adjustment, tier badge |
| `src/admin/components/crm/CustomerProfileOrders.jsx` | Create | Cross-branch order history list |
| `src/admin/components/crm/CustomerTimeline.jsx` | Create | Timeline: tier upgrades, point milestones, created/lastOrder |
| `src/admin/components/crm/SegmentBuilder.jsx` | Create | Dynamic filter builder with tier/recencia/frecuencia/gasto controls |
| `src/admin/components/crm/SegmentPreview.jsx` | Create | Live count + customer list preview |
| `src/admin/components/crm/CrmAnalytics.jsx` | Create | Wraps CustomerAnalyticsTab (pass-through) |
| `src/admin/components/crm/CrmCommunication.jsx` | Create | Wraps WhatsAppSender with segment-based target group |
| `src/admin/hooks/useCustomerList.ts` | Create | Pagination, sorting, filtering logic |
| `src/admin/hooks/useCustomerProfile.ts` | Create | Profile + cross-branch order aggregation |
| `src/admin/hooks/useCustomerSegments.ts` | Create | Segment filter composable + bulk actions |
| `src/lib/customerService.js` | Modify | Add `addPointsBatch(customerIds, points)`, `getCustomersBySegment(filter)` |
| `src/admin/components/AdminTabRenderer.tsx` | Modify | Replace lazy-import of CustomersTab with CrmView, pass `activeBranchId` + `allOrders` |
| `src/admin/tabs/CustomersTab.jsx` | Delete | Replaced by CrmView (or kept as deprecated alias) |

## Integration Points

- **AdminTabRenderer** line 101: `case 'customers': return <CrmView activeBranchId={d.activeBranchId} allOrders={d.allOrders} />;`
- **tabDefs.ts**: no key change — `'customers'` stays, sidebar/roles unmodified
- **CrmAnalytics**: `<CrmAnalytics />` renders `<CustomerAnalyticsTab />` (existing component handles its own data subscription)
- **CrmCommunication**: receives `filteredCustomers` from SegmentBuilder, maps to WhatsAppSender's `targetGroup` prop

## State Handling

Each component covers 4 states:

| State | Visual |
|-------|--------|
| **Loading** | `<Skeleton />` with row/card shapes |
| **Empty** | Icon + message + CTA (e.g. "Sin clientes aún") |
| **Error** | Error icon + message + "Reintentar" button |
| **Populated** | Normal render with AnimatePresence |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `useCustomerList` paginate/sort/filter | Pure function tests with mock customer array |
| Unit | `useCustomerSegments` filter composable | Test each filter dimension independently |
| Unit | `customerService.addPointsBatch` | Firebase RTDB runTransaction mock |
| Integration | CrmView sub-tab switching | Vitest + testing-library render with mock data |
| E2E | Full CRM flow | Manual/Playwright — skip for now (no e2e infra) |

## Migration

No migration required. Existing `CustomersTab.jsx` is swapped out at the renderer level. `customer-analytics` top-level tab remains unchanged for backward access.

## Open Questions

- [ ] `customer-analytics` top-level tab: keep as standalone shortcut alongside CrmAnalytics sub-tab?
- [ ] CustomerProfile editing: inline form vs modal?
- [ ] Bulk WhatsApp sending: real WhatsApp API or queue for manual review?
