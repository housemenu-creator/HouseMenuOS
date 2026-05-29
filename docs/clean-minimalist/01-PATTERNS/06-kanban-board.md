# Kanban Board — Columnas con Tarjetas

## Cuándo usarlo
Pipeline visual de estados: cocina KDS (recibido → preparando → listo), dispatch (listos → programados → en_camino → entregados).

## Layout

```
┌─────────────────────────────────────────────┐
│  Kanban Title                     [+ Nuevo]  │
│  ─────────────────────────────────────────── │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │TO DO │  │DOING │  │ DONE │  │ARCH. │    │
│  │  3   │  │  2   │  │  5   │  │  12  │    │
│  ├──────┤  ├──────┤  ├──────┤  ├──────┤    │
│  │Card 1│  │Card A│  │Card X│  │Card α│    │
│  │ID:12 │  │ID:08 │  │ID:03 │  │ID:01 │    │
│  │tag.. │  │tag.. │  │tag.. │  │tag.. │    │
│  ├──────┤  ├──────┤  │      │  │      │    │
│  │Card 2│  │Card B│  │      │  │      │    │
│  │      │  │      │  │      │  │      │    │
│  └──────┘  └──────┘  └──────┘  └──────┘    │
└─────────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Column | Min-width 280px, max-height 100%, scroll vertical |
| Column header | Título + count badge, border-bottom sutil |
| Card | `bg-cm-surface rounded-xl p-3 shadow-cm-sm` |
| Card title | `text-sm font-medium` |
| Card meta | `text-xs text-cm-text-secondary` |
| Drag handle | 6 dots icon, visible on hover |

## Reglas

- **Scroll independiente por columna** (no toda la página)
- **Drag & drop** entre columnas con animación suave
- **Count badge** en header de columna actualizado en tiempo real
- **Cards**: max 3 líneas de info, el detalle va en modal al hacer click

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 768px | Una columna a la vez con tabs para cambiar de estado |
| 768-1024px | 2 columnas side by side |
| > 1024px | Todas las columnas visibles con scroll horizontal |

## Checklist

- [ ] Scroll independiente por columna
- [ ] Count badge en column header
- [ ] Drag & drop funcional
- [ ] Modal con detalle al click en card
- [ ] Mobile: una columna + tabs
- [ ] Actualización en tiempo real (Firebase)
