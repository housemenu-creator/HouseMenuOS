# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ayni Hub (formerly House Portal OS)
**Generated:** 2026-05-11
**Category:** Productivity / Operations Ecosystem

---

## Global Rules

### Color Palette

The palette is derived from the elemental materials of the Andes, transposed onto a high-contrast digital canvas.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary (Incan Gold) | `#735c00` | `--color-primary` |
| Secondary (Andean Terracotta) | `#a93818` | `--color-secondary` |
| Tertiary (Lake Titicaca Blue)| `#366287` | `--color-tertiary` |
| Background (Stone Canvas) | `#fcf9f8` | `--color-background` |
| Text/Outline (Chiripa Black)| `#1c1b1b` | `--color-text` |

**Color Notes:** Color application must remain flat. Do not use gradients unless representing data flow or AI processing states.

### Typography

- **Heading/Body Font:** Space Grotesk
- **Mood:** Neo-Brutalist, monumental, tech, precise
- **Google Fonts:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
```

### Elevation & Depth (Neo-Brutalism)

This design system rejects traditional shadows and Z-axis depth. Hierarchy is established through **Stark Layering and Hard Offsets**.

| Level | CSS Implementation | Usage |
|-------|--------------------|-------|
| Base Border | `border: 2px solid #1c1b1b;` | Default inputs, minor cards |
| Thick Border | `border: 4px solid #1c1b1b;` | Primary containers, hero sections |
| Hard Shadow | `box-shadow: 4px 4px 0px 0px #1c1b1b;` | Buttons, draggable cards |
| Pressed State| `box-shadow: 0px 0px 0px 0px #1c1b1b; transform: translate(4px, 4px);` | Active buttons |

---

## Component Specs

### Buttons

Buttons are the core of the "empowering" feel. They feature a solid black border and a hard black offset shadow. On hover/active, the button shifts down and right, partially "consuming" the shadow to simulate a physical press.

```css
.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border: 2px solid var(--color-text);
  box-shadow: 4px 4px 0px 0px var(--color-text);
  font-weight: 700;
  text-transform: uppercase;
  transition: all 100ms ease;
  cursor: pointer;
  border-radius: 0px; /* SHARP CORNERS ONLY */
}

.btn-primary:active {
  box-shadow: 0px 0px 0px 0px var(--color-text);
  transform: translate(4px, 4px);
}
```

### Cards (Bento Grid)

Cards are treated as heavy blocks. 

```css
.card {
  background: var(--color-background);
  border: 2px solid var(--color-text);
  padding: 24px;
  box-shadow: 4px 4px 0px 0px var(--color-text);
  border-radius: 0px;
}
```

---

## Style Guidelines

**Style:** Neo-Brutalism (Ayni)
**Keywords:** Ancestral, Artificial Intelligence, Rigid, Heavy, Bold, Fixed-Fluid Hybrid, Sharp Corners
**Key Features:** 0px border-radius everywhere, 100% opaque shadows, uppercase utility text, 24px fixed gutters.

### Additional Forbidden Patterns

- ❌ **Rounded Corners** — Everything must have 0px border-radius.
- ❌ **Soft Shadows** — No blurs. Shadows are 100% solid color block offsets.
- ❌ **Gradients** — Flat colors only, unless specifically animating AI states.
- ❌ **Thin borders** — Borders must be 2px or 4px thick.

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] `border-radius: 0` is applied universally.
- [ ] Shadows are hard, opaque offsets (`box-shadow: 4px 4px 0 #000`).
- [ ] Font used is `Space Grotesk`.
- [ ] Headers and utility texts are uppercase where appropriate to feel "monumental".
- [ ] Button press active states shift the button physically by translating X/Y and reducing the shadow size.
