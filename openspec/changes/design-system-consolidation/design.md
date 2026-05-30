# Design: Design System Consolidation

## Technical Approach

Pure CSS/Tailwind refactor removing all legacy token aliases (`worker-*`, `hub-*`, `culinary-*`, inline purple) in favor of `--cm-*`/`cm-*` only. No visual changes — every legacy alias already maps 1:1 to a CM token in Tailwind configs. The exception is worker-portal's inline `rgba(124,58,237)` (Worker Purple) which must be replaced with CM `--cm-accent` equivalents, shifting from purple to orange accent.

## Token Mapping

All legacy Tailwind color aliases already wire to CM vars via each app's `tailwind.config.js`. The migration is a 1:1 rename in JSX:

| Legacy class | → CM equivalent | Semantics |
|---|---|---|
| `worker-bg`, `hub-bg`, `culinary-bg` | `cm-bg` | Page background |
| `worker-card`, `hub-card`, `culinary-surface` | `cm-surface` | Card/surface |
| `worker-text`, `hub-text`, `culinary-text` | `cm-text` | Primary text |
| `worker-muted`, `hub-muted`, `culinary-muted` | `cm-text-secondary` | Secondary text |
| `worker-primary`, `hub-accent`, `culinary-primary` | `cm-accent` | Accent (was purple for worker, now orange) |
| `worker-accent`, `hub-accent-hover`, `culinary-accent` | `cm-accent-hover` | Accent hover |
| `hub-border`, `worker-border` | `cm-border` | Borders |
| `hub-success`, `worker-online` | `cm-success` | Success states |
| `hub-warning` | `cm-warning` | Warning states |
| `hub-error` | `cm-error` | Error states |
| `.badge-online`, `.badge-pending` | Inline Tailwind classes using `cm-*` | Status badges |
| `.worker-card` (CSS class) | `.cm-surface` or inline Tailwind | Card component |
| `.stat-card` | Inline Tailwind `cm-*` | KPI stat card |

## Architecture Decisions

### Decision: Inline hex → CM tokens for worker-portal

**Choice**: Replace ALL inline `rgba(124,58,237,*)` (Worker Purple) with CM accent tokens (`--cm-accent`, `--cm-accent-light`, `--cm-accent-surface`).  
**Alternatives**: Add a `--cm-accent-purple` token to @house/tokens.  
**Rationale**: Adding a purple variant defeats the purpose of consolidation. The visual appearance WILL shift from purple to orange in worker-portal — this is intentional per AGENTS.md mandating Clean Minimalist. If purple is needed later, it should be a `--cm-accent-purple` in tokens, not Worker Purple.

### Decision: Remove legacy Tailwind aliases, not just JSX usage

**Choice**: Delete `worker-*`, `hub-*`, `culinary-*` color entries from each app's `tailwind.config.js`.  
**Alternatives**: Keep aliases as backward-compat and only fix JSX.  
**Rationale**: Aliases silently perpetuate the legacy system. Removing them ensures grep catches regressions: `text-hub-muted` will cause a build error, not a silent pass.

### Decision: Per-app CSS overrides stay in-app

**Choice**: Keep app-specific utility classes (`.segmented`, `.toggle-cm`, `.worker-card`) in each app's `index.css`.  
**Alternatives**: Migrate all shared utilities to `@house/tokens`.  
**Rationale**: These are app-specific component styles. They already use `--cm-*` vars. Moving them to tokens would create unnecessary coupling and violate separation of concerns.

## Data Flow

```
@house/tokens (--cm-* vars + .cm-* utilities)
    ├─→ worker-portal: inline Tailwind cm-* + app index.css
    ├─→ sorteos-automaticos: inline Tailwind cm-* + app index.css
    ├─→ househub: inline Tailwind cm-* + app index.css (+ glass plugin)
    ├─→ house-menu: inline Tailwind cm-* + app index.css
    ├─→ 26play: inline Tailwind cm-* + app index.css
    └─→ house-cleaning, house-laundry: already CM-clean
```

No data flow changes — this is purely a build-time class rename.

## Migration Order

1. **Audit**: `rg` across all apps for `worker:`, `hub:`, `culinary:`, `rgba(124,58,237)` — establish baseline
2. **worker-portal** (highest risk): Replace inline purple hexes → CM accent tokens, rename all `worker-*` → `cm-*` in JSX, delete worker aliases from tailwind.config.js, delete `.worker-card`/`.badge-*` legacy CSS classes
3. **sorteos-automaticos** (lowest risk): Already CM-clean. Remove boilerplate App.css. Verify no legacy classes.
4. **househub** (medium): Replace all `hub-*` → `cm-*` in JSX via sed/grep, delete hub aliases from tailwind.config.js, keep `glass` plugin as-is (it already uses cm-*)
5. **house-menu** (lowest risk): Delete `culinary-*` aliases from tailwind.config.js (no JSX usage found)
6. **Docs**: Update `techStack.md` and `productContext.md` to reflect single design system
7. **Build & verify**: Each app builds, visual parity confirmed

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/worker-portal/src/**/*.{jsx,tsx}` | Modify | Replace `worker-*` classes + inline purple hexes with `cm-*` |
| `apps/worker-portal/tailwind.config.js` | Modify | Remove `worker-*` color aliases, `glow` shadow, `pixel` font |
| `apps/worker-portal/src/index.css` | Modify | Remove `.worker-card`, `.badge-*`, `.stat-card` (replace with inline Tailwind) |
| `apps/househub/src/**/*.{tsx,jsx}` | Modify | Replace `hub-*` classes with `cm-*` |
| `apps/househub/tailwind.config.js` | Modify | Remove `hub-*` color aliases |
| `apps/house-menu/tailwind.config.js` | Modify | Remove `culinary-*` color aliases |
| `apps/sorteos-automaticos/tailwind.config.js` | Verify | No legacy aliases present |
| `docs/techStack.md` | Modify | Single design system: Clean Minimalist |
| `docs/productContext.md` | Modify | Remove glassmorphism/Worker Purple references |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Build | Each app compiles | `npm run build` per app — 0 errors |
| Lint | No legacy class references | `rg` for `worker:`, `hub:`, `culinary:`, `rgba(124,58,237)` — 0 matches |
| Visual | App looks correct | Manual review per app. worker-portal will shift purple→orange — confirm intent |
| Token isolation | No `--worker-*` leaks | `rg` for `--worker-` in built CSS output |

## Open Questions

None. All decisions are scoped and informed by codebase audit.
