# Layout Shell — Esqueleto Común

Todas las apps del ecosistema comparten esta estructura base.

## Estructura

```
┌──────────────────────────────────────────┐
│  NexusSidebar    │  Header               │
│  (64px ancho)    │  (app title + status) │
│                  ├────────────────────────┤
│  Iconos de       │                       │
│  navegación      │  Content Area          │
│  entre apps      │  (flex-1, overflow)   │
│                  │                       │
│  App activa      │  ┌─────────────────┐  │
│  resaltada       │  │  Route Outlet   │  │
│                  │  │                 │  │
│                  │  └─────────────────┘  │
│                  │                       │
│                  ├────────────────────────┤
│                  │  Footer (opcional)     │
└──────────────────────────────────────────┘
```

## NexusSidebar

Barra lateral izquierda de 64px. Navegación global entre apps del ecosistema.

### Desktop
- Ancho fijo: `64px`
- Background: `--cm-bg-alt`
- Icons: 24x24, `--cm-text-secondary` (default), `--cm-accent` (activo)
- Tooltip on hover con nombre de la app
- App activa: indicator bar de 3px a la izquierda

### Mobile (< 768px)
- NexusSidebar se oculta
- Bottom tab bar con 5 iconos principales
- Resto en hamburger menu desde header

## Header

### Desktop
- Altura: `56px`
- Padding: `0 --cm-space-md`
- Background: `--cm-surface`
- Border bottom: `1px solid --cm-border`
- Elementos: app title (left), status indicators (right)

### Mobile
- Misma altura 56px
- Hamburguer menu + app title
- Status indicators reducidos (solo el más importante)

## Content Area

- Padding: `--cm-space-md` (32px)
- `overflow-y: auto`
- `flex-1`
- Max-width: `1280px` centrado (opcional, según la vista)

## Responsive Breakpoints

| Breakpoint | Ancho | Comportamiento |
|------------|-------|----------------|
| Mobile | < 768px | Sin sidebar, bottom nav + hamburger |
| Tablet | 768-1024px | Sidebar colapsada (solo iconos), content padding reducido |
| Desktop | > 1024px | Sidebar completa, padding standard |

## Tokens aplicados

| Elemento | Token |
|----------|-------|
| Shell bg | `--cm-bg` |
| Sidebar bg | `--cm-bg-alt` |
| Header bg | `--cm-surface` |
| Header border | `--cm-border` |
| Content padding | `--cm-space-md` |

## Código de referencia

```tsx
// Layout base
<div className="flex h-screen bg-cm-bg">
  <NexusSidebar activeApp="..." />
  <div className="flex flex-col flex-1 min-w-0">
    <Header title="App Name" />
    <main className="flex-1 overflow-y-auto p-[--cm-space-md]">
      <Outlet />
    </main>
  </div>
</div>
```

## Checklist

- [ ] NexusSidebar de 64px, visible en desktop
- [ ] Header de 56px con border bottom
- [ ] Content area con padding generoso
- [ ] Mobile: sidebar oculta, bottom nav
- [ ] Max-width opcional: 1280px centrado
- [ ] Dark mode: mismos espacios, colores invertidos
