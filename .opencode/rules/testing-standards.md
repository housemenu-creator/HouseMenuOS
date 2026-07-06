# Testing Standards — House-Portal-OS (ECC Inspired)

## Minimum Coverage: 80%

### Test Types (ALL required)
1. **Unit Tests** — Funciones, utilities, hooks individuales (Vitest)
2. **Integration Tests** — Firebase RTDB operations, stores, servicios
3. **E2E** — Critical user flows (cuando aplique)

## Test Structure (AAA Pattern)

```typescript
test('calcula el total correctamente', () => {
  // Arrange
  const items = [{ price: 10, qty: 2 }, { price: 5, qty: 1 }]

  // Act
  const total = calculateTotal(items)

  // Assert
  expect(total).toBe(25)
})
```

### Naming
- Describir el comportamiento bajo test, no lo que hace el código
- Usar español o inglés consistente con el archivo

```typescript
test('retorna array vacío cuando no hay items en el menú', () => {})
test('lanza error cuando el email del cliente es inválido', () => {})
```

## Matchers Preferidos
- `toBe()` para primitivos
- `toEqual()` o `toStrictEqual()` para objetos/arrays
- `toHaveBeenCalledWith()` para mocks
- `toThrow()` para errores

## Firebase Tests
- Usar `@firebase/rules-unit-testing` para reglas de seguridad
- Mocks de Firebase SDK para tests unitarios de servicios
- Usar `vi.fn()` y `vi.mock()` para mockear módulos de Firebase

## Estructura de Tests
```
__tests__/
  components/   # Test de componentes
  hooks/        # Test de hooks
  lib/          # Test de servicios/utils
  pages/        # Smoke tests de páginas
```
O colocar `.test.jsx` junto al archivo bajo test.

## Checklist Pre-commit
- [ ] Tests unitarios pasando: `npm run test:menu`
- [ ] Coverage mínimo 80%
- [ ] No hay `console.log` en producción
- [ ] Errores manejados en toda async call
