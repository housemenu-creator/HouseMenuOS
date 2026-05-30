# Tech Stack: House-Portal-OS

## 🛠️ Core Technologies
- **Runtime**: Node.js (v22+)
- **Package Manager**: NPM (workspaces)
- **Module System**: ESM (ECMAScript Modules)

## 🌐 Frontend Stack
- **Framework**: React 19 + Vite 8 for all apps.
- **Styling**: Tailwind CSS 3.4 + CSS custom properties (`@house/tokens`).
- **Design System**: Clean Minimalist (Apple‑inspired, acento `#C2410C`). Powered by `@house/tokens` CSS custom properties (`--cm-*`).
- **Animations**: Framer Motion 12.
- **Icons**: Lucide React.
- **Charts**: Recharts (househub).

## 📦 Shared Packages (@house/*)
- **@house/ui**: Componentes atómicos (Button, Card, Badge, Input, Modal, NexusSidebar).
- **@house/tokens**: CSS variables `--cm-*` para colores, spacing, radii, shadows, typography.
- **@house/db**: Firebase init compartido.
- **@house/store**: Estado global.

## 🔥 Backend / Database
- **Firebase Realtime Database** (RTDB) — proyecto `house-menuapp`.
- **Firebase Auth** — autenticación.
- **No Firestore** — todo en RTDB.

## 🤖 AI / Bot (housepysbot)
- **LLM**: OpenRouter (qwen/qwen3.6-flash primario, openrouter/owl-alpha fallback).
- **Telegram**: Telegraf 4 (long-polling).
- **WhatsApp**: whatsapp-web.js.
- **HTTP**: Express + Socket.IO (QR pairing UI, health check).
- **Deploy**: Fly.io / Render (Docker).

---
*Stack status: STABLE. No unapproved library additions allowed. Design System: Clean Minimalist (2026).*
