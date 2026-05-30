# Tasks: Design System Consolidation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400–500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (worker-portal) → PR 2 (househub + house-menu) → PR 3 (remaining apps + docs) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migrate worker-portal (highest risk) | PR 1 → main | ~30 JSX files, inline purple→orange, CSS cleanup |
| 2 | Migrate househub + house-menu | PR 2 → main | hub-* → cm-* in JSX, delete culinary-* from config |
| 3 | Migrate 26play, house-cleaning, house-laundry + docs | PR 3 → main | Minor class renames, update techStack.md + productContext.md |

## Phase 1: Audit & Baseline

- [ ] 1.1 `rg "worker:" "hub:" "culinary:" "rgba\(124,58,237\)"` across all apps → save baseline counts
- [ ] 1.2 Audit `apps/sorteos-automaticos/tailwind.config.js` — confirm no legacy aliases

## Phase 2: worker-portal Migration

- [x] 2.1 Replace all `rgba(124,58,237,*)` inline hexes in `apps/worker-portal/src/**/*.{jsx,tsx}` with `--cm-accent` / `--cm-accent-light` / `--cm-accent-surface`
- [x] 2.2 Rename all `worker-*` Tailwind classes → `cm-*` in 30+ JSX/TSX files
- [x] 2.3 Remove `worker-*` color aliases, `glow` shadow, `pixel` font from `apps/worker-portal/tailwind.config.js`
- [x] 2.4 Remove `.worker-card`, `.badge-*`, `.stat-card` from `apps/worker-portal/src/index.css` (replace with inline Tailwind `cm-*`)
- [x] 2.5 Build worker-portal — `npm run build --workspace=apps/worker-portal` — 0 errors

## Phase 3: househub + house-menu Migration

- [x] 3.1 Rename all `hub-*` → `cm-*` in `apps/househub/src/**/*.{tsx,jsx}`
- [x] 3.2 Remove `hub-*` color aliases from `apps/househub/tailwind.config.js`
- [x] 3.3 Build househub — 0 errors
- [x] 3.4 Delete `culinary-*` color aliases from `apps/house-menu/tailwind.config.js`
- [x] 3.5 Build house-menu — 0 errors

## Phase 4: Remaining Apps + Docs

- [x] 4.1 Migrate any legacy classes in `apps/26play/src/**/*.{jsx,tsx}` → `cm-*` — already clean, 0 legacy matches
- [x] 4.2 Migrate any legacy classes in `apps/house-cleaning/src/**/*.{jsx,tsx}` → `cm-*` — already clean, 0 legacy matches
- [x] 4.3 Migrate any legacy classes in `apps/house-laundry/src/**/*.{jsx,tsx}` → `cm-*` — already clean, 0 legacy matches
- [x] 4.4 Update `docs/techStack.md` — single design system: Clean Minimalist
- [x] 4.5 Update `docs/productContext.md` — remove glassmorphism/Worker Purple references

## Phase 5: Verification Sweep

- [x] 5.1 Build all affected apps — 0 errors
- [x] 5.2 `rg` legacy tokens — 0 real matches (only exempted localStorage keys/filenames)
- [x] 5.3 Legacy tokens in config — all removed
- [x] 5.4 Visual: worker-portal purple→orange is intentional per design
