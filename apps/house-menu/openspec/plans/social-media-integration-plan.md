# Plan de Implementación: Módulo de Redes Sociales + Automatización Marketing

## Overview

Conectar House Menu con Instagram, Facebook y WhatsApp para publicar contenido, programar campañas y medir resultados — todo desde el admin. El módulo actual ya genera copy con IA y gestiona campañas/banners; esto agrega la capa de **publicación real** y **analítica**.

## Architecture Decisions

| Decisión | Rationale |
|----------|-----------|
| **Meta Business API via Cloud Functions** | El App Secret de Meta no puede estar en el frontend. Cloud Functions actúa como proxy. |
| **OAuth flow en frontend + server** | El user autoriza desde el admin, el server intercambia el code por long-lived tokens |
| **RTDB para almacenar conexiones** | Misma infra que el resto del proyecto. Tokens encriptados en `branches/{branchId}/social_connections/` |
| **Cron jobs para programar posts** | onSchedule en Cloud Functions para publicar contenido en fecha/hora programada |
| **Campaña → Post automático (opt-in)** | Al crear campaña, checkbox "Publicar en redes" genera copy + agenda post automático |

---

## Phase 0: Meta Business OAuth — Conexión de Cuentas

**Objetivo:** Permitir al usuario conectar Instagram Business + Facebook Page desde el admin.

### Task 0.1: Backend — Cloud Functions OAuth handler

**Description:** Crear funciones server-side para manejar el flujo OAuth de Meta. Intercambia el code de autorización por access tokens, los refresca automáticamente, y los almacena en RTBD.

**Acceptance criteria:**
- [ ] `exchangeMetaAuthCode(code, branchId)` — intercambia code por long-lived access token
- [ ] `refreshMetaToken(branchId, platform)` — refresca token cuando expira (validez 60 días)
- [ ] `revokeMetaConnection(branchId, platform)` — revoca token y limpia datos
- [ ] Tokens almacenados en `branches/{branchId}/social_connections/{platform}`
- [ ] Logging completo de cada paso

**Dependencies:** None

**Files likely touched:**
- `apps/house-menu/functions/src/social/meta-oauth.js` (new)
- `apps/house-menu/functions/src/index.js` (register functions)
- `apps/house-menu/functions/package.json` (add `node-fetch` or use native fetch)

**Estimated scope:** Medium (3-4 files)

### Task 0.2: Frontend — Social Connection Manager UI

**Description:** Nueva sección "Conexiones" en el módulo de Marketing. Muestra el estado de cada plataforma (conectado/desconectado), botón "Conectar Instagram", "Conectar Facebook", "Conectar WhatsApp". Inicia el flujo OAuth con Meta.

**Acceptance criteria:**
- [ ] Botón "Conectar Instagram Business" abre popup OAuth de Meta
- [ ] Botón "Conectar Facebook Page" abre popup OAuth
- [ ] Estado visual: conectado (verde) / desconectado (gris) / expirado (amarillo)
- [ ] Botón "Desconectar" revoca el token
- [ ] Fecha de expiración del token visible
- [ ] Loader durante la conexión
- [ ] Toast de confirmación/error

**Dependencies:** Task 0.1

**Files likely touched:**
- `src/admin/tabs/MarketingTab.jsx` (add "Conexiones" sub-tab)
- `src/admin/components/marketing/SocialConnections.jsx` (new)
- `src/lib/socialService.js` (new — frontend API client)
- `src/lib/paths.js` (add `socialConnectionsPath`)

**Estimated scope:** Large (5-6 files)

### Task 0.3: Backend — Meta App Configuration + Env Vars

**Description:** Setup de variables de entorno para la integración con Meta. Documentar los pasos necesarios en Facebook Developers.

**Acceptance criteria:**
- [ ] `META_APP_ID`, `META_APP_SECRET` configurados en Firebase Functions config
- [ ] `META_REDIRECT_URI` configurado
- [ ] Documentación de setup en `docs/meta-setup.md`
- [ ] Validación de que el OAuth flow funciona end-to-end

**Dependencies:** Task 0.1

**Files likely touched:**
- `apps/house-menu/functions/src/social/meta-config.js` (new)
- `docs/meta-setup.md` (new)
- `apps/house-menu/.env.example` (actualizar)

**Estimated scope:** Small (2-3 files)

### Task 0.4: Frontend — Instagram Preview + Feed Widget

**Description:** Mostrar un feed en vivo de las últimas publicaciones de Instagram conectado. Preview de cómo se ve el perfil.

