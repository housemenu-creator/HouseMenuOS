# List / DataTable — Listados con Búsqueda y Acciones

## Cuándo usarlo
Lista de items con filtros, búsqueda, y acciones por fila.

## Layout

```
┌──────────────────────────────────────────┐
│  Page Title                    [+ Nuevo] │
│  ─────────────────────────────────────── │
│  Search──── ▼ Filter ▼ Status ────── ▷  │
│  ─────────────────────────────────────── │
│  ┌─────┬────────┬────────┬──────┬──────┐│
│  │ #   │ Name   │ Status │ Date │  ⚡  ││
│  ├─────┼────────┼────────┼──────┼──────┤│
│  │ 1   │ Item A │ ✅     │ hoy  │ ⋮    ││
│  │ 2   │ Item B │ ⏳     │ ayer │ ⋮    ││
│  │ 3   │ Item C │ ❌     │ lun  │ ⋮    ││
│  └─────┴────────┴────────┴──────┴──────┘│
│  ─────────────────────────────────────── │
│  Mostrando 3 de 24       ← 1 2 3 ... →  │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Page title | `text-xl font-semibold text-cm-text` |
| Search input | Icono lupa a la izquierda, placeholder, debounce 300ms |
| Filters | Dropdowns estilo pill, badge con count activo |
| Tabla | Header sticky, filas con hover, border entre filas |
| Status badge | Pill con color semántico + texto |
| Actions menu | Click → dropdown con editar/eliminar/duplicar |
| Pagination | Números + prev/next, "Mostrando X de Y" |

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 768px | Tabla → cards stack vertical, search + filters en accordion |
| 768-1024px | Tabla con scroll horizontal, filters colapsables |
| > 1024px | Tabla completa, filters en barra |

## Estados

| Estado | Qué mostrar |
|--------|-------------|
| Loading | 5 filas skeleton con shimmer |
| Empty | Ilustración + "No se encontraron resultados" + limpiar filtros |
| Error | Alert + retry |
| Populated | Tabla con datos |

## Checklist

- [ ] Search con debounce 300ms
- [ ] Filtros con badge de count activo
- [ ] Tabla: sticky header, hover row, sort indicators
- [ ] Mobile: cards en lugar de tabla
- [ ] Paginación o infinite scroll
- [ ] Actions menu: ⋮ → dropdown
