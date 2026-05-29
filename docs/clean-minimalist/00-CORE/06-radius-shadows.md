# Radius & Shadows — Bordes y Sombras

## Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--cm-radius-sm` | `0.625rem` (10px) | Inputs, botones pequeños, badges |
| `--cm-radius-md` | `0.875rem` (14px) | Cards pequeñas, dropdowns, tooltips |
| `--cm-radius-lg` | `1.25rem` (20px) | Cards grandes, modales, sidebars |
| `--cm-radius-xl` | `1.75rem` (28px) | Containers principales, layout sections |
| `--cm-radius-2xl` | `2.5rem` (40px) | Hero sections, banners |
| `--cm-radius-full` | `9999px` | Badges, avatars, pills |

### Reglas de radius

- **Inputs y botones**: `--cm-radius-sm` (10px) — suficiente para suavizar sin ser pill
- **Cards de datos**: `--cm-radius-lg` (20px) — el estándar para cards
- **Modales**: `--cm-radius-lg` (20px) en desktop, `--cm-radius-xl` (28px) para sheets
- **Badges y tags**: `--cm-radius-full` — siempre pills
- **No combines radios diferentes** en el mismo componente

## Sombras

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--cm-shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | `0 1px 3px rgba(0,0,0,0.2)` | Cards en reposo, inputs |
| `--cm-shadow-md` | `0 4px 16px rgba(0,0,0,0.06)` | `0 4px 16px rgba(0,0,0,0.25)` | Cards hover, dropdowns, modales |
| `--cm-shadow-lg` | `0 8px 40px rgba(0,0,0,0.08)` | `0 8px 40px rgba(0,0,0,0.3)` | Modales grandes, sidebars flotantes |
| `--cm-shadow-xl` | `0 20px 80px rgba(0,0,0,0.12)` | `0 20px 80px rgba(0,0,0,0.4)` | Diálogos, sheets |

### Reglas de sombras

- **Cards en reposo**: solo `--cm-shadow-sm` (sutil, casi imperceptible)
- **Cards en hover**: `--cm-shadow-md` (la card se eleva)
- **Dropdowns y popovers**: `--cm-shadow-md`
- **Modales**: `--cm-shadow-lg` o `--cm-shadow-xl`
- **Sin sombras en**: botones, inputs, badges, texto
- **Las sombras en dark mode** son más pronunciadas (fondo oscuro necesita más contraste)

## Checklist

- [ ] Cards usan `rounded-xl` (radius-lg)
- [ ] Inputs usan `rounded-[--cm-radius-sm]`
- [ ] Badges usan `rounded-full`
- [ ] Sombras solo en elementos elevados (cards, modales, dropdowns)
- [ ] Botones sin sombra (solo hover: subtle transform)
- [ ] Dark mode: sombras más pronunciadas
