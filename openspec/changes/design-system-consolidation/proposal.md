# Proposal: Design System Consolidation

## Intent

Three design systems coexist across 10 apps: Clean Minimalist (`--cm-*`/`cm-*`), Neo-Brutalist Ayni (sorteos-automaticos), and Worker Purple (`--worker-*`/`worker-*`). This causes visual inconsistency, duplicated effort, token drift, and violates AGENTS.md which mandates Clean Minimalist for all new views. Consolidate every app to Clean Minimalist tokens and classes only.

## Scope

### In Scope
- Rewrite worker-portal CSS/Tailwind from `--worker-*`/`worker-*` to `--cm-*`/`cm-*`
- Rewrite sorteos-automaticos from Neo-Brutalist Ayni to Clean Minimalist
- Rewrite househub from mixed `hub-*` + `cm-*` to pure `cm-*`
- Rewrite house-menu legacy `culinary-*` classes to `cm-*`
- Audit and extend `@house/tokens` package for any missing CM tokens
- Update stale docs (techStack.md, productContext.md) to reflect current design system
- Delete or archive unused design system artifacts (Neo-Brutalist, Worker Purple references)

### Out of Scope
- No new features, pages, or components
- No spec-level behavior changes (pure refactor)
- No redesign of existing layout or UX — visual appearance should remain identical
- No migration of third-party dependencies

## Capabilities

> This is a pure refactor — no spec-level behavior changes. No capabilities are added or modified.

### New Capabilities
None

### Modified Capabilities
None

## Approach

1. **Audit phase**: Catalog every non-CM token/class usage across all apps using grep/rg
2. **Tokens phase**: Extend `@house/tokens` with any missing CM tokens needed by migrated apps
3. **Migration per app** (independent, can parallelize):
   - App A: worker-portal — `worker-*` → `cm-*`
   - App B: sorteos-automaticos — Neo-Brutalist → CM
   - App C: househub — `hub-*` → `cm-*`
   - App D: house-menu — `culinary-*` → `cm-*`
4. **Docs phase**: Update docs/techStack.md, docs/productContext.md
5. **Cleanup phase**: Archive stale design references and tokens
6. Remove usage of old tokens/classes
7. Build each app and verify visual parity

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/worker-portal` | Modified | All `worker-*` → `cm-*` tokens/classes |
| `apps/sorteos-automaticos` | Modified | Neo-Brutalist Ayni → Clean Minimalist |
| `apps/househub` | Modified | `hub-*` classes → `cm-*` |
| `apps/house-menu` | Modified | `culinary-*` legacy classes → `cm-*` |
| `apps/house-cleaning` | Modified | Partial CM coverage → full CM |
| `apps/house-laundry` | Modified | Partial CM coverage → full CM |
| `apps/26play` | Modified | Partial CM coverage → full CM |
| `packages/@house/tokens` | Modified | Extend token set if gaps found |
| `docs/techStack.md` | Modified | Reflect current design system |
| `docs/productContext.md` | Modified | Remove glassmorphism references |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missed legacy class in migration | Med | Audit with rg before/after, visual diff per app |
| Token gaps in `@house/tokens` | Low | Extend tokens package during audit phase |
| Visual regression from token mapping | Med | Build each app after migration; manual visual review |

## Rollback Plan

Per-app git commits. If an app breaks, revert its single commit. Full rollback = revert the entire branch. No data migration — pure CSS/Tailwind changes only.

## Dependencies

- `@house/tokens` must be updated before app migrations if gaps exist
- Existing CM templates in `docs/clean-minimalist/templates/` as reference

## Success Criteria

- [ ] 0 occurrences of `--worker-`, `worker:`, `--hub-`, `hub:`, `--culinary-`, `culinary:`, or Neo-Brutalist tokens across all apps
- [ ] All 10 apps build without error
- [ ] visual parity confirmed: all 8 affected apps look the same as before migration
- [ ] `docs/techStack.md` and `docs/productContext.md` reflect Clean Minimalist as the sole design system
