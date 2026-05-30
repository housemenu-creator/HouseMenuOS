## Apply Progress — Batch 2

**Change**: design-system-consolidation
**Work unit**: 2 — househub + house-menu migration
**Scope**: Phase 3 tasks 3.1–3.5
**Mode**: Standard (no tests, pure CSS refactor)
**Delivery**: auto-chain → stacked-to-main, PR 2 of 3

### Completed Tasks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Rename `hub-*` → `cm-*` in househub JSX/TSX | ✅ Complete | 10 tokens across 20 files, ~182 class rename sites. Exempted "hub-widget-order" (localStorage key) in Dashboard.tsx and "househub-logs" (filename) in ActivityFeed.tsx |
| 3.2 | Remove `hub-*` color aliases from househub tailwind.config.js | ✅ Complete | Removed 9 alias lines (hub-bg, -card, -border, -text, -muted, -accent, -success, -warning, -error) — only cm-* tokens remain |
| 3.3 | Build househub — 0 errors | ✅ Complete | `vite build` succeeded in 3.48s |
| 3.4 | Delete `culinary-*` color aliases from house-menu tailwind.config.js | ✅ Complete | Removed 5 alias lines (culinary-bg, -primary, -accent, -text, -muted) — only cm-* tokens remain |
| 3.5 | Build house-menu — 0 errors | ✅ Complete | `vite build` succeeded in 3.54s |

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/househub/tailwind.config.js` | Modified | Removed 9 `hub-*` color aliases |
| `apps/house-menu/tailwind.config.js` | Modified | Removed 5 `culinary-*` color aliases |
| `apps/househub/src/App.tsx` | Modified | `bg-hub-bg` → `bg-cm-bg`, `text-hub-text` → `text-cm-text` |
| `apps/househub/src/pages/Dashboard.tsx` | Modified | `text-hub-muted` → `text-cm-text-secondary` (3x). Exempted: `hub-widget-order` |
| `apps/househub/src/components/layout/SortableWidget.tsx` | Modified | `text-hub-muted` → `text-cm-text-secondary`, `hover:text-hub-accent` → `hover:text-cm-accent` |
| `apps/househub/src/components/activity/ActivityFeed.tsx` | Modified | 31 hub-* → cm-* renames. Exempted: `househub-logs` |
| `apps/househub/src/components/charts/AIDailyBrief.tsx` | Modified | 6 renames (accent, text, muted) |
| `apps/househub/src/components/layout/Sidebar.tsx` | Modified | 14 renames (border, card, accent, muted, text) |
| `apps/househub/src/components/layout/NanoBananaGenerator.tsx` | Modified | 7 renames (border, bg, muted) |
| `apps/househub/src/components/common/Skeleton.tsx` | Modified | 3 renames (border) |
| `apps/househub/src/components/common/ErrorBoundary.tsx` | Modified | 8 renames (bg, error, muted, accent) |
| `apps/househub/src/components/kitchen/CocinaMode.tsx` | Modified | 41 renames (largest file — bg, muted, border, warning, success, error, accent, card, text) |
| `apps/househub/src/components/charts/HouseBrief.tsx` | Modified | 11 renames (border, accent, muted, warning, success, error) |
| `apps/househub/src/components/agents/AgentCard.tsx` | Modified | 21 renames (border, success, error, muted, text) |
| `apps/househub/src/components/agents/ChatHistory.tsx` | Modified | 18 renames (card, border, muted, bg, accent) |
| `apps/househub/src/components/agents/StatusPanel.tsx` | Modified | 6 renames (card, border, muted, success, warning) |
| `apps/househub/src/components/alerts/ErrorAlerts.tsx` | Modified | 8 renames (card, border, warning, error, muted) |
| `apps/househub/src/components/charts/UsageChart.tsx` | Modified | 13 renames (card, border, muted, accent, success, error) |
| `apps/househub/src/components/explorer/MCPExplorer.tsx` | Modified | 19 renames (card, border, muted, bg, accent) |
| `apps/househub/src/components/kitchen/ComandaPrint.tsx` | Modified | 3 renames (accent) |
| `apps/househub/src/components/layout/Header.tsx` | Modified | 6 renames (border, success, muted, text) |
| `apps/househub/src/components/terminal/Terminal.tsx` | Modified | 11 renames (card, border, muted, bg, accent, text) |

### Deviations from Design

None — implementation matches design exactly.

### Issues Found

None. Both builds pass with 0 errors.

### Remaining Tasks

- [ ] Phase 4: Migrate 26play, house-cleaning, house-laundry + docs
- [ ] Phase 5: Verification sweep

### Workload / PR Boundary

- Mode: chained PR slice (auto-chain, second unit)
- Current work unit: househub + house-menu migration
- Boundary: PR 2 of 3 (stacked-to-main). Start: Phase 3 task 3.1. End: Phase 3 task 3.5 (both builds green).
- Estimated review budget impact: ~400–500 changed lines across 22 files