**Acceptance criteria:**
- [ ] Muestra las últimas 6 publicaciones de Instagram
- [ ] Muestra métricas básicas: likes, comments promedio
- [ ] Estado disconnected muestra placeholder "Conectá Instagram para ver tu feed"
- [ ] Clic en publicación abre enlace a Instagram

**Dependencies:** Task 0.2

**Files likely touched:**
- `src/admin/components/marketing/InstagramFeed.jsx` (new)
- `src/lib/socialService.js` (add feed fetch)

**Estimated scope:** Medium (2-3 files)

### Checkpoint: Phase 0
- [ ] OAuth flow completo: click "Conectar" → popup Meta → autoriza → token guardado
- [ ] UI muestra estado conectado con verde
- [ ] Desconexión funciona
- [ ] Build pasa

---

## Phase 1: Publicación a Redes

**Objetivo:** Publicar el copy generado por IA directamente a Instagram y Facebook desde el admin.

### Task 1.1: Backend — Cloud Functions Content Publisher

**Description:** Función server-side que recibe contenido (imagen + texto) y lo publica en Instagram Business / Facebook Page via Meta Content Publishing API.

**Acceptance criteria:**
- [ ] `publishToInstagram(branchId, { imageUrl, caption })` publica a Instagram
- [ ] `publishToFacebook(branchId, { message, link, imageUrl })` publica a Facebook
- [ ] `publishToBoth(branchId, content)` publica simultáneamente
- [ ] Manejo de errores: token expirado, media processing, rate limits
- [ ] Registro de publicación en `branches/{branchId}/social_posts/{postId}`
- [ ] Retorna ID de la publicación de Meta

**Dependencies:** Task 0.1

**Files likely touched:**
- `apps/house-menu/functions/src/social/meta-publisher.js` (new)
- `apps/house-menu/functions/src/index.js` (register)

**Estimated scope:** Medium (2-3 files)

### Task 1.2: Frontend — Publicación desde AI Copy Generator

**Description:** Conectar el generador de copy con IA al botón de publicar. Al hacer clic en "Publicar en Instagram", se envía el contenido generado a la Cloud Function que lo publica.

**Acceptance criteria:**
- [ ] Botón "Publicar en Instagram" junto al copy generado
- [ ] Botón "Publicar en Facebook" 
- [ ] Botón "Publicar en ambas"
- [ ] Modal de confirmación antes de publicar
- [ ] Loading spinner durante la publicación
- [ ] Toast de éxito/error con link a la publicación
- [ ] Aparece en el feed de publicaciones recientes
- [ ] Deshabilitado si no hay cuentas conectadas

**Dependencies:** Task 1.1, Task 0.2

**Files likely touched:**
- `src/admin/tabs/MarketingTab.jsx` (modificar `handlePublishToFeed`)
- `src/lib/socialService.js` (add publish methods)
- `src/admin/components/marketing/PublishModal.jsx` (new)

**Estimated scope:** Medium (3-4 files)

### Task 1.3: Automatización Campaña → Post

**Description:** Al crear una campaña, checkbox "Publicar automáticamente en redes". Si está activado, genera el copy con IA y publica al activar la campaña.

**Acceptance criteria:**
- [ ] Checkbox "Publicar en Instagram/Facebook al activar" en el form de campaña
- [ ] Al hacer clic en "Crear" con el checkbox activado, se publica automáticamente
- [ ] Estado de la publicación visible en la tabla de campañas (columna "Redes")
- [ ] Se puede volver a publicar manualmente desde la campaña

**Dependencies:** Task 1.2

**Files likely touched:**
- `src/admin/tabs/MarketingTab.jsx` (modificar `handleSave`)
- `src/lib/socialService.js`

**Estimated scope:** Medium (2-3 files)

### Checkpoint: Phase 1
- [ ] Publicación a Instagram funciona end-to-end
- [ ] Publicación a Facebook funciona
- [ ] Campaña → Publicación automática funciona
- [ ] Build pasa

---

## Phase 2: Content Calendar + Scheduling

**Objetivo:** Programar contenido para redes con calendario visual.

### Task 2.1: Backend — Scheduled Posts

**Description:** Nueva entidad en RTDB para posts programados. Cloud Function cron job que cada 5 minutos revisa si hay posts para publicar y los ejecuta.

