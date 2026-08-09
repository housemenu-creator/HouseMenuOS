# Especificación: Sistema Integrado de Logística, Inventario, Proveedores y Finanzas

## Visión General

Sistema completo que conecta **Proveedores → OC → Insumos → Recetas → Productos → Pedidos → Finanzas**
en un flujo unificado con datos en tiempo real, alertas automáticas y visibilidad cross-module.

---

## 1. Modelo de Datos

### 1.1 Proveedores

```
branches/{branchId}/suppliers/{id}
  nombre         string
  contacto       string
  telefono       string
  email          string
  direccion      string
  tipoDocumento  'ruc' | 'dni' | 'informal'
  numDocumento   string | null
  plazoPago      'contado' | '7d' | '15d' | '30d'
  categorias     string[]    // ej: ['Carnes', 'Verduras']
  activo         boolean
  createdAt      timestamp
```

### 1.2 Insumos (Ingredientes)

```
branches/{branchId}/logistics/ingredients/{id}
  name           string
  category       string      // 'Verduras' | 'Carnes' | etc.
  unit           string      // kg, und, bot, l, paq
  stock          number
  minStock       number
  cost           number      // último costo del proveedor favorito
  supplierId     string | null
  createdAt      timestamp
```

### 1.3 Precios por Proveedor

```
branches/{branchId}/logistics/prices/{ingredientId}/{supplierId}
  cost           number
  updatedAt      timestamp
  history        [
    { cost, date, poId, note }
  ]
```

El `cost` actual del insumo = último `prices/{ingredientId}/{favoriteSupplierId}.cost`

### 1.4 Órdenes de Compra

```
branches/{branchId}/logistics/purchaseOrders/{id}
  supplierId     string
  supplierName   string
  status         'pending' | 'sent' | 'partial' | 'received' | 'cancelled'
  items          [
    {
      ingredientId  string
      name          string
      qtyOrdered    number
      qtyReceived   number
      unit          string
      unitCost      number
      lineTotal     number
    }
  ]
  totalAmount    number
  sentVia        'whatsapp' | 'email' | 'manual'
  sentAt         timestamp
  receivedAt     timestamp
  createdBy      string
  createdAt      timestamp
  notes          string
```

### 1.5 Recetas (BOM)

```
branches/{branchId}/logistics/recipes/{id}
  productId      string
  productName    string
  yield          number      // porciones que rinde
  ingredients    {
    ingredientId  {
      name      string
      quantity  number
      unit      string
      unitCost  number
    }
  }
  costPerPortion  number    // auto-calculado
  createdAt       timestamp
  updatedAt       timestamp
```

### 1.6 Kardex (Movimientos)

```
branches/{branchId}/logistics/movements/{id}
  ingredientId   string
  type           'entrada' | 'salida' | 'consumo' | 'merma' | 'ajuste'
  quantity       number
  unit           string
  stockBefore    number
  stockAfter     number
  reason         string
  reference      string    // PO-xxx | ORDER-xxx | ADJ-xxx
  createdBy      string
  createdAt      timestamp
```

### 1.7 Mermas

```
branches/{branchId}/logistics/waste/{id}
  ingredientId   string
  quantity       number
  unit           string
  reason         string
  requiresApproval boolean
  approvedBy     string | null
  approvedAt     timestamp | null
  createdBy      string
  createdAt      timestamp
```

### 1.8 Productos (existente — extender)

```
branches/{branchId}/catalog/products/{id}
  // ... campos existentes ...
  trackStock     boolean
  stock          number
  // NUEVOS:
  hasRecipe      boolean   // auto-detectado si existe receta
  cogs           number    // auto-calculado desde receta
  margin         number    // auto-calculado
  availableServings number // min(insumo_stock / qty_por_receta)
```

### 1.9 Finanzas — Gastos extendido

```
branches/{branchId}/finanzas/gastos/{id}
  // ... campos existentes (description, amount, category, date) ...
  source         {       // null = manual
    type: 'cogs' | 'purchase' | 'waste' | 'inventory_adjustment'
    refId: string       // orderId | poId | wasteId
    refDescription: string
  }
```

---

