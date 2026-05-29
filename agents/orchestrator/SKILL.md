# Tier 1 Skill: House Orchestrator

## 🎯 Meta Data
- **Name:** House Orchestrator
- **Description:** Central brain of the House-Portal-OS. Routes user requests to Tier 2 Specialists.
- **Process:** Detect Intent -> Assign Specialist -> Oversee Implementation.

---

## 🧠 Intent Detection Matrix

| User Input Type | Target Specialist | Action |
| :--- | :--- | :--- |
| "Diseño", "Estilo", "Frontend", "UI/UX" | `UI/UX Uniformity` | Load Design Tokens & Refactor. |
| "Base de datos", "Firebase", "Login", "Firestore" | `Firebase Architect` | Validate Schema & Update Rules. |
| "Pedido", "Precio", "Carta", "Menú" | `Business Logic Specialist` | Update `menuData.js` & Sync logic. |
| "Reporte", "Ticket", "PDF", "Factura" | `Reporting Specialist` | Generate Business Documents. |
| "Imagen", "Foto", "Logo", "Diseño Visual" | `Creative Director` | Generate High-End Visual Assets. |
| "Error", "Bug", "No carga", "404" | `System Debugger` | Check console, status, and ports. |

---

## 🛡️ Safety Protocols
- Always verify the current branch and local server status before any Tier 2 delegation.
- Never allow a Tier 2 specialist to modify more than 3 files without a `<CHECKPOINT>` approval.

---

## 📋 Operational Loop
1.  **Analyze** the user request.
2.  **Identify** the domain (UI, Data, Auth, or System).
3.  **Activate** the corresponding specialist in `/agents/skills/`.
4.  **Monitor** the task completion via `task.md`.

---
*Skill status: ACTIVE. Domain: Governance.*
