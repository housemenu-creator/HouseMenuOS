# Single Page Service — App Simple con Tabs

## Cuándo usarlo
Apps con funcionalidad acotada: house-cleaning (turnos/checklist/stock), house-laundry (tickets/registro/insumos).

## Layout

```
┌──────────────────────────────────────────┐
│  ┌────────────────────────────────────┐  │
│  │  Stats Bar (opcional)              │  │
│  │  Eficiencia 92%  |  Tickets 12    │  │
│  └────────────────────────────────────┘  │
│  ─────────────────────────────────────── │
│  ┌──────┬──────────┬──────────────────┐  │
│  │ Tab1 │   Tab2   │      Tab3       │  │
│  │ 👕   │ 📋       │     📦          │  │
│  └──────┴──────────┴──────────────────┘  │
│  ─────────────────────────────────────── │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  Content del tab activo              ││
│  │                                      ││
│  │  (lista, formulario, grid, etc.)     ││
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Stats bar | Horizontal, icono + número + label, `text-sm text-cm-text-secondary` |
| Tabs | Borde inferior animado, icono + label, gap equitativo |
| Tab active | Underline animado (300ms), `text-cm-accent font-medium` |
| Tab inactive | `text-cm-text-secondary hover:text-cm-text` |
| Content | Padding estándar, transición suave al cambiar de tab |

## Reglas

- **Stats bar solo si hay métricas relevantes** — no es obligatorio
- **Tabs con icono + texto** — mínimo 2, máximo 5
- **Transición de tab**: fade (100ms) — no slide, no stagger
- **Estado del tab persiste en URL hash** opcionalmente

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 640px | Tabs scroll horizontal si sobran, iconos sin texto |
| 640-1024px | Tabs full width con icono + texto |
| > 1024px | Tabs con más padding, contenido más espaciado |

## Checklist

- [ ] Stats bar (opcional, solo si hay métricas)
- [ ] Tabs con underline animado
- [ ] Icono + texto en cada tab
- [ ] Transición fade al cambiar tab
- [ ] Mobile: tabs scroll horizontal
- [ ] Estado del tab en URL (opcional)