## 2. Interconexiones (Flujo de Datos)

### 2.1 Flujo de Compras

```
Crear Proveedor → Asignar categorías
         ↓
Definir Precios por Insumo
         ↓
Crear OC con items del proveedor
         ↓
Enviar OC (WhatsApp / Email)
         ↓
Recibir parcial/totalmente
         ↓
  ┌──────┴──────┐
  │             │
  ├→ Actualiza stock del insumo
  ├→ Registra movimiento entrada en Kardex
  ├→ Actualiza costo del insumo (si cambió)
  └→ Crea gasto automático en Finanzas
```

### 2.2 Flujo de Producción

```
Crear Insumo ← Proveedor
     ↓
Crear Receta (insumos + cantidades)
     ↓
  ┌──┴──┐
  │    COGS auto-calculado (Σ insumo × cantidad / yield)
  │    Porciones disponibles (min(insumo.stock / qty_usada))
  │    Producto vinculado ← margen en tiempo real
  │
  └→ Menu Builder muestra:
       - COGS por plato
       - Margen real
       - Si tiene receta o no
       - Porciones disponibles
```

### 2.3 Flujo de Ventas → Consumo

```
Pedido confirmado (pagado)
     ↓
  ¿Producto tiene receta?
     ├── Sí → registerMovement('consumo', cada insumo)
     │         → Kardex: salida por consumo
     │         → COGS: se acumula para Finanzas
     │         → Stock: disponible se descuenta
     │
     └── No → product.stock-- (como hoy)
```

### 2.4 Flujo Financiero

```
Período (día / mes / año)
     ↓
Ingresos ← Σ(pedidos pagados)
     ↓
COGS ← Σ(insumos consumidos en pedidos × costo)
     ↓
Gastos ← manuales (planilla, alquiler, servicios)
       ← automáticos (OC recibidas, mermas)
     ↓
Ganancia real = Ingresos - COGS - Gastos
Valor inventario = Σ(stock actual × costo unitario)
```

### 2.5 Event Bus (pub/sub)

```
Eventos publicados:
  inventory.stock.low      → { ingredientId, stock, minStock }
  inventory.consumed       → { orderId, recipeId, ingredients[] }
  inventory.waste          → { wasteId, ingredientId, quantity }
  po.received              → { poId, totalAmount, items[] }
  po.created               → { poId, supplierId, totalAmount }

Suscrito por:
  Dashboard → actualiza KPIs y alertas
  Finanzas  → crea gasto automático
  Bot Telegram → notifica (stock bajo, OC)
  n8n → workflows (proyección, reportes)
```

---

## 3. Estructura UI

### 3.1 Menú de Logística (navegación)

```
Logística Hub
├── Dashboard 🏠       ← KPIs, alertas, gaps
├── Insumos 📦          ← CRUD + stock + precios
├── Recetas 🧾          ← BOM + COGS + disponible
├── Proveedores 🏭      ← CRUD + tipos doc + plazos
├── Compras 📋          ← OC + enviar + recibir
├── Kardex 📊           ← movimientos + filtros
├── Mermas 🗑️          ← registro + aprobación
└── COGS 💰            ← costos por producto
```

### 3.2 Dashboard Logística

```
┌─────────────────────────────────────────────┐
│ 🏠 DASHBOARD LOGÍSTICA                      │
├─────────────────────────────────────────────┤
│ Valor inventario     │ S/ 4,230.50          │
│ OC pendientes        │ 3                    │
│ Stock bajo           │ 5                    │
│ Productos sin receta │ 12 ⚠️               │
├─────────────────────────────────────────────┤
│ 🔔 ALERTAS                                  │
│ • Pollo → stock bajo (2.5 kg / min 5 kg)    │
│ • Leche → stock bajo (1 und / min 3 und)    │
│ • OC #003 → 3 días sin recibir              │
├─────────────────────────────────────────────┤
│ 📊 PRODUCTOS SIN RECETA                     │
│ • Lomo Saltado — S/ 28.00 → sin receta      │
│ • Ceviche — S/ 32.00 → sin receta           │
├─────────────────────────────────────────────┤
│ 🏭 CUENTAS POR PAGAR                        │
│ • Julio Sernaque — S/ 350.00 — vence 20/07 │
│ • Avícola — S/ 180.00 — vence 22/07        │
└─────────────────────────────────────────────┘
```

