# Análisis de Ecosistemas — House-Portal-OS

> Documentación del estado actual y plan de reorganización de los 5 dominios principales de la app `house-menu`.

---

## Estado Actual

### 1. Customer / Menú (`src/customer/`) ✅
- **Status:** Organizado
- **Ruta:** `/` (público)
- **Componentes:** 7 en `src/customer/components/`
- **Estado:** `@house/store` (carrito), `useState` local
- **Acción:** Solo pulir si es necesario

### 2. KDS (Kitchen Display System) (`src/kds/`) ✅
- **Status:** Refactorizado (Mayo 2026)
- **Ruta:** `/cocina` (auth: kitchen)
- **Componentes:** 21 en `src/kds/components/`
- **Hooks:** 7 en `src/kds/hooks/`
- **Stores:** 3 Zustand (`orderStore`, `timerStore`, `kdsEvents`)
- **Data:** `orderSubscription.js` (delta subs)
- **Arquitectura:** Zustand + delta subs + CM design
- **Nota:** KanbanTicket y KanbanColumn aún viven en `src/components/` — deberían migrar a KDS

### 3. Dispatch / Delivery ❌ — Fragmentado
- **Ruta:** `/despacho` (auth: dispatch)
- **Problema:** Código repartido en 5 ubicaciones

  | Ubicación | Archivo | Responsabilidad |
  |-----------|---------|-----------------|
  | `src/pages/` | `DispatchView.jsx` (483 lines) | Monolito, usa `onValue` legacy |
  | `src/kds/components/` | `DeliveryPanel.jsx` | Handoff cocina → delivery |
  | `src/admin/components/` | `DeliveryManager.jsx` | CRUD drivers + zonas |
  | `src/components/` | `CartDrawer.jsx` | Cálculo tarifas por zona |
  | `src/lib/` | `deliveryService.js` | Capa de datos Firebase |

- **Estado:** Sin store dedicado, sin delta subs, UI inconsistente

### 4. Admin Hub (`src/admin/`) ⚠️
- **Status:** Tiene directorio pero sin store
- **Ruta:** `/admin` (auth: admin)
- **Tabs:** 7+ (Dashboard, Orders, Menu, Inventory, Caja, Multibranch, Sucursales, Delivery, Fiscal, Users)
- **Estado:** Todo `useState` local, sin Zustand, sin delta subs
- **Componentes:** 10+ en `src/admin/components/` + `menu-builder/`
- **Nota:** Pesado pero no fragmentado; sería el siguiente después de Dispatch

### 5. Order Tracker (`src/pages/OrderTracker.jsx`) ⚠️
- **Ruta:** `/rastreo` (público)
- **Estado:** Un solo archivo, usa `onValue` legacy
- **Acción:** Migrar a delta subs, extraer componentes si crece

### Shared Components (`src/components/`)
- **KanbanTicket.jsx** y **KanbanColumn.jsx** son 100% KDS pero están acá
- **CartDrawer.jsx** es 100% Customer pero tiene lógica de delivery (zonas)
- **ChatWindow.jsx**, **EmptyState.jsx**, etc. son genuinamente compartidos

---

## Prioridades de Reorganización

| Prioridad | Ecosistema | Esfuerzo | Impacto |
|-----------|-----------|----------|---------|
| P1 | **Dispatch/Delivery** → `src/dispatch/` | 3-4h | Alto (elimina fragmentación) |
| P2 | **Admin Hub** → stores por dominio | 5-6h | Medio (estabilidad) |
| P3 | **Order Tracker** → delta subs | 1h | Bajo |
| P4 | Mover KanbanTicket/Column a `src/kds/` | 30min | Mantenibilidad |
| P5 | **Customer** → store dedicado (opcional) | 2h | Bajo |

---

## Arquitectura Propuesta: `src/dispatch/`

> Misma estructura y patrones que `src/kds/`

