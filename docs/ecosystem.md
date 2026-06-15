# 🏗️ House-Portal-OS Ecosystem

```
┌─────────────────────────────────────────────────────┐
│                    househub                          │
│  Administración · Monitoreo · Analytics · IA        │
│  React + Vite · localhost:5177                      │
│  ─────────────────────────────────────────────────  │
│  Dashboard │ Logs │ Chats │ MCP Tools │ Cocina │ TTY│
└──────────────────┬──────────────────────────────────┘
                   │
                   │ (enlace en sidebar)
                   ▼
┌─────────────────────────────────────────────────────┐
│                   house-menu                         │
│  Menú Digital · Staff · Admin                       │
│  React + Vite · localhost:5173                      │
│  ─────────────────────────────────────────────────  │
│  Carta │ Cocina KDS │ Despacho │ Mozo │ Delivery    │
│  Vendedor │ Admin Hub │ Rastreo                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ (API + WebSocket)
                   ▼
┌─────────────────────────────────────────────────────┐
│                  housepysbot (Chaly)                 │
│  Bot multichannel · WhatsApp + Telegram + HTTP      │
│  Node.js + TS · localhost:3000                      │
│  ─────────────────────────────────────────────────  │
│  /health │ /kds │ /menu │ /api/webhooks/:provider   │
│  /api/mcp/:tool │ /api/agent                        │
└─────────────────────────────────────────────────────┘
```

## Apps secundarias

| App | Stack | Puerto | Propósito |
|-----|-------|--------|-----------|
| **26play** | Vite + React | auto | Juegos / rifas |
| **sorteos-automaticos** | Vite + React | auto | Sorteos automáticos |
| **house-cleaning** | Vite + React | auto | Landing limpieza |
| **house-laundry** | Vite + React | auto | Landing lavandería |
| **portal-hub** | Vite + React | auto | Portal general |
| **worker-portal** | Vite + React | auto | Portal trabajador |
| **piramid-game** | Vite + React | auto | Juego pirámide |

## Comandos rápidos

```bash
npm run nav              # Listar apps y su estado
npm run status           # Resumen del ecosistema
npm run dev              # Iniciar core (hub + menu + worker)
npm run dev:all          # Iniciar TODAS las apps

npm run typecheck:all    # TypeScript check en todas las apps
npm run test:all         # Tests (housepysbot + house-menu)

npm run dev:hub          # Solo househub (port 5177)
npm run dev:menu         # Solo house-menu (port 5173)
npm run dev:chaly        # Solo housepysbot (port 3000)
```

## Stack compartido

- **Frontend**: React 19 + Vite + Tailwind (design tokens via `packages/tokens/variables.css`)
- **Backend**: Firebase Realtime Database (sin servidor propio)
- **Bot**: Baileys (WhatsApp) + Telegraf (Telegram) + OpenRouter (LLM)
- **Estado**: Zustand
- **Routing**: React Router DOM v6
- **UX**: Framer Motion + Lucide React

## Convenciones

- `apps/` — aplicaciones (cada una independiente)
- `packages/` — librerías compartidas
- `scripts/` — herramientas CLI
- `types/` — déclaraciones TypeScript globales
- `design-system/` — tokens y assets visuales
