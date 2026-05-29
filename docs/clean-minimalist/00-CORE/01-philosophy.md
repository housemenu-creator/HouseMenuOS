# Filosofía Clean Minimalist

## Por qué existe

El monorepo House Portal OS tenía 5 temas visuales distintos. Cada app se diseñó con su propia identidad, colores, radios, sombras, tipografía. El resultado era un ecosistema fragmentado sin coherencia.

Clean Minimalist no es un tema más. Es **el** estándar único.

## Inspiración

- **Apple HIG** — fondos blancos/off-white, tipografía grande y clara, espaciado generoso, ausencia de ruido visual
- **Linear** — dashboards limpios, cards sin bordes, jerarquía de información clara, dark mode impecable
- **Notion** — tipografía legible, espaciado consistente, sin decoración innecesaria
- **Vercel/Geist** — radios suaves, sombras sutiles, focus rings precisos

## Principios rectores

### 1. La información es el diseño

No añadas sombras, gradients, bordes o badges decorativos. Cada elemento visual debe tener una razón funcional: dirigir atención, agrupar información, indicar estado.

- Correcto ✅: sombra en una card para diferenciarla del fondo
- Incorrecto ❌: sombra en un botón que ya se distingue por su color

### 2. Jerarquía antes que decoración

La vista debe leerse sin esfuerzo. Usa tipografía y espaciado para crear jerarquía, no colores llamativos ni efectos.

- Correcto ✅: título grande + subtítulo + cuerpo + metadata (cada nivel con su tamaño y peso)
- Incorrecto ❌: todo del mismo tamaño pero con iconos y colores para diferenciar

### 3. Consistencia sobre creatividad

Todas las apps comparten exactamente los mismos tokens. No hay excepciones por app. Si una vista necesita personalidad, se logra con el contenido y el layout, no con colores distintos.

- Correcto ✅: house-menu y worker-portal usan el mismo `--cm-accent`
- Incorrecto ❌: cada app define su propia paleta

### 4. Mobile-first, siempre

Toda vista se diseña desde 375px. El layout desktop es una expansión del mobile, no al revés.

### 5. Dark mode es un requisito, no un extra

No es "tema oscuro". Es el mismo diseño con otra temperatura de color. La jerarquía, espaciado, radios y sombras son idénticos.

## Lo que NO es Clean Minimalist

| No es | Por qué |
|-------|---------|
| Glassmorphism | Fondos translúcidos reducen legibilidad y añaden complejidad |
| Neo-Brutalist | Bordes gruesos y sombras duras son agresivos |
| Flat design plano | Sin jerarquía visual, todo se aplana |
| Minimalismo vacío | Espacio no es ausencia; es respiración intencional |
| Tema "blanco" | El color está presente (naranja quemado como acento funcional) |
