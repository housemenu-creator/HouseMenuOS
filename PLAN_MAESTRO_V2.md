# PLAN MAESTRO HOUSE-PORTAL-OS

## 1. CONSOLIDACIÓN DE DATOS (1 semana)
- [ ] Unificar sistema de cajas (`cash_sessions` vs `caja/sessions`)
- [ ] Normalizar SUNAT (merge fiscal/credentials con sunat/)
- [ ] Atomic transactions en stock (orders)
- [ ] Documentar schema definitivo en `docs/FIREBASE_SCHEMA.md`
- [ ] Migración de datos con respaldo (sin pérdida de datos)

## 2. RAG PARA EL BOT (1.5 semanas)
- [ ] Setup de base de datos vectorial (Supabase pgvector o Weaviate)
- [ ] Pipeline de embeddings: convertir todo el conocimiento del restaurante a vectores
  - Menú, productos, precios, promociones
  - Políticas de negocio (delivery, pagos, etc)
  - Historial de conversaciones relevantes
- [ ] Implementar retrieval en `housepysbot/src/mcp/tools/ai_engine.ts`
- [ ] Agregar contexto RAG a las llamadas de Kimi K2.6
- [ ] Testing: El bot debe responder correctamente preguntas de trivia del restaurante

## 3. PREDICTIVE OPS (2 semanas)
- [ ] MCP tool `cross_analytics` que agregue ventas + asistencia + inventario
- [ ] MCP tool `predictive_engine` con Kimi K2.6
- [ ] Batch processor `analytics_daily` para Cloud Functions
- [ ] Real-time events `ops_events` para alertas automáticas
- [ ] 4 predicciones principales:
  - `predict_demanda`: cuánto se venderá mañana
  - `predict_staff`: cuántos empleados se necesitan
  - `predict_stock`: qué stock se va a acabar
  - `predict_pricing`: sugerencias dinámicas de precios

## 4. DASHBOARD EJECUTIVO (1.5 semanas)
- [ ] Nuevo módulo en portal-hub: `/dashboard`
- [ ] Componentes KPI: SalesToday, StaffEfficiency, InventoryLevels, PredictedDemand
- [ ] Sección "AI Insights" con outputs de Kimi
- [ ] Action Hub: ejecutar operaciones desde el dashboard

## 5. BOT ORCHESTRATOR (1 semana)
- [ ] Función `morning_briefing`: resumen diario automático
- [ ] Función `anomaly_detection`: alertas de desviaciones operativas
- [ ] Función `strategic_insights`: informe mensual de negocio
- [ ] Comandos de voz (roadmap)

## MVPs RÁPIDOS (Opcionales para testing)
- [ ] Voice command para consultas simples
- [ ] Image scan para leer menús manuscritos
- [ ] n8n automation para flujos externos (marketing, etc.)

---

*Plan consolidado de: SDD + RAG + Architect Review | Estado: En progreso*