**Acceptance criteria:**
- [ ] Schema: `branches/{branchId}/scheduled_posts/{postId}` con `{ platform, content, mediaUrl, scheduledAt, status, publishedAt, error }`
- [ ] Cloud Function `processScheduledPosts` corre cada 5 minutos
- [ ] Publica posts cuyo `scheduledAt <= now && status === 'pending'`
- [ ] Actualiza status a `published` o `failed` con error message
- [ ] Notifica al usuario si falló (via notification)

**Dependencies:** Task 1.1

**Files likely touched:**
- `apps/house-menu/functions/src/social/scheduler.js` (new)
- `apps/house-menu/functions/src/index.js` (register)
- `src/lib/paths.js` (add `scheduledPostsPath`)

**Estimated scope:** Medium (3-4 files)

### Task 2.2: Frontend — Content Calendar UI

**Description:** Calendario mensual donde se ven los posts programados. Se puede hacer clic en un día para ver/crear posts. Arrastrar posts para reprogramar.

**Acceptance criteria:**
- [ ] Vista mensual con miniaturas de posts en cada día
- [ ] Clic en día vacío → abre modal "Crear Post Programado"
- [ ] Clic en post existente → abre detalle con opción de editar/eliminar
- [ ] Modal de creación: seleccionar plataforma, contenido (texto + imagen), fecha/hora
- [ ] Botón "Usar Copy de IA" que trae el generador de copy
- [ ] Loading/empty/error states en el calendario
- [ ] Vista lista además de calendario (toggle)
- [ ] Indicador de publicado vs pendiente vs fallido

**Dependencies:** Task 2.1

**Files likely touched:**
- `src/admin/components/marketing/ContentCalendar.jsx` (new)
- `src/admin/components/marketing/SchedulePostModal.jsx` (new)
- `src/admin/tabs/MarketingTab.jsx` (add "Calendario" sub-tab)
- `src/lib/socialService.js` (add schedule methods)

**Estimated scope:** Large (6-8 files)

### Task 2.3: Frontend — Post History + Analytics Feed

**Description:** Historial de todas las publicaciones realizadas con métricas de engagement (likes, comments, shares, reach) obtenidas via Meta Insights API.

**Acceptance criteria:**
- [ ] Lista cronológica de posts publicados
- [ ] Métricas: likes, comments, shares, reach, engagement rate
- [ ] Enlace a la publicación en Instagram/Facebook
- [ ] Filtro por plataforma y fecha
- [ ] Estado de carga y empty state

**Dependencies:** Task 1.1, Task 0.4

**Files likely touched:**
- `src/admin/components/marketing/PostHistory.jsx` (new)
- `src/lib/socialService.js`

**Estimated scope:** Medium (3-4 files)

### Checkpoint: Phase 2
- [ ] Calendario muestra posts programados
- [ ] Crear post programado → se agenda → se publica en fecha
- [ ] Historial muestra métricas de posts publicados
- [ ] Build pasa

---

## Phase 3: Analytics + Insights (Extra)

**Objetivo:** Dashboard de métricas de redes sociales conectado a Meta Insights API.

### Task 3.1: Backend — Meta Insights Fetcher

**Description:** Cloud Function que corre diariamente y trae métricas de las cuentas conectadas. Almacena en RTDB para consumo del frontend.

**Acceptance criteria:**
- [ ] `fetchInstagramInsights(branchId)` — followers, reach, profile_views, etc.
- [ ] `fetchFacebookInsights(branchId)` — page_impressions, page_engagement, etc.
- [ ] Almacena en `branches/{branchId}/social_insights/{platform}/{date}`
- [ ] Cron job diario a las 8 AM

**Dependencies:** Task 0.1

**Files likely touched:**
- `apps/house-menu/functions/src/social/insights.js` (new)
- `apps/house-menu/functions/src/index.js`

**Estimated scope:** Medium (2-3 files)

### Task 3.2: Frontend — Social Analytics Dashboard

**Description:** Visualización de métricas de redes sociales con gráficos. Seguidores, alcance, engagement semanal, mejores posts.

**Acceptance criteria:**
- [ ] KPIs: followers total, reach semanal, engagement rate, profile views
- [ ] Gráfico de línea: evolución de seguidores (7/30 días)
- [ ] Top 5 posts con mejor engagement
- [ ] Comparativa Instagram vs Facebook
- [ ] Periodo selector: 7d, 30d, 90d
- [ ] Loading/empty states

**Dependencies:** Task 3.1

**Files likely touched:**
- `src/admin/components/marketing/SocialAnalytics.jsx` (new)
- `src/admin/tabs/MarketingTab.jsx`
- `package.json` (add chart library: recharts o similar)

**Estimated scope:** Medium (3-4 files)

