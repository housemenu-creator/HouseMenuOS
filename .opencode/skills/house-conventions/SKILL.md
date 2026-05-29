---
name: house-conventions
description: Convenciones de código, estructura de archivos y nombrado para House-Portal-OS
---

## Convenciones de Código

### React
- Usar arrow functions para componentes
- Colocar lógica en `hooks/`, UI en `components/`
- Preferir composición sobre herencia
- Estados globales en Zustand (`@house/store`)

### TypeScript
- Estricto: evitar `any` a toda costa
- Definir interfaces en archivos `.ts` separados
- Migrar progresivamente `.jsx` → `.tsx`

### Archivos
```
apps/house-menu/src/
├── components/     # UI components
├── hooks/          # Custom hooks
├── lib/            # Services (Firebase, lógica)
├── pages/          # Page components
├── store/          # Zustand stores
└── admin/          # Admin sub-app
```

### Nombrado
- Componentes: PascalCase (`CartDrawer.tsx`)
- Hooks: camelCase con `use` prefix (`useOrders.ts`)
- Servicios: camelCase (`ordersService.js`)
- Constantes: UPPER_SNAKE_CASE (`DEFAULT_PACKAGING`)

### Imports
1. React/librerías externas
2. Módulos internos (`@house/*`)
3. Componentes locales
4. Estilos

### Testing
- Tests unitarios con Vitest + Testing Library
- Archivo co-locado: `ComponentName.test.tsx`