```
src/dispatch/
├── store/
│   ├── deliveryStore.js        # Zustand: drivers, en_camino, logs
│   └── dispatchEvents.js       # Constantes de eventos
├── hooks/
│   ├── useDispatchOrders.js    # Orders listo + en_camino desde orderStore
│   ├── useDrivers.js           # Suscripción delta a drivers
│   └── useDeliveryZones.js     # Suscripción delta a zonas
├── components/
│   ├── DispatchBoard.jsx       # Vista principal (reemplaza DispatchView)
│   ├── DriverCard.jsx          # Card de repartidor con status
│   ├── DriverAssignModal.jsx   # Asignar driver a pedido
│   ├── ConfirmDeliveryModal.jsx# Confirmar entrega
│   ├── ReadyOrderCard.jsx      # Pedido listo para recoger
│   ├── RouteOrderCard.jsx      # Pedido en ruta
│   ├── DeliveryStats.jsx       # KPIs en vivo
│   └── DeliveryMap.jsx         # (futuro) mapa de entregas
├── data/
│   └── deliverySubscription.js # Delta subs para drivers/zones/logs
└── dispatchTypes.js            # Constants + configs
```

### Mejoras vs el monolitico actual
- **Zustand store** con estado de drivers, pedidos activos, zonas
- **Delta subscriptions** (onChild*) en lugar de onValue
- **Componentes extraíbles** — DriverCard, AssignModal, ConfirmModal reutilizables
- **Undo** para asignaciones/desasignaciones
- **Live KPIs** — drivers activos, en ruta, tiempo promedio
- **Mismo diseño CM** que el KDS

### Migración de `DispatchView.jsx`
1. Crear `deliveryStore.js` (Zustand) con slices: drivers, activeOrders, zones, logs
2. Crear `deliverySubscription.js` (delta subs para drivers y zonas)
3. Extraer `DispatchBoard.jsx` como nuevo entry point
4. Extraer `DriverCard.jsx`, `DriverAssignModal.jsx`, `ConfirmDeliveryModal.jsx`
5. Extraer `ReadyOrderCard.jsx`, `RouteOrderCard.jsx`
6. Extraer `DeliveryStats.jsx`
7. Actualizar `DispatchView.jsx` para que solo sea un wrapper o eliminarlo
8. Migrar `DeliveryPanel.jsx` (KDS) para que consuma `deliveryStore`
9. Mantener `DeliveryManager.jsx` (Admin) como está o migrarlo después

### Dependencias entre módulos
- `src/dispatch/` → consume `orderStore` de KDS (pedidos listos)
- `src/kds/DeliveryPanel.jsx` → debería consumir `deliveryStore`
- `src/admin/DeliveryManager.jsx` → comparte `deliveryService.js`
- `src/lib/deliveryService.js` → se mantiene como capa de datos, ambos módulos lo usan

---

---

## ⚡ Proyecto AynI — Exoesqueleto Digital (Visión)

> Ver manifiesto completo en `docs/aynI-manifiesto.md`

**AynI** es una capa operativa para la economía informal latinoamericana. Una extensión inteligente que convierte cualquier negocio en un sistema digital autogestionado.

**Fases propuestas:**
1. **Semilla** — Catálogo + WhatsApp + QR (MVP inmediato)
2. **Crecimiento** — IA asistente + delivery + wallet multi-moneda
3. **Red** — Marketplace P2P + microcréditos + red descentralizada
4. **Sistema nervioso** — Agente semiautónomo + blockchain + movilidad

**Arquitectura objetivo:**
```
ayn-i/
├── apps/mobile/          # React Native (Android Play Store)
├── packages/core/        # IA engine, blockchain identity
├── packages/merchant/    # Catálogo, ventas, CRM
├── packages/payments/    # Wallet fiat + crypto
├── packages/delivery/    # Logística + tracking
├── packages/social/      # Feed + contenido
├── packages/mobility/    # Viajes + rutas
└── design/               # Brand: casita, sol, reloj, animación
```

**Animación identidad:** Una casita en una loma con un sol que gira encima haciendo su ciclo de rotación natural, y un reloj marcando la hora — el ciclo del trabajo diario del emprendedor.

**Para retomar:** Decir "retomamos AynI" al agente.

---

## Notas para retomar

Cuando se retome este trabajo, ejecutar:

```bash
# 1. Revisar estado actual
git status
git log --oneline -5

# 2. Leer documentación
cat apps/house-menu/docs/ecosistemas.md

# 3. Iniciar
# Decir: "retomamos el módulo dispatch"
```

### Checklist de retorno
- [ ] Leer `ecosistemas.md`
- [ ] Leer `DispatchView.jsx` actual
- [ ] Revisar `deliveryService.js`
- [ ] Verificar que `src/kds/` está estable (build OK)
- [ ] Arrancar con `deliveryStore.js`
