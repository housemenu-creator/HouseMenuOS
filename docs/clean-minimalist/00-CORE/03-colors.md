# Colors — Paleta y Roles

La paleta CM tiene 3 categorías de color: neutros, acento, semánticos.

## Neutros

| Rol | Token | Light | Dark | Ejemplo de uso |
|-----|-------|-------|------|----------------|
| Fondo app | `--cm-bg` | `#F5F5F7` | `#000000` | body background |
| Fondo alt | `--cm-bg-alt` | `#EEEEF0` | `#111113` | sidebar, header |
| Surface | `--cm-surface` | `#FFFFFF` | `#1C1C1E` | cards, inputs, modales |
| Texto | `--cm-text` | `#1D1D1F` | `#F5F5F7` | headings, body |
| Texto secondary | `--cm-text-secondary` | `#86868B` | `#98989D` | labels, metadata |
| Texto tertiary | `--cm-text-tertiary` | `#B0B0B5` | `#636366` | placeholders |
| Border | `--cm-border` | rgba(0,0,0,0.06) | rgba(255,255,255,0.08) | cards, dividers |

## Acento

| Rol | Token | Light | Dark | Uso |
|-----|-------|-------|------|-----|
| Acento principal | `--cm-accent` | `#C2410C` | `#E06B30` | Botones primarios, links, tabs activas, highlight |
| Hover | `--cm-accent-hover` | `#9A330A` | `#F07940` | Hover de botón primario |
| Fondo sutil | `--cm-accent-light` | rgba(194,65,12,0.1) | rgba(224,107,48,0.15) | Badge de accent, alertas sutiles |
| Tinte surface | `--cm-accent-surface` | rgba(194,65,12,0.06) | rgba(224,107,48,0.08) | Cards con tinte accent |

### Reglas del acento

- **Solo un acento por vista.** No combines el naranja con otro color llamativo.
- **El acento es funcional:** indica interactividad, no decora.
- **En listas y tablas**, el acento solo en la fila activa o seleccionada.
- **No uses acento para texto largo** — solo para títulos importantes o links.

## Semánticos

| Rol | Token | Light | Dark | Uso |
|-----|-------|-------|------|-----|
| Success | `--cm-success` | `#059669` | `#059669` | Completado, online, check |
| Warning | `--cm-warning` | `#D97706` | `#D97706` | Pendiente, atención |
| Error | `--cm-error` | `#DC2626` | `#DC2626` | Fallo, peligro, offline |
| Info | `--cm-info` | `#2563EB` | `#2563EB` | Informativo, nuevo |

### Reglas semánticas

- **Usa el color con fondo sutil** para badges: `var(--cm-success)` + `var(--cm-success-soft)` como bg
- **Los semánticos son iguales en light y dark** (no cambian de temperatura)
- **No uses semánticos como decoración** — solo para estados funcionales

## Cómo aplicar en Tailwind

```js
// tailwind.config.js
colors: {
  "cm-bg": "var(--cm-bg)",
  "cm-surface": "var(--cm-surface)",
  "cm-text": "var(--cm-text)",
  "cm-text-secondary": "var(--cm-text-secondary)",
  "cm-accent": "var(--cm-accent)",
  "cm-border": "var(--cm-border)",
  "cm-success": "var(--cm-success)",
  "cm-warning": "var(--cm-warning)",
  "cm-error": "var(--cm-error)",
}
```

Uso en componentes:
```tsx
<div className="bg-cm-surface border border-cm-border rounded-xl p-4">
  <h2 className="text-cm-text font-semibold">Título</h2>
  <p className="text-cm-text-secondary text-sm">Metadata</p>
  <span className="text-cm-accent font-medium">Acción</span>
</div>
```

## Checklist de verificación

- [ ] No hay colores hardcodeados en JSX (excepto en charts/data viz)
- [ ] El acento solo aparece una vez por vista funcionalmente
- [ ] Los semánticos se usan SOLO para estados
- [ ] Dark mode verificado: cada color tiene su par oscuro
- [ ] El texto sobre surface tiene contraste suficiente (WCAG AA)
