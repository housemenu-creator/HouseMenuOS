# Arquitectura del Proyecto: House-Portal-OS

## Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Tailwind CSS 3.4 + Vite 8.
- **Estilo**: Clean Minimalist — Apple‑inspired con acento naranja quemado `#C2410C`.
- **Backend/Database**: Firebase Realtime Database (RTDB) + Firebase Auth.
- **AI/LLM**: OpenRouter (qwen/qwen3.6-flash) para housepysbot.
- **Bot Channels**: Telegram (Telegraf) + WhatsApp.
- **UI Package**: `@house/ui` — componentes atómicos React (Button, Card, Badge, Input, Modal, NexusSidebar).
- **Design Tokens**: `@house/tokens` — CSS custom properties fuente única de verdad.
- **Utilidades**: `@house/db` (Firebase init compartido), `@house/store` (estado global).

## Monorepo Structure (npm workspaces)

### `/apps`
| App | Description | Framework |
|---|---|---|
| **house-menu** | Food ordering system | React 19 + Vite |
| **househub** | Central hub dashboard | React 19 + Vite |
| **worker-portal** | Worker/admin operations portal | React 19 + Vite |
| **26play** | Adult party game (26 preguntas) | React 19 + Vite |
| **sorteos-automaticos** | Raffle/ticket system | React 19 + Vite |
| **house-cleaning** | Cleaning service management | React 19 + Vite |
| **house-laundry** | Laundry service management | React 19 + Vite |
| **portal-hub** | Central vanilla dashboard | React 19 + Vite |
| **housepysbot** | Telegram/WhatsApp AI Bot | TypeScript (tsx) |
| **piramid-game** | Pyramid game app | React 19 + Vite |

### `/packages`
| Package | Description |
|---|---|
| **@house/ui** | Atomic React components (Button, Card, Badge, Input, Modal, NexusSidebar) |
| **@house/tokens** | CSS custom properties (`--cm-*`): colors, spacing, radii, shadows, typography |
| **@house/db** | Shared Firebase initialization |
| **@house/store** | Global state management |

### `/agents`
- `/specialists/clean-minimalist-designer/SKILL.md` — Design system rules for AI agents.

## Decisiones de Diseño
- **Clean Minimalist** (tercera vía): ni Glassmorphism ni Neo‑Brutalist. Diseño limpio tipo Apple.
- **CSS custom properties** via `@house/tokens` como única fuente de verdad. Sin variables locales en apps.
- **Lucide React** para iconos en todos los frontends.
- Componentes atómicos en `@house/ui`, customizados vía tokens.
- **Seguridad**: Firebase Rules restrictivas en producción.
- **NPM Workspaces** para dependencias compartidas.
---