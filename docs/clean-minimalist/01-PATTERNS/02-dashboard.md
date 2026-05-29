# Dashboard — Layout de KPIs y Actividad

## Cuándo usarlo
Vista principal que muestra métricas, actividad reciente, y acceso rápido a acciones.

## Layout

```
┌──────────────────────────────────────────┐
│  Page Title                    [Acción]   │
│  ─────────────────────────────────────── │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │    │
│  │ #123 │ │ #456 │ │ #789 │ │ #012 │    │
│  └──────┘ └──────┘ └──────┘ └──────┘    │
│  ─────────────────────────────────────── │
│  ┌─────────────────┐ ┌──────────────────┐│
│  │ Chart / Gráfico │ │ Activity Feed    ││
│  │                 │ │ • item 1         ││
│  │                 │ │ • item 2         ││
│  │                 │ │ • item 3         ││
│  └─────────────────┘ └──────────────────┘│
│  ─────────────────────────────────────── │
│  ┌──────────────────────────────────────┐│
│  │ Lista reciente / Tabla compacta     ││
│  │ ┌─────┬──────┬──────┬──────┬──────┐ ││
│  │ │ ID  │ Item │ Status │ Date │ Act │ ││
│  │ ├─────┼──────┼──────┼──────┼──────┤ ││
│  │ │ ... │ ...  │ ...  │ ...  │ ...  │ ││
│  │ └─────┴──────┴──────┴──────┴──────┘ ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Componente CM | Clases |
|----------|--------------|--------|
| KPI card | `Card` + número grande | `bg-cm-surface border border-cm-border rounded-xl p-4` |
| Chart container | `Card` sin hover | `bg-cm-surface rounded-xl p-4` |
| Activity item | List item simple | `flex items-center gap-3 py-2` |
| Data table | Tabla estándar | `w-full text-sm` |

## Responsive

| Viewport | Columnas |
|----------|----------|
| < 768px | 2 KPI columns, chart full width, table scroll horizontal |
| 768-1024px | 2x2 KPI grid, chart + feed side by side |
| > 1024px | 4 KPI row, chart + feed 2fr/1fr, table full |

## Estados

| Estado | Qué mostrar |
|--------|-------------|
| Loading | Skeleton cards (gris pulsante) para KPIs y chart |
| Empty | Ilustración simple + "No hay datos todavía" + CTA |
| Error | Card con icono de error + mensaje + botón "Reintentar" |
| Populated | Datos reales con última actualización timestamp |

## Checklist

- [ ] KPIs: número grande + label + icon opcional
- [ ] Charts: responsive, con tooltip, sin leyenda redundante
- [ ] Activity feed: scroll infinito o "ver todos" link
- [ ] Tabla: sticky header, sort por columnas, fila clickeable
- [ ] Estados: loading, empty, error, populated
- [ ] Dark mode verificado
