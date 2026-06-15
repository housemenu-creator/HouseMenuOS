# Project Context: House-Portal-OS

## 📋 Overview
`House-Portal-OS` is a professional-grade Monorepo for restaurant operations: a food ordering webapp (house-menu), an employee portal (portal-hub), and an AI bot (housepysbot) for Telegram/WhatsApp. Former apps have been consolidated — see `archive/` for historical references.

## 🏛️ Repository Structure
- **`/apps`**: 3 active applications (house-menu, portal-hub, housepysbot). See `docs/architecture.md` for details.
- **`/packages`**: 5 shared packages (@house/ui, @house/tokens, @house/db, @house/store, @house/validation).
- **`/agents`**: AI agent orchestration and skill definitions.
- **`/docs`**: Architecture, design system, and context documentation.
- **`/scripts`**: Utility and migration scripts.
- **`/archive`**: Historical apps no longer actively maintained.

## 🎯 Primary Goals
1. **Uniformity**: Todos los frontends comparten el mismo Design System (Clean Minimalist via `@house/tokens`).
2. **Professionalization**: Código tipado, estructurado, con workspaces npm y tests.
3. **Automation**: AI Bot (housepysbot) maneja atención al cliente y administración vía Telegram/WhatsApp.

---
*Context status: ACTIVE. Design tokens updated 2026-06 (brand palette: #1E2B38/#F2B71A, Geist font).*
