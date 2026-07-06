# Coding Standards — House-Portal-OS (ECC Inspired)

## Core Principles

### Immutability (CRITICAL)
- NEVER mutate objects/arrays — always create new copies
- Usar spread operator (`...`) para updates: `{ ...obj, field: value }`
- En Zustand stores, usar `set()` con immutabilidad — React depende de referencias

```typescript
// WRONG
user.name = 'new name'

// CORRECT
updateUser({ ...user, name: 'new name' })
```

### KISS + YAGNI
- Preferir la solución más simple que funciona
- NO construir abstracciones antes de que se necesiten
- Refactorizar cuando la presión es real, no por especulación

### DRY con criterio
- Extraer lógica repetida a funciones/utilities compartidas
- NO forzar abstracciones donde no hay repetición real

## File Organization
- **Muchos archivos pequeños > pocos archivos grandes**
- 200-400 líneas típico, 800 máximo
- Organizar por feature/dominio, no por tipo técnico

## Naming
- Componentes React: `PascalCase` (ej: `UserCard`, `OrderList`)
- Hooks: `use<Nombre>` (ej: `useOrders`, `useMenu`)
- Servicios/Utils: `camelCase` (ej: `ordersService`, `formatPrice`)
- Constantes: `UPPER_SNAKE_CASE`
- Props con `interface`, booleanos prefijo `is/has/should/can`

## Error Handling
- Try-catch en toda llamada asíncrona
- Errores `unknown` se narrow con `instanceof Error`
- UI-facing: mensajes user-friendly, no errores técnicos crudos
- NO `console.log` en producción — usar logger o toast para el user

## Input Validation
- Validar TODO input en boundaries (formularios, RTDB writes, params URL)
- Zod schemas en `@house/validation` para modelos de dominio
- Fail fast con mensajes claros

## TypeScript Strict
- NO usar `any` — preferir `unknown` y narrow seguro
- `interface` para object shapes, `type` para unions/tuplas
- Tipos compartidos en `types/` o junto al feature
- Inferir tipos de Zod schemas con `z.infer<>`
