# Registro de Datos — House Portal OS (Monteverde)

Formato estándar para registrar datos nuevos en el sistema. Todos los datos se almacenan en **Firebase Realtime Database** bajo `branches/monteverde/`.

---

## 1. Categorías de Producto

**Ruta:** `catalog/categories/{categoryId}`

```json
{
  "name": "Nuestras Expiencias",
  "image": "https://..."
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | sí | Nombre visible. Usar **título con mayúscula inicial** (ej: "Cafés Especiales", "Bebidas Frías", "Parrillas") |
| `image` | string | no | URL de imagen en Firebase Storage |

**Reglas:**
- Mínimo 2 categorías como para que el menú tenga estructura
- El `categoryId` se genera automáticamente con `push()` de Firebase

---

## 2. Productos

**Ruta:** `catalog/products/{productId}`

```json
{
  "name": "Lomo Saltado",
  "base_price": 18,
  "category": "Nuestras Expiencias",
  "available": true,
  "description": "Lomo saltado con papas fritas y arroz",
  "image": "https://...",
  "isWizard": false,
  "trackStock": false,
  "stock": 0
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | sí | Nombre del plato. **Sin acentos rotos** (usar utf-8 real: ñ, á, é, í, ó, ú). Sin espacios al final |
| `base_price` | number | sí | Precio de venta en soles |
| `category` | string | sí | **Nombre exacto** de la categoría (texto libre, no ID). Debe coincidir con un `catalog.categories.{id}.name` |
| `available` | boolean | sí | `true` = visible en menú; `false` = oculto |
| `description` | string | no | Texto corto que aparece abajo del nombre |
| `image` | string | no | URL de Firebase Storage |
| `isWizard` | boolean | sí | `true` = producto armable (con pasos/opciones). `false` = producto simple |
| `trackStock` | boolean | no | `true` si se controla inventario manualmente |
| `stock` | number | no | Stock actual (solo si `trackStock: true`) |

### Productos Wizard (isWizard: true)

Tienen `steps[]` donde cada step es una categoría de opción (ej: Entradas, Acompañamiento, Proteína). Cada step tiene `options[]` con las opciones disponibles.

```json
{
  "steps": [
    {
      "id": "step_1234567890_1",
      "title": "Entradas",
      "type": "single",
      "options": [
        {
          "id": "opt_1234567890_1",
          "name": "Ceviche de Pota",
          "price": 0,
          "icon": "????",
          "trackStock": false,
          "stock": 0
        }
      ]
    }
  ]
}
```

**Reglas:**
- `id` de step: `step_{timestamp}_{n}`
- `id` de option: `opt_{timestamp}_{n}`
- `type`: siempre `"single"` por ahora
- `price`: 0 si está incluido en el precio base; > 0 si tiene costo adicional

---

## 3. Órdenes

**Ruta:** `orders/{orderId}`

```json
{
  "customerName": "Juan Pérez",
  "customerPhone": "999888777",
  "order_type": "Para Llevar",
  "status": "entregado",
  "payment_method": "Efectivo",
  "payment_status": "pagado",
  "createdAt": "2026-07-19T12:00:00.000Z",
  "items": [{
    "id": "uuid",
    "productId": "-OvcCecc2OM2yLzppqQT",
    "name": "Lomo Saltado",
    "price": 18,
    "quantity": 2,
    "unitPrice": 18
  }],
  "financials": {
    "subtotal": 36,
    "tax_igv": 6.48,
    "deliveryFee": 5,
    "total": 47.48
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `customerName` | string | no | Nombre del cliente. Si es anónimo/kiosko, puede ir vacío |
| `status` | string | sí | `"entregado"` \| `"cancelado"` \| `"pendiente"` |
| `order_type` | string | sí | `"Para Llevar"` \| `"Delivery"` \| `"Mesa"` |
| `payment_status` | string | sí | `"pagado"` \| `"pendiente"` \| `"reembolsado"` |
| `total` | number | sí | **Debe ser > 0** para órdenes reales |

**Reglas:**
- No crear órdenes de prueba con nombres como "bcbvb", "prueba 1", "test"
- Si total = 0, la orden no tiene valor real — evitar en producción
- `createdAt` en formato ISO-8601 string (`"2026-07-19T12:00:00.000Z"`), **no usar timestamp numérico**

---

## 4. Ingredientes

**Ruta:** `logistics/ingredients/{ingredientId}`

```json
{
  "name": "Papa Blanca",
  "unit": "kg",
  "cost": 4.26,
  "stock": 8.59,
  "minStock": 6.89,
  "category": "Verduras",
  "supplierId": "-NRLMF...",
  "cargo": "COCINA 1",
  "createdAt": "2026-07-18T01:01:30.818Z"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | sí | Nombre del insumo |
| `unit` | string | sí | Unidad: `kg`, `und`, `bot`, `l`, `ml`, `sol` (paquete) |
| `cost` | number | sí | Costo unitario en soles |
| `stock` | number | sí | Stock actual en unidades |
| `minStock` | number | no | Stock mínimo para alerta |
| `category` | string | no | Agrupación: "Verduras", "Carnes", "Secos y Abarrotes", "Lácteos", "Bebidas", "Condimentos" |
| `supplierId` | string | no | ID del proveedor en `logistics/suppliers/` |

---

## 5. Recetas

**Ruta:** `logistics/recipes/{recipeId}`

```json
{
  "productName": "Lomo Saltado",
  "productId": "-Ow9QyybS3aAHHj53ESo",
  "yield": 1,
  "costPerPortion": 3.22,
  "ingredients": {
    "firebase_key_1": {
      "name": "Aceite Mirasol",
      "quantity": 0.05,
      "unit": "und",
      "unitCost": 2.55
    },
    "firebase_key_2": {
      "name": "Pulpa de Res",
      "quantity": 0.25,
      "unit": "kg",
      "unitCost": 3.25
    }
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `productName` | string | sí | Debe coincidir con `catalog.products.{id}.name` |
| `productId` | string | sí | ID completo del producto asociado |
| `yield` | number | sí | Porciones que produce. **No dejarlo undefined** |
| `costPerPortion` | number | sí | Costo total de ingredientes / yield. **No dejarlo undefined** |
| `ingredients` | map | sí | Mapa de ingredientes (usar Firebase keys como IDs internos) |

**Reglas:**
- Registrar `yield` y `costPerPortion` siempre — el dashboard COGS los necesita
- `unitCost` en cada ingrediente = costo actual del ingrediente al momento de crear la receta

---

## 6. Proveedores

**Ruta:** `logistics/suppliers/{supplierId}`

```json
{
  "name": "Julio Sernaque",
  "contact": "Julio",
  "phone": "969 948 803",
  "email": "julio@gmail.com",
  "notes": "Proveedor de Verduras"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | sí | Nombre del negocio |
| `contact` | string | no | Nombre de contacto |
| `phone` | string | no | Teléfono |
| `email` | string | no | Correo |
| `notes` | string | no | Tipo de producto que provee |

---

## 7. Menú Diario

**Ruta:** `daily_menus/{YYYY-MM-DD}`

```json
{
  "active": true,
  "name": "Aji de Gallina",
  "description": "Rico ají de gallina",
  "basePrice": 13.5,
  "productIds": [
    "-Ow9STrii5xICln2qeI0",
    "-Ow9QyybS3aAHHj53ESo"
  ],
  "updatedAt": 1783354038901
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | sí | Nombre del menú del día |
| `basePrice` | number | sí | Precio base |
| `productIds` | array | sí | IDs de productos incluidos (no crear si los productos no existen) |
| `active` | boolean | sí | `true` mientras esté vigente |

---

## Convenciones Generales

### Nombres
- **Siempre UTF-8 real**: `Menú`, `Café`, `Chicharrón`, `Piña`, `Plátanos`, `Clásico`
- **Sin espacios al final**: "Tallarines con Pollo al Horno " → "Tallarines con Pollo al Horno"
- **Capitalización**: Primera letra mayúscula, el resto minúscula (excepto nombres propios)
- **Sin nombres genéricos**: "Plato de Ejemplo", "Nuevo Plato", "Descarte" no son válidos

### IDs de Firebase
- Usar siempre `push()` de Firebase para generar IDs únicos
- **No truncar IDs** en scripts — Firebase keys son strings completas como `-Ow9SFdPFTKLlMKyYacW`

### Fechas
- `createdAt`, `updatedAt` → ISO-8601 string: `"2026-07-19T12:00:00.000Z"`
- Solo `daily_menus` y configs pueden usar timestamp numérico

### Precios
- Siempre en **soles (S/)** — números, no strings
- Productos: `base_price`. Mínimo S/1 para que sea real
- Si un producto no tiene precio definido, queda invisible en el kiosko

### Limpieza
- Antes de crear data de prueba, verificar con `database:get` que la rama no tenga datos reales
- Para borrar masivamente: usar `database:set` con el árbol completo reconstruido, no `database:update` con paths planos

---

## Quick Reference — Firebase CLI

```bash
# Leer
npx firebase-tools database:get /branches/monteverde/catalog/products

# Escribir (reemplaza todo el nodo)
npx firebase-tools database:set /branches/monteverde/catalog archivo.json --force

# Borrar un nodo específico
npx firebase-tools database:set /branches/monteverde/catalog/products/id null --force

# Actualizar (merge)
npx firebase-tools database:update /branches/monteverde archivo.json --force
```

> ⚠️ `database:update` con JSON anidado **reemplaza** toda la rama. Para cambios atómicos, usar `database:set` a paths específicos.