### Checkpoint: Phase 3
- [ ] Dashboard muestra KPIs reales de Meta
- [ ] Gráficos funcionales
- [ ] Build pasa

---

## Phase 4: WhatsApp Business Integration (Extra)

**Objetivo:** Enviar promociones y confirmaciones via WhatsApp directo a clientes.

### Task 4.1: Backend — WhatsApp Cloud API

**Description:** Integración con WhatsApp Business Cloud API para enviar mensajes template a clientes.

**Acceptance criteria:**
- [ ] `sendWhatsAppTemplate(branchId, { to, templateName, parameters })` envía template
- [ ] Webhook handler para recibir delivery receipts
- [ ] Almacena historial de mensajes
- [ ] Manejo de rate limits

**Dependencies:** Task 0.1 (misma app de Meta)

**Files likely touched:**
- `apps/house-menu/functions/src/social/whatsapp.js` (new)
- `apps/house-menu/functions/src/index.js`

**Estimated scope:** Medium (2-3 files)

### Task 4.2: Frontend — WhatsApp Campaign Sender

**Description:** UI para seleccionar segmento de clientes y enviar promoción por WhatsApp.

**Acceptance criteria:**
- [ ] Selector de segmento: todos / por tier / nuevos / inactivos
- [ ] Previsualización del mensaje template
- [ ] Botón "Enviar a [N] clientes" con confirmación
- [ ] Historial de envíos con estadísticas (enviados, fallidos, leídos)

**Dependencies:** Task 4.1

**Files likely touched:**
- `src/admin/components/marketing/WhatsAppSender.jsx` (new)
- `src/admin/tabs/MarketingTab.jsx`
- `src/lib/socialService.js`

**Estimated scope:** Medium (3-4 files)

### Checkpoint: Phase 4
- [ ] Envío de WhatsApp template funciona
- [ ] Segmentación de clientes funciona
- [ ] Build pasa

---

## Phase 5: QR Codes + Landing Pages (Extra)

**Objetivo:** Generar QR codes por campaña y landing pages mínimas para trackear conversiones.

### Task 5.1: QR Code Generator

**Description:** Al crear una campaña, generar automáticamente un QR code que linkea a la carta/landing de la promo.

**Acceptance criteria:**
- [ ] QR code generado automáticamente al crear campaña
- [ ] Descargable en PNG/SVG
- [ ] Se puede personalizar el color
- [ ] Tracking de escaneos via Firebase

**Dependencies:** None (standalone)

**Files likely touched:**
- `src/admin/components/marketing/QrCodeGenerator.jsx` (new)
- `package.json` (add `qrcode` library)
- `src/admin/tabs/MarketingTab.jsx`

**Estimated scope:** Small (2-3 files)

---

## Resumen de Fases para el Concurso

| Fase | Features | Impacto Demo | Tiempo Est. |
|------|----------|-------------|-------------|
| **0** | Conectar Instagram/Facebook | ⭐⭐⭐ | 3-4 días |
| **1** | Publicar a redes desde admin | ⭐⭐⭐⭐⭐ | 2-3 días |
| **2** | Calendario + Scheduling | ⭐⭐⭐⭐ | 4-5 días |
| **3** | Analytics Dashboard | ⭐⭐⭐ | 2-3 días |
| **4** | WhatsApp Integration | ⭐⭐⭐⭐ | 3-4 días |
| **5** | QR Codes + Landing | ⭐⭐ | 1-2 días |

**Recomendación para el concurso:** Priorizar **Fases 0 → 1 → 2**. Eso te da:
1. Conectar cuenta real de Instagram
2. Publicar el copy generado por IA directamente
3. Programar contenido semanal
4. Mostrar el calendario de contenido

Con eso tenés un demo **completo y funcional** de principio a fin.

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Meta no aprueba la app a tiempo | Alto | Usar modo de desarrollo (50 usuarios test) para el demo |
| Token expira durante el demo | Medio | Refresh automático cada 30 días |
| Rate limits de Meta API | Bajo | Queue de publicaciones + backoff |
| Cliente no tiene Instagram Business | Alto | Soportar también Facebook Page y permitir post manual |
| WhatsApp requiere numero verificado | Medio | Usar número de prueba de Meta para el demo |

## Open Questions

- ¿El restaurante tiene Instagram Business o Facebook Page ya configurados?
- ¿Tienen un número de WhatsApp Business activo?
- ¿Querés integrar TikTok también? (API más restrictiva)
- ¿Preferís priorizar publicación directa o contenido programado?
