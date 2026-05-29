# Migration Priority — Orden de Ejecución

## Secuencia óptima

Cada "ronda" = 1 sprint de diseño/implementación. Se priorizan las vistas P1 más la app más crítica (house-menu).

### Ronda 1 — house-menu core
1. Customer View (Card Grid + Form Wizard) → la cara del negocio
2. Admin Dashboard (Dashboard) → métricas diarias
3. Admin Pedidos (List/DataTable) → operación diaria
4. Kitchen KDS (Kanban Board) → cocina en tiempo real
5. Admin Caja (Dashboard) → flujo de caja

### Ronda 2 — sorteos + househub
6. Sorteos Home (Dashboard + Card Grid) → landing pública
7. Sorteos List (Card Grid) → explorar sorteos
8. Sorteo Detail (Detail View) → compra/participación
9. Sorteos Admin (Dashboard + List) → gestión
10. househub Dashboard (Dashboard) → control center

### Ronda 3 — secundarias P1
11. 26play Lobby (Game Phase)
12. 26play Playing (Game Phase)
13. worker-portal Dashboard (Dashboard)

### Ronda 4 — P2
14-26: Resto de vistas P2

### Ronda 5 — P3
27-45: Vistas P3 (cleaning, laundry, etc.)

## Criterios de priorización

| Criterio | Peso |
|----------|------|
| Impacto en usuarios | Alto |
| Frecuencia de uso | Alto |
| Complejidad técnica | Medio |
| Dependencia de otras vistas | Medio |
| Valor de negocio | Alto |

## Por qué house-menu primero

1. Es la app con más tráfico real
2. Tiene más vistas (14) que cualquier otra app
3. Sus vistas cubren casi todos los patrones (Card Grid, Kanban, Form/Wizard, Dashboard, List/DataTable, Detail View)
4. Lo que aprendamos en house-menu se aplica directamente a las demás apps
