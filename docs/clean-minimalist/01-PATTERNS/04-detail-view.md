# Detail View — Detalle de un Item

## Cuándo usarlo
Ver información detallada de una orden, ticket, sorteo, perfil de usuario.

## Layout

```
┌──────────────────────────────────────────┐
│  ← Volver           Status    [Acciones] │
│  ─────────────────────────────────────── │
│  ┌──────────────────┐ ┌─────────────────┐│
│  │ Item Title       │ │ Sidebar Info    ││
│  │ ID: #1234        │ │ Creado: date    ││
│  │                  │ │ Actualizado:    ││
│  │ Descripción o    │ │ Asignado a:     ││
│  │ contenido        │ │ ─────────────── ││
│  │ principal del    │ │ Timeline        ││
│  │ item             │ │ • paso 1 ✅     ││
│  │                  │ │ • paso 2 ✅     ││
│  │                  │ │ • paso 3 ⏳     ││
│  └──────────────────┘ └─────────────────┘│
│  ─────────────────────────────────────── │
│  Sección adicional (historial, notas...) │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Back button | Icono flecha + texto, `text-cm-text-secondary` |
| Title | `text-xl font-semibold text-cm-text` |
| Metadata | `text-sm text-cm-text-secondary`, gap 16px |
| Main content | Flex-1, padding generoso |
| Sidebar | 320px max, sticky en desktop |
| Timeline | Iconos de estado + texto + fecha, línea conectora |
| Status badge | Pill semántico |

## Responsive

| Viewport | Layout |
|----------|--------|
| < 768px | Stack vertical: contenido arriba, sidebar abajo |
| 768-1024px | Stack vertical, timeline horizontal compacto |
| > 1024px | 2 columnas: 1fr main + 320px sidebar |

## Checklist

- [ ] Back button siempre visible
- [ ] Title + metadata clara
- [ ] Sidebar con timeline de estado
- [ ] Acciones principales visibles sin scroll
- [ ] Mobile: todo en una columna
