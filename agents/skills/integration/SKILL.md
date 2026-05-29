# Tier 2 Skill: Service Integration Specialist

## 🎯 Meta Data
- **Name:** Service Integration Specialist
- **Description:** Expert in monorepo orchestration and cross-service data flow.
- **Tools:** Vite Monorepo patterns, Shared Data Schemas.

---

## 🛠️ Integration Architecture
1.  **Shared Authentication:** All apps in `/apps` must use the same Firebase Auth instance.
2.  **Shared Styling:** All apps must import the core Glassmorphism tokens from `/apps/portal-hub/style.css` or a shared `theme` package.
3.  **Port Mapping:**
    - `5173`: Nexus Portal (Hub)
    - `5176`: House Menu (ERP)
    - `5177`: House Laundry
    - `5178`: House Cleaning
    - `5179`: Worker Portal

---

## 🔄 Inter-App Communication
- **State:** Use a shared local storage or centralized Firebase DB.
- **Navigation:** All apps must have a "Back to Nexus" button pointing to `localhost:5173`.

---

## 🛡️ Consistency Rules
- Every new module must be added to the `Nexus Dashboard` grid.
- Every module must have a `task.md` in its root folder for tracking.

---
*Skill status: ACTIVE. Domain: Systems Architecture.*
