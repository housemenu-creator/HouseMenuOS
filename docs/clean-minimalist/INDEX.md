# Clean Minimalist — Design System

Design system unificado del ecosistema House Portal OS. Inspirado en Apple (Human Interface Guidelines) y herramientas modernas como Linear y Notion.

## Propósito

Eliminar la fragmentación visual del monorepo. Antes convivían 5 temas distintos (Culinary, Hub Blue, Worker Purple, Neo-Brutalist, Portal Hub). Ahora **todo** converge en Clean Minimalist.

## Principios

1. **Fondo claro, tipografía grande** — `#F5F5F7` de fondo, Inter 17px como base
2. **Acento funcional** — naranja quemado `#C2410C` para acciones primarias e información clave
3. **Respiración generosa** — espaciado Apple: el doble de lo que dicta el instinto
4. **Sin decoración gratuita** — sin glassmorphism, sin gradients chillones, sin bordes agresivos
5. **Mobile-first** — toda vista se diseña desde 375px hacia arriba
6. **Dark mode nativo** — `[data-theme="dark"]` con la misma jerarquía visual

## Cómo usar estos docs

| Ruta | Contenido |
|------|-----------|
| `00-CORE/` | Fundamentos: filosofía, tokens, colores, tipografía, espaciado, radios, motion |
| `01-PATTERNS/` | Patrones de layout por tipo de vista (dashboard, kanban, formulario, etc.) |
| `02-ECOSYSTEM/` | Inventario de vistas del monorepo y prioridad de migración |
| `templates/` | Templates JSX listos para copiar de cada patrón (layout, dashboard, kanban, form, etc.) |

## Fuente de verdad técnica

Los tokens se definen en `packages/tokens/`. Este documento es la guía de uso y las reglas de aplicación.

## Estado

- `00-CORE/` — listo
- `01-PATTERNS/` — listo (10 patrones)
- `02-ECOSYSTEM/` — listo
- Skill OpenCode — listo
