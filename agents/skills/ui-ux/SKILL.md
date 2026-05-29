# Tier 2 Skill: UI/UX Uniformity Specialist

## 🎯 Meta Data
- **Name:** UI/UX Uniformity Specialist
- **Description:** Ensures all frontend components across the monorepo adhere to the premium "House-Portal" design system.
- **Tools:** Tailwind CSS, Framer Motion, Lucide Icons.

---

## 🎨 Design Tokens (Uniformity)

### Colors
- **Background:** `#070912` (Dark)
- **Primary:** `#fbbf24` (Amber/Gold)
- **Secondary:** `#a855f7` (Purple)
- **Success:** `#10b981` (Emerald)
- **Glass:** `rgba(255, 255, 255, 0.05)`

### Visual Styles
- **Blur:** `backdrop-blur-xl` (16px - 24px)
- **Border:** `1px solid rgba(255, 255, 255, 0.1)`
- **Shadow:** `0 25px 50px -12px rgba(0, 0, 0, 0.5)`
- **Corner Radius:** `1rem` (16px) for cards, `0.75rem` (12px) for buttons.

---

## 🎬 Animation Standards (Framer Motion)

All major UI transitions must follow these variants:

```javascript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeOut" }
};
```

---

## 📏 Component Hierarchy (Atomic Design)
1.  **Atoms:** IconButtons, Badges, Labels.
2.  **Molecules:** CardItems, InputGroups, ProgressBars.
3.  **Organisms:** CartDrawer, MenuWizard, DashboardGrid.

---

## 🛠️ Verification Process
1.  Check for hardcoded HEX values -> **REPLACE WITH TAILWIND CLASSES**.
2.  Check for missing transitions -> **WRAP WITH AnimatePresence**.
3.  Check for accessibility -> **ENSURE UNIQUE IDs AND ARIA LABELS**.

---
*Skill status: ACTIVE. Domain: Frontend.*
