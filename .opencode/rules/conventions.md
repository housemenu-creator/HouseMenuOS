# Convenciones de Código — House-Portal-OS

## React
- Componentes: arrow functions con `const Component = (...) => { ... }`
- Props tipadas con interfaces (TypeScript)
- Hooks personalizados en `hooks/`
- Componentes reutilizables en `components/ui/`

## TypeScript
- `strict: true` en tsconfig — evitar `any`
- Preferir `interface` sobre `type` para objetos
- Usar `Record<K, V>` para diccionarios
- Tipos compartidos en `types/`

## Firebase
- Servicios en `lib/` con nomenclatura: `ordersService.js`, `menuService.js`
- Suscripciones RTDB: `onValue` o `onChildAdded` en hooks
- Transacciones para operaciones críticas (stock, pagos)
- `normalizeFirebaseData()` para convertir objetos RTDB a arrays

## Estructura house-menu
```
apps/house-menu/src/
├── components/       # UI molecules/organisms
├── hooks/            # Custom hooks (useOrders, useMenu, etc.)
├── lib/              # Services (firebase, utils)
├── pages/            # Page-level components
├── store/            # Zustand stores
├── admin/            # Admin panel sub-app
└── App.tsx           # Root con routes
```

## Git
- Commits en español (opcional) o inglés
- Formato: `tipo(ámbito): mensaje` (ej: `feat(cart): add mesa selector`)
- NO hacer commit de .env, node_modules, dist
- NO forzar push ni commits vacíos
