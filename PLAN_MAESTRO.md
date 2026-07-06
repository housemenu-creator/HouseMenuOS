# PLAN MAESTRO: House-Portal-OS AI-Driven Analytics & Predictive Ops

## Objetivo

Transformar House-Portal-OS de un ecosistema de 3 apps separadas en una **plataforma SaaS inteligente** con analytics predictivo, insights automáticos y operaciones optimizadas por IA.

---

## Fases Implementación

### 🔥 FASE 1: Consolidación de Datos (Week 1)
**Objetivo:** Eliminar conflictos y unificar el ecosistema de datos.

- **1.1 Unificar Sistema de Cajas**  
  Merge `cash_sessions` y `caja/sessions`. Migración de datos con respaldo. Actualizar house-menu y housepysbot para usar path único.

- **1.2 Normalizar SUNAT**  
  Unificar fiscal/credentials con branches/{id}/sunat. Migración y validación de facturación.

- **1.3 Agregar Transacciones Atómicas en Orders**  
  `runTransaction` para stock en pedidos del bot y el frontend. Elimina race conditions.

- **1.4 Schema de Datos Centralizado**  
  Documento de verdad única de la estructura RTDB en `docs/FIREBASE_SCHEMA.md`.

---

### 🏗️ FASE 2: AI Analytics Engine (Week 1-2)
**Objetivo:** Crear el motor principal de análisis predictivo.

- **2.1 MCP Tool: `cross_analytics`**  
  Backend de análisis cruzado. Agrega datos de ventas, asistencia e inventario por sucursal y rango de tiempo.

- **2.2 MCP Tool: `predictive_engine`**  
  Integración con Kimi K2.6 para análisis más profundo y generación de informes ejecutivos.

- **2.3 Batch Processor: `analytics_daily`**  
  Cron job/Cloud Function para calcular métricas diarias (ventas, asistencia, etc.) y guardarlos en `system/analytics/`.

- **2.4 Real-time Events: `ops_events`**  
  Sistema de eventos operativos para enviar notificaciones automáticas basadas en análisis.

---

### 🎨 FASE 3: Dashboard Ejecutivo (Week 2-3)
**Objetivo:** Interfaz visual para el dueño/admin del negocio.

- **3.1 Nuevo Módulo en portal-hub**  
  Dashboard ejecutivo con layout tipo Clean Minimalist.

- **3.2 Componentes KPI**  
  KPIs: SalesToday, StaffEfficiency, InventoryLevels, PredictedDemand, AlertsPanel.

- **3.3 AI Insights Panel**  
  Panel que muestra insights generados automáticamente por el AI Bot (via Kimi K2.6).

- **3.4 Action Hub**  
  Botones de acción rápida para ejecutar operaciones directamente desde el dashboard.

---

### 🤖 FASE 4: AI Orchestrator (Week 3-4)
**Objetivo:** Convertir al bot en un "Chief Operating Officer" digital.

- **4.1 Bot Function: `morning_briefing`**  
  Resumen diario automático enviado por Telegram/WhatsApp al dueño.

- **4.2 Bot Function: `anomaly_detection`**  
  Monitoreo en tiempo real que detecta desviaciones operativas y sugiere acciones.

- **4.3 Bot Function: `strategic_insights`**  
  Generación de insights globales para dirección estratégica (demandas, precios, etc.).

- **4.4 Bot Function: `voice_commands`**  
  Permite al dueño interactuar con el sistema usando comandos de voz.

---

### 🚀 FASE 5: Testing & Rollout (Week 4-5)
**Objetivo:** Validación y despliegue seguro.

- **5.1 Tests end-to-end con Kimi**  
  Validación de todo el flujo predictivo y del dashboard.

- **5.2 Staging Deployment**  
  Probar en entorno de pre-producción con datos anónimos.

- **5.3 Phased Rollout (canary)**  
  Gradual release con monitoreo de métricas clave.

- **5.4 Training & Docs**  
  Documentación y guía para administradores y usuarios avanzados.

---

## Arquitectura Final Propuesta

```
     house-menu (React)          portal-hub (React)          housepysbot (Node)
          |                            |                          |
          |  Ventas/Stock              |  Asistencia/Tareas       |  Conversación
          |                             |                          |
          |----------------------------->|<--------------------------|
          |                                                                  |
          |              Firebase Realtime Database          |
          |Embedding Historical Data                           |
          |                                                                  |
          |<----------------Analytics Engine----------------->|
          |                                                                  |
        Cross-Analytics MCP Tool                                AI Orchestration
                                                                      |
                                                              Kimi K2.6 (NVIDIA)
                                                                      |
                                      +-------------------------------+
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
     Dashboard             Predictive Ops            Anomaly Detection
     Portal-Hub (React)    (Node)                  (Node)
```

---

## Alcance Kimi K2.6

Kimi debe ser usado para:
- **Análisis de texto libre** (descripciones de platillos, reviews)
- **Generación de informe**s ejecutivos narrativos
- **Análisis de sentimiento** de feedback de clientes
- **Sugere**ncias basadas en patrones complejos
- **Conversación** natural en el bot (ya lo usa)

---

*Generado: 2026-06-16 | Autor: Gentle AI Orchestrator*
