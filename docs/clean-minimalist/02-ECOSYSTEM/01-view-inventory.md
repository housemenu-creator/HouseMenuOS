# View Inventory — Mapa Completo del Ecosistema

## house-menu (food ordering + admin)

| Vista | Ruta | Patrón | Prioridad | Status |
|-------|------|--------|-----------|--------|
| Customer View | `/` | Card Grid + Form Wizard | **P1** | Pendiente |
| Order Tracker | `/rastreo` | Detail View | P3 | Pendiente |
| Kitchen KDS | `/cocina` | Kanban Board | **P1** | Pendiente |
| Dispatch | `/despacho` | Kanban Board | P3 | Pendiente |
| Admin — Dashboard | `/admin?tab=dashboard` | Dashboard | **P1** | Pendiente |
| Admin — Pedidos | `/admin?tab=orders` | List/DataTable | **P1** | Pendiente |
| Admin — Menú | `/admin?tab=menu` | List/DataTable + Form | P2 | Pendiente |
| Admin — Inventario | `/admin?tab=inventory` | List/DataTable | P2 | Pendiente |
| Admin — Caja | `/admin?tab=caja` | Dashboard | **P1** | Pendiente |
| Admin — Multisucursal | `/admin?tab=multibranch` | Dashboard | P3 | Pendiente |
| Admin — Sucursales | `/admin?tab=sucursales` | List/DataTable | P3 | Pendiente |
| Admin — Delivery | `/admin?tab=delivery` | Kanban Board | P2 | Pendiente |
| Admin — Facturación | `/admin?tab=fiscal` | List/DataTable | P2 | Pendiente |
| Admin — Usuarios | `/admin?tab=users` | List/DataTable | P3 | Pendiente |

## househub (control center)

| Vista | Ruta | Patrón | Prioridad | Status |
|-------|------|--------|-----------|--------|
| Dashboard | `/` | Dashboard | **P1** | Pendiente |
| Logs | `/logs` | Conversation | P2 | Pendiente |
| Conversations | `/conversations` | Conversation | P2 | Pendiente |
| MCP Explorer | `/explorer` | List/DataTable | P3 | Pendiente |
| Cocina Mode | `/cocina` | Kanban Board | P3 | Pendiente |
| Terminal | `/terminal` | Conversation | P2 | Pendiente |

## worker-portal (worker area)

| Vista | Ruta | Patrón | Prioridad | Status |
|-------|------|--------|-----------|--------|
| Dashboard | `/` | Dashboard | **P1** | Pendiente |
| Orders Today | `/orders` | List/DataTable | P2 | Pendiente |
| Ranking | `/ranking` | List/DataTable | P3 | Pendiente |
| Settings | `/settings` | Single Page Service | P3 | Pendiente |

## 26play (game)

| Fase | Fase (state) | Patrón | Prioridad | Status |
|------|-------------|--------|-----------|--------|
| Lobby | `LOBBY` | Game Phase | **P1** | Pendiente |
| Safety Quiz | `SETUP` | Game Phase | P2 | Pendiente |
| Playing | `PLAYING` | Game Phase | **P1** | Pendiente |
| Proposal | `PROPOSE_END` | Game Phase | P3 | Pendiente |
| Summary | `SUMMARY` | Game Phase | P3 | Pendiente |

## sorteos-automaticos (raffle system)

| Vista | Ruta | Patrón | Prioridad | Status |
|-------|------|--------|-----------|--------|
| Home | `/` | Dashboard + Card Grid | **P1** | Pendiente |
| Sorteos | `/sorteos` | Card Grid | **P1** | Pendiente |
| Sorteo Detail | `/sorteos/:id` | Detail View | **P1** | Pendiente |
| Verificar Voucher | `/verificar` | Form/Wizard | P2 | Pendiente |
| Perfil | `/perfil` | Detail View | P3 | Pendiente |
| Mis Aynis | `/mis-aynis` | Dashboard | P3 | Pendiente |
| Mis Tickets | `/mis-tickets` | List/DataTable | P2 | Pendiente |
| Auth | `/auth` | Form/Wizard | P2 | Pendiente |
| Admin | `/admin` | Dashboard + List/DataTable | **P1** | Pendiente |

## house-cleaning (cleaning mgmt)

| Vista | Tab | Patrón | Prioridad | Status |
|-------|-----|--------|-----------|--------|
| Turnos | turnos | Single Page Service | P3 | Pendiente |
| Checklist | checklist | Single Page Service | P3 | Pendiente |
| Stock | insumos | Single Page Service | P3 | Pendiente |

## house-laundry (laundry mgmt)

| Vista | Tab | Patrón | Prioridad | Status |
|-------|-----|--------|-----------|--------|
| Tickets Pipeline | tickets | Single Page Service | P3 | Pendiente |
| Registrar Carga | registro | Single Page Service | P3 | Pendiente |
| Insumos/Bitácora | insumos | Single Page Service | P3 | Pendiente |

## portal-hub (launcher)

| Vista | Patrón | Prioridad | Status |
|-------|--------|-----------|--------|
| Dashboard Ayni | Dashboard (launcher) | P2 | Pendiente |

## Totales

| App | Vistas | P1 | P2 | P3 |
|-----|--------|----|----|----|
| house-menu | 14 | 5 | 4 | 5 |
| househub | 6 | 1 | 3 | 2 |
| worker-portal | 4 | 1 | 1 | 2 |
| 26play | 5 | 2 | 1 | 2 |
| sorteos-automaticos | 9 | 4 | 3 | 2 |
| house-cleaning | 3 | 0 | 0 | 3 |
| house-laundry | 3 | 0 | 0 | 3 |
| portal-hub | 1 | 0 | 1 | 0 |
| **Total** | **45** | **13** | **13** | **19** |