### 3.3 Integración en Menu Builder

Cada producto muestra en línea:
```
┌──────────────────────┐
│ Lomo Saltado        │
│ S/ 28.00            │
│ COGS: S/ 11.50     │ ← nuevo
│ Margen: 58.9% ✅    │ ← nuevo
│ 🧾 Tiene receta     │ ← nuevo
│ Disponible: 24 porc │ ← nuevo
└──────────────────────┘
```

### 3.4 Integración en Finanzas

```
Gastos
├── Manuales (planilla, alquiler, servicios, marketing)
│     → S/ 4,200.00 (usuario los ingresa, como hoy)
│
├── Automáticos (desde logística)
│     → COGS: S/ 2,850.00 ← consumo de insumos
│     → Compras: S/ 1,200.00 ← OC recibidas
│     → Mermas: S/ 85.00 ← desperdicios
│
└── Total Gastos: S/ 8,335.00

Valor inventario: S/ 4,230.50 ← nuevo KPI
```

---

## 4. Proveedores — Funcionalidad Completa

### 4.1 Tipos de Documento

| Tipo | Comprobante | Afectación Fiscal |
|------|-------------|-------------------|
| `formal` | Factura (RUC) | Crédito fiscal válido |
| `semiformal` | Boleta (RUC/DNI) | Gasto deducible |
| `informal` | Recibo simple | No deducible |

En Finanzas se filtra por tipo de comprobante para cálculo de impuestos.

### 4.2 Envío de OC por WhatsApp

```
Botón "Enviar por WhatsApp" en OC:
1. Genera texto formateado:
   ┌─────────────────────────────┐
   │ 🛒 *Pedido N° 004*          │
   │ 📅 18/07/2026               │
   │ 🏭 *Proveedor: Avícola El   │
   │    Pollón*                   │
   │                             │
   │ *Items:*                    │
   │ 🥩 Pollo 5kg x S/ 11.00     │
   │    = S/ 55.00               │
   │ 🥚 Huevos 2x1kg x S/ 6.00   │
   │    = S/ 12.00               │
   │                             │
   │ *Total: S/ 67.00*           │
   │                             │
   │ ¿Confirman disponibilidad?  │
   └─────────────────────────────┘
2. Abre wa.me/51{telefono}?text={encoded}
3. Marca OC como "sent" + sentAt + resultado
```

### 4.3 Manejo de Cambios de Precio

Al recibir OC parcial/total:
- `unitCost` ingresado en la OC
- Si difiere del `cost` actual del insumo:
  - Sistema: "El precio de Pollo cambió de S/ 10.00 a S/ 11.00. ¿Actualizar?"
  - Sí → guarda nuevo `cost` + histórico
  - No → mantiene precio anterior

### 4.4 Portal de Precios (Futuro, no hacer ahora)

Link público donde el proveedor ve sus insumos asignados y actualiza precios. Sin login — protegido por token en URL. Pospuesto para fase 2.

---

## 5. Plan de Implementación por Fases

### Fase 1 — Fundación (Prioridad Alta)

| # | Tarea | Archivos | Depende de |
|---|-------|----------|------------|
| 1.1 | Supplier CRUD completo (tipo doc, plazo, categorías) | `LogisticsTab.jsx`, `logisticsService.js` | — |
| 1.2 | Precios por proveedor + historial de cambios | `logisticsService.js`, `LogisticsTab.jsx` | 1.1 |
| 1.3 | Dashboard Logística (KPIs, alertas, gaps) | `LogisticsTab.jsx` (nueva sección) | 1.1, 1.2 |
| 1.4 | COGS + margen en Menu Builder | `MenuItemRow.tsx`, `MenuTab.tsx` | — |
| 1.5 | Porciones disponibles en producto | `logisticsService.js` (getAvailableServings) | — |
| 1.6 | Productos sin receta — detección y badge | `LogisticsTab.jsx`, `MenuTab.tsx` | — |

