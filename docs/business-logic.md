# Lógica de Negocio y Flujos

## Apps de Restaurante

### house-menu
- **Producto**: Almuerzos premium personalizables (Arma tu Causa, Arma tu Fit, Promos del Día).
- **Flujo**: Usuario navega menú → personaliza plato → checkout → orden enviada a Firebase → Cocina Watcher procesa.
- **Pago**: Contraentrega / Yape / Plin (manual).
- **Gamificación**: Proceso de orden con visuals premium.

### house-cleaning / house-laundry
- **Producto**: Servicios de limpieza y lavandería.
- **Flujo**: Usuario selecciona servicio → agenda fecha/hora → pago → asignación a trabajador → confirmación.
- **Datos**: Firebase RTDB con branches.

### housepysbot (AI Bot)
- **Dos agentes**: Atención al Cliente (Telegram público) y Admin (Telegram restringido por chat ID).
- **Flujo**: Mensaje Telegram → router (admin vs customer según chat ID) → agente AI (OpenRouter) → tools (Firebase CRUD) → respuesta.
- **Tools**: 30+ herramientas: menú CRUD, órdenes, stock, delivery, caja, facturación SUNAT, riders.
- **Watchers**: Cocina Watcher (monitorea órdenes nuevas), Monitor (health check cada 60s), Telemetría (heartbeat cada 30s).

## Apps de Entretenimiento

### 26play
- **Mecánica**: Juego de 26 preguntas con niveles de intensidad 1-3.
- **Modos**: Pareja vs Grupo. Retos exclusivos por modo.
- **Seguridad**: SafetyTags (`physical`, `intimate`) bloqueables; modo "Soft" filtra tags.

### sorteos-automaticos
- **Flujo de Sorteos**: Usuario elige premio → pago Yape/Plin → IA (verifyVoucher) valida → contrato inteligente (Solayni) emite ticket → sorteo automático al 100% de tickets vendidos o fecha límite.
- **Blockchain**: Solayni para inmutabilidad de tickets.
- **KPIs**: Cero duplicados de voucher, transparencia blockchain en UI.

## Apps de Administración

### househub
- **Dashboard central**: Vista general del negocio, analytics, gráficos (Recharts).
- **Firebase Auth**: Autenticación de usuarios.

### worker-portal
- **Portal de trabajadores**: Gestión de turnos, tareas asignadas, estado online/offline.
- **UI**: Badges para estado (online/pending), stat-cards con gradientes.

### portal-hub
- **Vanilla dashboard**: Vista simple de enlaces a todas las apps. Página de inicio del ecosistema.
---