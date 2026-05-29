# Design Tokens — Referencia Completa

Fuente de verdad técnica: `packages/tokens/variables.css`

## Categorías

| Categoría | Prefijo | Cantidad |
|-----------|---------|----------|
| Backgrounds | `--cm-bg` | 2 |
| Surfaces | `--cm-surface` | 2 |
| Texto | `--cm-text` | 3 |
| Acento | `--cm-accent` | 4 |
| Bordes | `--cm-border` | 2 |
| Semánticos | `--cm-success/warning/error/info` | 8 |
| Glass | `--cm-glass-*` | 4 |
| Espaciado | `--cm-space-*` | 6 |
| Radios | `--cm-radius-*` | 6 |
| Sombras | `--cm-shadow-*` | 4 |
| Tipografía | `--cm-font-*` | 7 |
| Transiciones | `--cm-transition-*` | 3 |

## Tabla completa

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--cm-bg` | `#F5F5F7` | `#000000` | Fondo principal de la app |
| `--cm-bg-alt` | `#EEEEF0` | `#111113` | Fondo secundario (sidebars, headers) |
| `--cm-surface` | `#FFFFFF` | `#1C1C1E` | Fondo de cards, modales, inputs |
| `--cm-surface-hover` | `#F8F8FA` | `#262628` | Hover de surface |
| `--cm-text` | `#1D1D1F` | `#F5F5F7` | Texto principal |
| `--cm-text-secondary` | `#86868B` | `#98989D` | Texto secundario (labels, metadata) |
| `--cm-text-tertiary` | `#B0B0B5` | `#636366` | Texto terciario (placeholders, disabled) |
| `--cm-accent` | `#C2410C` | `#E06B30` | Acción primaria, links, highlight |
| `--cm-accent-hover` | `#9A330A` | `#F07940` | Hover de accent |
| `--cm-accent-light` | `rgba(194,65,12,0.1)` | `rgba(224,107,48,0.15)` | Fondo sutil de accent |
| `--cm-accent-surface` | `rgba(194,65,12,0.06)` | `rgba(224,107,48,0.08)` | Surface con tinte accent |
| `--cm-border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | Bordes de cards, inputs, dividers |
| `--cm-border-hover` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.15)` | Hover de border |
| `--cm-success` | `#059669` | `#059669` | Éxito, completado |
| `--cm-warning` | `#D97706` | `#D97706` | Advertencia |
| `--cm-error` | `#DC2626` | `#DC2626` | Error, peligro |
| `--cm-info` | `#2563EB` | `#2563EB` | Información |
| `--cm-space-xs` | `0.5rem` | — | Espaciado mínimo |
| `--cm-space-sm` | `1rem` | — | Espaciado entre elementos relacionados |
| `--cm-space-md` | `2rem` | — | Espaciado entre secciones |
| `--cm-space-lg` | `4rem` | — | Espaciado entre bloques grandes |
| `--cm-radius-sm` | `0.625rem` | — | Inputs, badges |
| `--cm-radius-md` | `0.875rem` | — | Cards pequeñas |
| `--cm-radius-lg` | `1.25rem` | — | Cards grandes, modales |
| `--cm-shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | `0 1px 3px rgba(0,0,0,0.2)` | Cards en reposo |
| `--cm-shadow-md` | `0 4px 16px rgba(0,0,0,0.06)` | `0 4px 16px rgba(0,0,0,0.25)` | Cards hover, dropdowns |
| `--cm-font` | Inter, system-ui, sans-serif | — | Body text |
| `--cm-font-size-base` | `17px` | — | Tamaño base del body |

## Reglas de uso

1. **Usa siempre el token, nunca el valor hardcodeado**
2. **No sobreescribas tokens en las apps** — los tokens viven solo en `@house/tokens`
3. **Usa `color-mix()` para variantes** en lugar de definir nuevos tokens
4. **Tailwind classes correspondientes**: `bg-cm-surface`, `text-cm-accent`, `border-cm-border`, etc.
