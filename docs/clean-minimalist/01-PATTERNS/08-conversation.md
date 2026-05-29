# Conversation — Chat, Logs, Mensajería

## Cuándo usarlo
Chat history con AI agents, activity logs, conversaciones, terminal.

## Layout

```
┌──────────────────────────────────────────┐
│  Title                        [Acciones]  │
│  ─────────────────────────────────────── │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ User message           10:30 AM    │  │
│  │ ── 3 ── AI response ───────────── │  │
│  │ Agent reply            10:30 AM    │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ User: ¿qué hay de almuerzo?        │  │
│  │ ── 2 ──                            │  │
│  │ Agent: Hoy tenemos...              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ─────────────────────────────────────── │
│  ┌────────────────────────────────────┐  │
│  │ Escribe un mensaje...    [Enviar]  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Componentes

| Elemento | Especificación |
|----------|---------------|
| Message bubble | User: align right, `bg-cm-accent`, text white. Agent: align left, `bg-cm-surface` |
| Timestamp | `text-xs text-cm-text-tertiary`, dentro o debajo del bubble |
| Input bar | Fixed bottom, input + send button |
| Typing indicator | 3 dots animados, solo cuando el agente está respondiendo |

## Reglas

- **Scroll automático** al último mensaje
- **Burbujas distinguibles**: usuario a la derecha, agente a la izquierda
- **Timestamps relativos**: "hace 2 min" en mensajes recientes, fecha completa en antiguos
- **Input no crece** — máximo 4 líneas con scroll interno
- **Enter envía**, Shift+Enter nueva línea

## Responsive

| Viewport | Comportamiento |
|----------|---------------|
| < 768px | Chat full-screen, input bar fijo abajo |
| > 768px | Chat en card dentro de layout, sidebar de conversaciones |

## Checklist

- [ ] Chat scroll automático
- [ ] Burbujas: user right, agent left
- [ ] Timestamps relativos
- [ ] Input: Enter envía, Shift+Enter nueva línea
- [ ] Typing indicator
- [ ] Mobile: full screen
