# Arquitectura del Proyecto: House-Portal-OS

## Stack Tecnológico
- **Frontend**: React 19 + Vite 8 (rolldown). Clean Minimalist design system.
- **Design System**: Clean Minimalist — Apple‑inspired. Brand: `#1E2B38` (dark navy), accent `#F2B71A` (mustard gold). Font: **Geist** (Google Fonts).
- **Backend/Database**: Firebase Realtime Database (RTDB) + Firebase Auth.
- **AI/LLM**: OpenRouter (qwen/qwen3.6-flash) para housepysbot.
- **Bot Channels**: Telegram (Telegraf) + WhatsApp.
- **UI Package**: `@house/ui` — componentes atómicos React (Button, Card, Badge, Input, Modal, NexusSidebar).
- **Design Tokens**: `@house/tokens` — CSS custom properties (`--cm-*`) fuente única de verdad.
- **Utilidades**: `@house/db` (Firebase init compartido), `@house/store` (estado global), `@house/validation` (schemas).

## Monorepo Structure (npm workspaces)

### `/apps` — Activas
| App | Description | Framework |
|---|---|---|
| **house-menu** | Food ordering + KDS (Kitchen Display) | React 19 + Vite |
| **portal-hub** | Employee Portal (PIN auth, clock-in/out, schedule, tasks, profile) | React 19 + Vite |
| **housepysbot** | Telegram/WhatsApp AI Bot | TypeScript (tsx) |

### `/apps` — Archivadas
Las siguientes apps se movieron a `/archive/apps/` en junio 2026. Código preservado pero sin mantenimiento activo:

househub, worker-portal, 26play, sorteos-automaticos, house-cleaning, house-laundry, piramid-game

### `/packages`
| Package | Description |
|---|---|
| **@house/ui** | Atomic React components (Button, Card, Badge, Input, Modal, NexusSidebar) |
| **@house/tokens** | CSS custom properties (`--cm-*`): colors, spacing, radii, shadows, typography |
| **@house/db** | Shared Firebase initialization |
| **@house/store** | Global state management (Zustand) |
| **@house/validation** | Zod schemas for core domain models |

### `/agents`
- AI agent orchestration (OpenCode + subagentes). Skills en `/agents/skills/*.md`.

## Decisiones de Diseño
- **Clean Minimalist**: ni Glassmorphism ni Neo‑Brutalist. Diseño limpio tipo Apple con identidad de marca.
- **Brand palette**: `#1E2B38` primary (dark navy), `#F2B71A` accent (mustard gold), `#FFFFFF`. Extraída del logo.
- **Geist font**: reemplaza a Inter como tipografía principal. Google Fonts.
- **Contraste accesible**: amarillo solo decorativo (fondos, íconos). Texto sobre amarillo usa `--cm-primary` (dark blue).
- **CSS custom properties** via `@house/tokens` como única fuente de verdad. Sin hex hardcodeados en apps.
- **Lucide React** para iconos en todos los frontends.
- **Componentes atómicos** en `@house/ui`, customizados vía tokens.
- **NPM Workspaces** para dependencias compartidas.
- **Storybook** en `packages/ui` para desarrollo y documentación de componentes.
---