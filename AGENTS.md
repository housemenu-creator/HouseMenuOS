# House-Portal-OS: Expert Tier 4 Agentic Constitution

This document defines the **Tier 4 Modular Architecture** for all AI Agents operating within the `House-Portal-OS` monorepo. This structure ensures maximum uniformity, professional grade engineering, and zero-hallucination execution.

---

## 🏛️ Tier Hierarchy

### Tier 1: The Orchestrator (`/agents/orchestrator`)
- **Role:** Central routing and intent detection.
- **Process:** Every user request must first be parsed by the Orchestrator to identify the required **Tier 2 Specialist**.
- **Rule:** Never execute implementation logic at Tier 1. Always delegate.

### Tier 2: Specialists (`/agents/skills`)
- **Role:** Domain-specific intelligence.
- **Active Specialists:**
  - `UI/UX Uniformity`: Responsible for Tailwind, Framer Motion, and Glassmorphism consistency.
  - `Firebase Architect`: Responsible for Firestore schemas, security rules, and Auth logic.
  - `Business Logic Specialist`: Responsible for pricing, menu data, and inventory rules.

### Tier 3: Agents (`/agents/specialists`)
- **Role:** Persona-driven workers with limited toolsets.
- **Constraints:** Every agent must operate within a `maxTurns` limit and follow strict `SafetyTags`.

### Tier 4: Implementation (`/scripts`)
- **Role:** Atomic scripts and automated tools.
- **Output:** Clean code, validated database writes, and generated reports.

---

## 🧠 Context Maintenance (Expert Engineering)

To prevent context drift and ensure long-term efficiency, all agents MUST:
1.  **Read `/docs`**: Consult `projectContext.md` and `techStack.md` before proposing any architectural changes.
2.  **Update Progress**: Update `walkthrough.md` after completing a major task.
3.  **Validate against Stack**: Ensure any new code adheres to the `techStack.md` guidelines.

---

## 🛡️ Global Security & SafetyTags

All agents MUST respect the following tags in every interaction:
- `<CHECKPOINT>`: Verify current state before modifying any file in `/apps`.
- `<VALIDATION>`: Run `npm run lint` or manual checks before marking a task as done.
- `<CONSISTENCY>`: Ensure every new UI component matches the established Design Tokens in `style.css`.

---

## 🎨 Expert Design Standards (Uniformity)

To achieve absolute uniformity, all UI components must adhere to:
1.  **Tailwind CSS Only:** No custom CSS classes unless specifically defined in the design system.
2.  **Framer Motion Transitions:** All view changes must use `AnimatePresence`.
3.  **Atomic Structure:** Components must be modular and reusable across `portal-hub` and `house-menu`.
4.  **Glassmorphism Tokens:** Use strictly: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`.

## 📐 New Views — Template-First Rule

**Every new view MUST start from a Clean Minimalist template.** Before writing any JSX:

1. Identify the pattern type (dashboard, list, detail, form, kanban, card-grid, conversation, game, single-page)
2. Load the corresponding template from `docs/clean-minimalist/templates/`
3. Copy and adapt — never start from scratch

Available templates:

| Patrón | Archivo |
|--------|---------|
| Layout shell (sidebar + header) | `01-layout-shell.jsx` |
| Dashboard (KPIs + feed + tabla) | `02-dashboard.jsx` |
| List/DataTable (search + sort) | `03-list-datatable.jsx` |
| Detail view (back + sections) | `04-detail-view.jsx` |
| Form/Wizard (steps + inputs) | `05-form-wizard.jsx` |
| Kanban board (drag columns) | `06-kanban-board.jsx` |
| Card grid | `07-card-grid.jsx` |
| Conversation/Chat | `08-conversation.jsx` |
| Game phase (ready → play → results) | `09-game-phase.jsx` |
| Single-page service | `10-single-page-service.jsx` |

**Reglas al adaptar un template:**
- Solo `--cm-*` tokens / `cm-*` Tailwind classes
- Sin hex hardcodeados, sin clases legacy (`culinary-*`, `hub-*`, `worker-*`)
- Incluir 4 estados: loading, empty, error, populated
- Mobile-first con dark mode
- `AnimatePresence` para transiciones
- Layout shell (`md:pl-64 pt-16 md:pt-0`) si aplica sidebar

---

## 🔄 Workflow Loop
1.  **Detect Intent** -> 2. **Load Specialist Skill** -> 3. **Verify SafetyTags** -> 4. **Execute & Validate**.

---
*Enforced by House-Portal-OS Management System. Version 2.0 (Expert)*

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
