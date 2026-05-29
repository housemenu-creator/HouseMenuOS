---
name: house-ui-ux
description: Design tokens, colores, animaciones y variantes Framer Motion para House-Portal-OS Glassmorphism
---

## Design System: House-Portal-OS

### Colores
- Fondo: `#070912` (dark)
- Primary: `#fbbf24` (amber/gold)
- Secondary: `#a855f7` (purple)
- Success: `#10b981` (emerald)
- Glass bg: `bg-white/5` → light mode: `bg-white/80`

### Glassmorphism
```css
/* Clases obligatorias en cards y contenedores */
bg-white/5 backdrop-blur-xl border border-white/10
```

### Animación estándar (Framer Motion)
```javascript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeOut" }
};
```

### Iconos
- Siempre Lucide React, nunca emojis como iconos
- Tamaño estándar: `size={16}` en tabs/metas, `size={20}` en botones, `size={24}` en headers

### Tipografía
- Principal: `text-gray-100` en dark, `text-slate-900` en light
- Secundaria: `text-gray-400` en dark, `text-slate-600` en light
- Títulos: `text-lg font-semibold` o `text-xl font-bold`

### Inputs
- Estilo: `bg-white/5 border border-white/10 rounded-xl px-4 py-2`
- Focus: `focus:ring-2 focus:ring-amber-500 focus:border-transparent`
