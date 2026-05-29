# Spacing — Sistema de Espaciado

Basado en el sistema Apple: progresión geométrica desde `0.5rem`.

## Escala

| Token | Valor | Ejemplo de uso |
|-------|-------|----------------|
| `--cm-space-xs` | `0.5rem` (8px) | Gap entre icono y label, padding de badges |
| `--cm-space-sm` | `1rem` (16px) | Gap entre elementos relacionados, card padding mínimo |
| `--cm-space-md` | `2rem` (32px) | Card padding estándar, gap entre secciones |
| `--cm-space-lg` | `4rem` (64px) | Separación entre bloques grandes, section spacing |
| `--cm-space-xl` | `6rem` (96px) | Page section spacing, hero padding |
| `--cm-space-2xl` | `8rem` (128px) | Page margins extremos |

## Reglas

### 1. El doble de lo que dicta el instinto
Apple usa espaciado generoso. Si crees que 16px es suficiente, usa 32px.

### 2. Consistencia horizontal y vertical
- Padding de cards: `--cm-space-md` (32px) en los 4 lados
- Gap entre cards en grid: `--cm-space-md` (32px)
- Gap entre items en lista: `--cm-space-sm` (16px)

### 3. Mobile → más compacto, desktop → más espaciado
```css
.card { padding: --cm-space-sm; }
@media (min-width: 768px) { .card { padding: --cm-space-md; } }
```

### 4. No uses margins en componentes individuales
Los componentes no definen su propio margin. El layout define el espaciado entre ellos.

## Patrones de espaciado

| Contexto | Padding interno | Gap entre items |
|----------|----------------|-----------------|
| Card | `--cm-space-md` | — |
| List item | `--cm-space-sm` | `--cm-space-sm` |
| Dashboard section | `--cm-space-md` | `--cm-space-md` |
| Form group | `--cm-space-sm` | `--cm-space-xs` |
| Modal content | `--cm-space-md` | `--cm-space-sm` |
| Sidebar item | `--cm-space-sm` | `--cm-space-xs` |

## Checklist

- [ ] Espaciado generoso (el doble de lo intuitivo)
- [ ] Consistencia: mismas medidas en toda app
- [ ] Responsive: mobile compacto, desktop amplio
- [ ] Sin margins en componentes (solo padding)
- [ ] Gap de grid = `--cm-space-md`
