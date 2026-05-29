# Form / Wizard — Formularios Multi-paso

## Cuándo usarlo
Checkout, registro, configuración multi-paso, creación de items complejos.

## Layout (paso individual)

```
┌──────────────────────────────────────────┐
│  ← Volver               Paso 2 de 4      │
│  ─────────────────────────────────────── │
│  ● ● ○ ○                                  │
│  Progress: 50%                            │
│  ─────────────────────────────────────── │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │  Título del paso                     ││
│  │  Descripción opcional                ││
│  │                                      ││
│  │  Label                              ││
│  │  ┌────────────────────────────────┐ ││
│  │  │ Input                          │ ││
│  │  └────────────────────────────────┘ ││
│  │                                      ││
│  │  [ Cancelar ]          [ Siguiente ] ││
│  └──────────────────────────────────────┘│
│                                          │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Progress bar | Barra delgada (4px), `bg-cm-accent` en completado |
| Step indicator | Círculos numerados o dots conectados |
| Step title | `text-lg font-semibold` |
| Input | Altura 44px, radius-sm, border sutil, focus ring accent |
| Button primary | BG accent, text white, radius-sm, hover: scale(1.02) |
| Button secondary | Ghost, text-secondary, border al hacer hover |

## Reglas

- **Un paso a la vez** — no mostrar todos los pasos visibles
- **Validación en cada paso** — no dejar avanzar si hay errores
- **Progreso visible** — barra + "Paso X de Y"
- **Back permitido** — los datos persisten al volver
- **Último paso**: botón cambia a "Confirmar" con icono de check

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 768px | Full width, sin sidebar, botones full width |
| > 768px | Card centrada (max 640px), botones alineados a la derecha |

## Estados

| Estado | Comportamiento |
|--------|---------------|
| Loading | Botón deshabilitado + spinner |
| Error inline | Texto rojo debajo del campo |
| Error step | Banner en top del paso + campo marcado |
| Success | Pantalla de confirmación con check animado |

## Checklist

- [ ] Progress bar visible durante todo el wizard
- [ ] Validación por paso
- [ ] Back: datos persisten
- [ ] Botón primary + secondary por paso
- [ ] Confirmación final con resumen
- [ ] Mobile: full-width inputs y botones
