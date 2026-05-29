# Card Grid — Grid de Tarjetas

## Cuándo usarlo
Menú de productos, lista de sorteos, galería de servicios, selector de items.

## Layout

```
┌──────────────────────────────────────────┐
│  Title                         Filtros ▷  │
│  ─────────────────────────────────────── │
│  ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ Card │ │ Card │ │ Card │             │
│  │ 🖼️   │ │ 🖼️   │ │ 🖼️   │             │
│  │ Nombr│ │ Nombr│ │ Nombr│             │
│  │ $12  │ │ $15  │ │ $10  │             │
│  │ [Cta]│ │ [Cta]│ │ [Cta]│             │
│  └──────┘ └──────┘ └──────┘             │
│  ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ Card │ │ Card │ │ Card │             │
│  │ ...  │ │ ...  │ │ ...  │             │
│  └──────┘ └──────┘ └──────┘             │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Card container | `bg-cm-surface rounded-xl shadow-cm-sm overflow-hidden` |
| Card image | 16:9 aspect ratio, object-cover |
| Card title | `text-base font-semibold text-cm-text` |
| Card price | `text-lg font-bold text-cm-accent` |
| Card action | Botón "Agregar" o "Ver más", full-width en mobile |
| Grid gap | `--cm-space-md` (32px) |

## Responsive

| Viewport | Columnas |
|----------|----------|
| < 640px | 2 columns |
| 640-1024px | 3 columns |
| > 1024px | 4 columns (o 3 si las cards son anchas) |

## Estados

| Estado | Qué mostrar |
|--------|-------------|
| Loading | Skeleton grid con 6 cards placeholder |
| Empty | "No hay items disponibles" + ilustración |
| Error | Alert + retry |
| Populated | Grid con cards |

## Checklist

- [ ] Grid responsive (2→3→4 columns)
- [ ] Card con imagen 16:9
- [ ] Card interactiva: hover scale + shadow
- [ ] Precios o metadata clara
- [ ] CTA por card
- [ ] Skeleton loading state
