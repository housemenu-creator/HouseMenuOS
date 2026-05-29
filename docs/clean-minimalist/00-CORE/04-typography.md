# Typography — Escala y Reglas

## Font Family

```css
--cm-font: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--cm-font-mono: 'SF Mono', ui-monospace, monospace;
```

**Inter** es la tipografía única del sistema. Sin excepciones. No se usan fuentes display, serif, ni decorativas.

## Escala Tipográfica

| Token | Valor | Uso |
|-------|-------|-----|
| `--cm-font-size-xs` | `0.7rem` (~12px) | Metadata, timestamps, badges |
| `--cm-font-size-sm` | `0.85rem` (~14px) | Labels, secondary text, input hints |
| `--cm-font-size-base` | **`1rem` (17px)** | **Body text, párrafos, list items** |
| `--cm-font-size-lg` | `1.15rem` (~19px) | Subtítulos, card titles |
| `--cm-font-size-xl` | `1.4rem` (~23px) | Section headings |
| `--cm-font-size-2xl` | `2.25rem` (~36px) | Page titles, hero headings |
| `--cm-font-size-3xl` | `clamp(3rem, 8vw, 5.5rem)` | Hero principal, números grandes |

## Pesos

| Peso | Uso |
|------|-----|
| **400 (Regular)** | Body text, párrafos |
| **500 (Medium)** | Botones, labels, enfasis suave |
| **600 (Semibold)** | Títulos de card, subtítulos de sección |
| **700 (Bold)** | Page titles, hero headings, dataviz números |

## Reglas de jerarquía

### Correcto ✅
```
Page Title (2xl, 700)
├── Section Title (xl, 600)
│   ├── Card Title (lg, 600)
│   └── Card Body (base, 400)
│       └── Card Metadata (xs, 400)
└── Section Footer (sm, 500)
```

### Incorrecto ❌
- Usar `font-bold` en body text
- Usar el mismo tamaño para título y contenido
- Poner metadata en `font-base` compitiendo con el body
- Usar mayúsculas sostenidas para títulos largos

## Line Height

| Tamaño | Line Height |
|--------|-------------|
| xs-sm | `1.4` |
| base | `1.5` |
| lg-xl | `1.3` |
| 2xl-3xl | `1.1` |

## Checklist

- [ ] Inter cargado en `index.html` via Google Fonts
- [ ] Body font-size = 17px (no 16px)
- [ ] Sin fuentes display, serif, ni decorativas en ninguna app
- [ ] Jerarquía correcta: títulos > subtítulos > body > metadata
- [ ] Line-height adecuado por tamaño
- [ ] Dark mode con los mismos tamaños y pesos
