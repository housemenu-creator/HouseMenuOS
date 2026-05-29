# Game Phase — Pantallas de Juego Estado-driven

## Cuándo usarlo
Apps con flujo de fases como 26play (Lobby → Safety Quiz → Playing → Summary).

## Layout base (por fase)

```
┌──────────────────────────────────────────┐
│                                          │
│           ┌────────────────────┐          │
│           │     Title          │          │
│           │     (fase actual)  │          │
│           │                    │          │
│           │   ┌──────────┐    │          │
│           │   │ Card/     │    │          │
│           │   │ Content  │    │          │
│           │   │ Principal│    │          │
│           │   └──────────┘    │          │
│           │                    │          │
│           │   [Action]        │          │
│           └────────────────────┘          │
│                                          │
│         ← Progress: 1/5 →               │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Phase card | Centrada, max-width 480px, `bg-cm-surface rounded-xl shadow-cm-md p-6` |
| Phase title | `text-center text-xl font-semibold` |
| Content | Centrado, con animación fade+slide entre fases |
| Action button | CTA principal, centrado debajo del contenido |
| Progress | Dots o barra delgada en la parte inferior |

## Reglas

- **Toda la pantalla es una fase** — no hay navegación externa visible
- **Transición entre fases**: fade out → fade in (300ms)
- **La card cambia de contenido**, no cambia la URL
- **Back**: solo si la fase lo permite (nunca forzar)
- **Progreso visible**: dots indicadores + texto "X de Y"

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 768px | Card full-width con padding reducido |
| > 768px | Card centrada con max-width 480px |

## Checklist

- [ ] Fase actual clara (title + content)
- [ ] Transición suave entre fases
- [ ] Progreso visible
- [ ] Acción principal clara por fase
- [ ] Mobile: full-width card
- [ ] Sin scroll innecesario (cada fase cabe en pantalla)
