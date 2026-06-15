# Tech Stack: House-Portal-OS

## 🛠️ Core Technologies
- **Runtime**: Node.js (v22+)
- **Package Manager**: NPM (workspaces)
- **Module System**: ESM (ECMAScript Modules)

## 🌐 Frontend Stack
- **Framework**: React 19 + Vite 8 (rolldown bundler).
- **Styling**: Tailwind CSS + CSS custom properties (`@house/tokens`).
- **Design System**: Clean Minimalist. Brand palette: `--cm-primary: #1E2B38`, `--cm-accent: #F2B71A`. Font: **Geist** via Google Fonts.
- **Animations**: Framer Motion.
- **Icons**: Lucide React.

## 📦 Shared Packages (@house/*)
- **@house/ui**: Componentes atómicos (Button, Card, Badge, Input, Modal, NexusSidebar) + Storybook.
- **@house/tokens**: CSS variables `--cm-*` para colores, spacing, radii, shadows, typography.
- **@house/db**: Firebase init compartido.
- **@house/store**: Estado global (Zustand).
- **@house/validation**: Zod schemas para modelos de dominio.
- **@house/db** y **@house/store** también expuestos via CDN IIFE para house-menu.

## 🔥 Backend / Database
- **Firebase Realtime Database** (RTDB) — proyecto `house-menuapp`.
- **Firebase Auth** — autenticación.
- **No Firestore** — todo en RTDB.

## 🤖 AI / Bot (housepysbot)
- **LLM**: OpenRouter (qwen/qwen3.6-flash primario, openrouter/owl-alpha fallback).
- **Telegram**: Telegraf (long-polling).
- **WhatsApp**: whatsapp-web.js.
- **HTTP**: Express + Socket.IO (QR pairing, MCP endpoint, health check).
- **Agentic**: MCP tool registry con scheduler de tasks y executor vía LLM.
- **Deploy**: Docker multi-stage (nginx + node).

---
*Stack status: STABLE. Brand palette actualizada 2026-06. Geist font. 3 apps activas.*
