# Motion — Transiciones y Micro-interacciones

## Timing

| Token | Valor | Uso |
|-------|-------|-----|
| `--cm-transition-fast` | `150ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Hover, active, micro-interacciones |
| `--cm-transition-base` | `300ms cubic-bezier(0.25, 0.1, 0.25, 1)` | Transiciones de estado, modales, drawers |
| `--cm-transition-slow` | `500ms cubic-bezier(0.25, 0.1, 0.25, 1)` | Page transitions, hero animations |

## Patrones

### Hover (150ms, spring out)
```css
button {
  transition: transform var(--cm-transition-fast),
              background var(--cm-transition-fast),
              box-shadow var(--cm-transition-fast);
}
button:hover {
  transform: scale(1.02);
}
button:active {
  transform: scale(0.96);
}
```

### Fade + Slide (300ms)
```css
.fade-in {
  animation: fadeIn var(--cm-transition-base) both;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Stagger (items en lista/grid)
Cada item aparece con `150ms` de delay respecto al anterior. Máximo 200ms de stagger total.

### Page transitions (500ms)
Solo para cambios de ruta principales. Las tabs y sub-vistas no tienen transición de página.

## Reglas

1. **Las transiciones deben sentirse naturales** — usa cubic-bezier, no linear
2. **No más de 300ms** para interacciones directas (hover, click)
3. **Stagger máximo**: 4 items (200ms total)
4. **Sin animaciones decorativas** — spinner solo cuando hay carga real
5. **Reduced motion**: respeta `prefers-reduced-motion`
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

## Micro-interacciones Apple

| Elemento | Acción | Efecto |
|----------|--------|--------|
| Botón primario | Hover | `scale(1.02)` suave |
| Botón primario | Active | `scale(0.96)` + bg más oscuro |
| Card | Hover | `shadow-sm → shadow-md` + `translateY(-2px)` |
| Input | Focus | `ring-[--cm-accent]` con `box-shadow` suave |
| Toggle/Switch | Change | Spring motion (como iOS) |
| Toast | Enter | Slide desde top + fade |
| Toast | Exit | Fade out + slide up |

## Checklist

- [ ] Hover con `--cm-transition-fast`
- [ ] Modales con `--cm-transition-base`
- [ ] No animaciones decorativas
- [ ] `prefers-reduced-motion` respetado
- [ ] Stagger en listas/grids
- [ ] Botón active state con `scale(0.96)`