### Fase 2 — Conexiones Automáticas (Prioridad Alta)

| # | Tarea | Archivos | Depende de |
|---|-------|----------|------------|
| 2.1 | Auto-consumo al confirmar pedido | `ordersService.js` + `logisticsService.js` | 1.4 |
| 2.2 | Event-bus para eventos de inventario (stock bajo, consumo) | `logisticsService.js` | 2.1 |
| 2.3 | Alerta visual de stock bajo en Dashboard | `LogisticsTab.jsx` | 2.2 |
| 2.4 | Envío de OC por WhatsApp | `LogisticsTab.jsx` (nuevo modal) | 1.1 |

### Fase 3 — Finanzas + Reporting (Prioridad Media)

| # | Tarea | Archivos | Depende de |
|---|-------|----------|------------|
| 3.1 | COGS automático → gasto en Finanzas (por período) | `logisticsService.js`, `FinanzasTab.jsx` | 2.1 |
| 3.2 | OC recibida → gasto automático | `logisticsService.js`, `FinanzasTab.jsx` | 1.1 |
| 3.3 | Mermas como gasto en Finanzas | `logisticsService.js`, `FinanzasTab.jsx` | — |
| 3.4 | Valor inventario como KPI en Finanzas | `FinanzasTab.jsx`, `logisticsService.js` | 1.2 |
| 3.5 | Ganancia real en Dashboard + Finanzas | `DashboardTab.jsx`, `FinanzasTab.jsx` | 3.1-3.4 |
| 3.6 | Proyección de compras (ventas × recetas) | `logisticsService.js`, `LogisticsTab.jsx` | 2.1 |

### Fase 4 — Mermas + Ajustes (Prioridad Media)

| # | Tarea | Archivos | Depende de |
|---|-------|----------|------------|
| 4.1 | Registro de mermas con motivos | `LogisticsTab.jsx`, `logisticsService.js` | — |
| 4.2 | Aprobación opcional de mermas | `LogisticsTab.jsx` | 4.1 |
| 4.3 | Ajustes de inventario (+/-) con razón | `LogisticsTab.jsx` | — |

### Fase 5 — Mejoras Pro (Prioridad Baja)

| # | Tarea | Archivos | Depende de |
|---|-------|----------|------------|
| 5.1 | Portal público de precios para proveedores | App separada o ruta pública | 1.2 |
| 5.2 | Cuentas por pagar (deuda por proveedor) | `FinanzasTab.jsx` | 3.2 |
| 5.3 | Reporte de rotación de insumos | `LogisticsTab.jsx` | 1.6 |
| 5.4 | Exportar reportes a PDF/Excel | `LogisticsTab.jsx`, `FinanzasTab.jsx` | — |
| 5.5 | Notificaciones push de stock bajo | `logisticsService.js` + FCM | 2.2 |

---

## 6. Decisiones Técnicas

| Decisión | Opción | Por qué |
|----------|--------|---------|
| **Precios** | Por proveedor, no global | Un mismo insumo puede costar distinto según proveedor |
| **Costo actual** | Último precio del proveedor favorito | Siempre refleja el último precio pagado |
| **Historial precios** | Array en `prices/{ingredientId}/{supplierId}/history` | No over-engineering, un array alcanza |
| **Auto-consumo** | Al confirmar pedido (pagado) | Momento correcto: el ingreso ya está registrado |
| **Reversión** | Opcional al cancelar pedido | No siempre querés revertir (si ya se usó) |
| **Portal proveedores** | Pospuesto | WhatsApp es más efectivo para el contexto peruano |
| **Gastos finanzas** | Source field con tipo + referencia | Trazabilidad completa sin duplicar datos |

---

## 7. Restricciones y No-Alcance

- **No** se modifican flujos existentes de pedidos (solo se agregan hooks post-confirmación)
- **No** se requiere migración de datos existentes
- **No** se construye portal de proveedores (futuro)
- **No** se integra con SUNAT/contabilidad externa
- **No** se maneja inventario multi-sucursal (solo monteverde)
- Stock bajo en productos sin receta sigue funcionando como hoy (trackStock)
