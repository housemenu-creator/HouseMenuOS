# House-Portal-OS Technical Audit

Fecha: 2026-06-13  
Repositorio: `C:\Users\archiphone\.gemini\antigravity\House-Portal-OS`  
Audiencia: equipo de desarrollo  
Estado: reporte de diagnostico, sin cambios de codigo aplicados

## Resumen ejecutivo

House-Portal-OS tiene una direccion arquitectonica potente: monorepo npm, React/Vite, paquetes compartidos `@house/*`, Firebase RTDB y un bot operativo en TypeScript. La base compila en sus apps principales, pero el repositorio no esta listo para una entrega limpia: hay un working tree enorme y mezclado, documentacion desalineada con la realidad, tests fallando en `house-menu`, deuda de seguridad/configuracion y bundles grandes.

La prioridad no es agregar mas features. La prioridad es estabilizar la base: cerrar la brecha entre arquitectura documentada y estructura real, arreglar KDS, sacar codigo operativo peligroso del frontend y dividir el trabajo pendiente en unidades revisables.

## Veredicto rapido

| Area | Estado | Comentario |
|---|---:|---|
| Build `house-menu` | Pasa | Compila, pero con advertencias de chunks grandes. |
| Build `housepysbot` | Pasa | TypeScript compila correctamente. |
| Build `portal-hub` | Pasa | Compila, pero genera un bundle JS grande. |
| Tests `housepysbot` | Pasa | 68 tests pasan. |
| Tests `house-menu` | Falla | 33 tests fallan, concentrados en KDS. |
| Git working tree | Riesgo alto | 281 archivos cambiados; mezcla deletes, nuevos archivos y refactors. |
| Documentacion vs realidad | Riesgo medio/alto | Docs hablan de 10 apps activas; el arbol actual muestra 3 apps activas y varias archivadas/borradas. |
| Seguridad/config | Riesgo alto | API key default en endpoint interno, limpieza de usuarios expuesta en frontend, config Firebase hardcodeada en SW. |

## Evidencia verificada

### Apps activas actuales

Directorios activos bajo `apps/`:

- `apps/house-menu`
- `apps/housepysbot`
- `apps/portal-hub`

La documentacion en `docs/projectContext.md` y `docs/architecture.md` todavia describe 10 apps activas:

- `house-menu`
- `househub`
- `worker-portal`
- `26play`
- `sorteos-automaticos`
- `house-cleaning`
- `house-laundry`
- `portal-hub`
- `housepysbot`
- `piramid-game`

Varias de esas apps aparecen como eliminadas en Git y/o movidas a `archive/`. Esto debe resolverse como decision explicita de arquitectura, no dejarse como estado ambiguo.

### Estado Git

El working tree no esta limpio.

Resumen observado:

- 281 archivos modificados/eliminados/nuevos.
- Aproximadamente 6,902 lineas agregadas.
- Aproximadamente 26,839 lineas eliminadas.
- Eliminaciones grandes en apps historicas como `apps/26play`, `apps/househub`, `apps/sorteos-automaticos`, `apps/worker-portal`, `apps/piramid-game`, `apps/house-cleaning`, `apps/house-laundry`.
- Muchos archivos nuevos sin trackear en `apps/house-menu`, `apps/housepysbot`, `archive/`, `docker/`, `packages/validation`, `scripts/`, `types/`.

Esto hace muy dificil revisar, revertir o aislar cambios. Antes de seguir desarrollando, conviene partir el trabajo en commits o PRs por tema.

## Validacion tecnica

### Builds

Comandos ejecutados:

```powershell
npm run build -w apps/house-menu
npm run build -w apps/housepysbot
npm run build -w apps/portal-hub
```

Resultado:

- `house-menu`: build exitoso.
- `housepysbot`: build exitoso.
- `portal-hub`: build exitoso.

Advertencias:

- `house-menu` genera chunks grandes, entre ellos:
  - `customer-CrCPDyep.js`: ~693 kB minificado, ~210 kB gzip.
  - `AnalyticsTab-DnvfAk59.js`: ~369 kB minificado, ~105 kB gzip.
- `portal-hub` genera:
  - `index-BznKexNP.js`: ~756 kB minificado, ~232 kB gzip.

Impacto:

- La app puede compilar, pero la experiencia inicial puede sufrir.
- Hay oportunidad clara de mejorar lazy loading, code splitting y boundaries por feature.

### Tests

Comandos ejecutados:

```powershell
npm run test -w apps/house-menu
npm run test -w apps/housepysbot
```

Resultado:

- `housepysbot`: 6 archivos de test pasan, 68 tests pasan.
- `house-menu`: 3 archivos fallan, 33 tests fallan, 135 tests pasan.

Fallos principales de `house-menu`:

- `src/kds/components/__tests__/TimerBadge.test.jsx`
- `src/kds/components/__tests__/KDSColumn.test.jsx`
- `src/kds/components/__tests__/KDSTicket.test.jsx`

Problema mas critico:

```jsx
const alertLevel = useTimerStore((s) => s.alertLevels[order.id] || 'safe');
```

Archivo:

```text
apps/house-menu/src/kds/components/KDSTicket.jsx
```

Riesgo:

- Si `alertLevels` no existe en el estado inicial o en mocks de test, el componente crashea.
- Este patron deberia protegerse con fallback:

```jsx
const alertLevel = useTimerStore((s) => s.alertLevels?.[order.id] || 'safe');
```

Tambien hay diferencias de contrato en `TimerBadge`: los tests esperan que no renderice con `0`, `null`, `undefined` o valores negativos, pero el componente renderiza `0:00`. Hay que decidir si el contrato correcto es el test o el nuevo comportamiento visual.

## Riesgos por prioridad

### P0 - Debe resolverse antes de entregar

#### 1. Tests rotos en KDS

Ubicacion:

- `apps/house-menu/src/kds/components/KDSTicket.jsx`
- `apps/house-menu/src/kds/components/TimerBadge.jsx`
- `apps/house-menu/src/kds/components/KDSColumn.jsx`
- `apps/house-menu/src/kds/store/timerStore.js`

Impacto:

- KDS es un flujo operacional critico.
- Los fallos incluyen crash por acceso a propiedad indefinida.
- La suite no puede usarse como red de seguridad mientras falle.

Accion recomendada:

- Corregir fallback defensivo en `KDSTicket`.
- Revisar contrato esperado de `TimerBadge`.
- Actualizar tests o componente, pero no ambos a ciegas.
- Ejecutar `npm run test -w apps/house-menu` hasta quedar en verde.

#### 2. Codigo de limpieza de usuarios expuesto en frontend

Ubicacion:

- `apps/house-menu/src/main.jsx`

Problema:

Existe una funcion global:

```js
window.cleanupDuplicates = async () => { ... }
```

La funcion lee usuarios, modifica `firebaseUid`, borra memberships y borra usuarios.

Impacto:

- Codigo administrativo destructivo queda cargado en el bundle del cliente.
- Aumenta superficie de error operativo y abuso.
- Mezcla migracion/data repair con runtime de la app.

Accion recomendada:

- Removerlo de `main.jsx`.
- Convertirlo en script controlado bajo `apps/house-menu/scripts/` o `scripts/`.
- Requerir credenciales/admin context explicito.
- Agregar modo dry-run antes de borrar datos.

#### 3. API key default en endpoint interno

Ubicacion:

- `apps/housepysbot/src/services/http-server.ts`

Problema:

```ts
const knownApiKey = process.env.API_KEY || "housepysbot_dev_2024";
```

Impacto:

- Si falta `API_KEY`, el sistema cae a una clave predecible.
- En produccion esto debe fallar cerrado.

Accion recomendada:

- En produccion, si `API_KEY` falta, rechazar arranque o deshabilitar endpoint.
- Permitir default solo en `NODE_ENV !== "production"`.

### P1 - Resolver en el siguiente ciclo

#### 4. Documentacion desalineada con estructura real

Ubicacion:

- `docs/projectContext.md`
- `docs/architecture.md`
- `docs/techStack.md`
- `package.json`

Problema:

- Los docs describen 10 apps activas.
- `package.json` todavia tiene scripts para apps que ya no estan activas en `apps/`.
- La realidad actual parece ser una consolidacion hacia 3 apps activas mas `archive/`.

Impacto:

- Nuevos devs van a perder tiempo persiguiendo apps inexistentes.
- Las tareas de CI/build/dev pueden fallar si usan scripts obsoletos.
- La arquitectura pierde autoridad.

Accion recomendada:

- Declarar oficialmente el estado de cada app: `active`, `archived`, `removed`, `planned`.
- Actualizar scripts npm para que solo apunten a apps activas.
- Agregar una seccion "Archived apps" en docs.

#### 5. Working tree demasiado grande para review

Problema:

- El diff mezcla archivado de apps, refactors de KDS, cambios en bot, Docker, design system, config y paquetes.

Impacto:

- Riesgo alto de merge conflict.
- Dificil hacer code review serio.
- Dificil revertir una parte sin romper otra.

Accion recomendada:

- Crear una rama de estabilizacion.
- Partir en PRs:
  - PR 1: housekeeping/archivado de apps.
  - PR 2: estabilizacion KDS.
  - PR 3: seguridad/config.
  - PR 4: docs y scripts npm.
  - PR 5: performance/code splitting.

#### 6. Bundle size alto

Ubicacion:

- `apps/house-menu`
- `apps/portal-hub`

Impacto:

- Carga inicial mas lenta.
- Peor experiencia en dispositivos de baja gama o redes moviles.

Accion recomendada:

- Verificar lazy loading real por vistas.
- Separar `AnalyticsTab`, customer flow y dependencias pesadas.
- Revisar imports que arrastran modulos completos.
- Definir presupuesto de bundle por app.

### P2 - Mejora estructural

#### 7. Uso amplio de `any` en TypeScript

Ubicacion principal:

- `apps/housepysbot/src/services/*`
- `apps/housepysbot/src/mcp/tools/*`
- `apps/house-menu/src/**/*.ts(x)`

Impacto:

- El sistema compila, pero TypeScript no esta protegiendo lo suficiente los contratos de datos.
- Firebase RTDB devuelve estructuras flexibles; sin schemas, los errores aparecen tarde.

Accion recomendada:

- Introducir schemas Zod o tipos compartidos por dominio.
- Empezar por modelos criticos: `Order`, `Customer`, `Branch`, `MenuProduct`, `Employee`.
- No intentar tipar todo de golpe.

#### 8. Firebase config hardcodeada en service worker

Ubicacion:

- `apps/house-menu/public/firebase-messaging-sw.js`

Impacto:

- La API key de Firebase web no es secreta por si sola, pero hardcodear configuracion reduce flexibilidad entre ambientes.
- El riesgo real depende de reglas RTDB/Auth.

Accion recomendada:

- Verificar reglas RTDB de produccion.
- Documentar claramente que valores son publicos y cuales son secretos.
- Evitar mezclar config de produccion en archivos que se copian entre ambientes.

## Arquitectura observada

### Fortalezas

- Monorepo npm workspaces ya configurado.
- Paquetes compartidos:
  - `@house/ui`
  - `@house/tokens`
  - `@house/db`
  - `@house/store`
  - `@house/validation`
- `housepysbot` tiene buena base de tests y separacion creciente:
  - `entry/http.ts`
  - `entry/bot.ts`
  - `mcp/tools/*`
  - `services/*`
  - `lib/*`
- Design system Clean Minimalist documentado con templates.
- Uso consistente de Firebase RTDB como backend principal.

### Debilidades

- La arquitectura documentada no representa el estado actual.
- `house-menu` concentra demasiadas responsabilidades.
- Hay mezcla de JSX y TSX en la misma app sin boundaries claros.
- KDS parece estar en migracion/refactor con tests desactualizados o comportamiento roto.
- Scripts de mantenimiento viven cerca del runtime.
- El repo tiene artefactos generados y dist bajo `docker/nginx-dist`, lo cual puede ser intencional, pero aumenta ruido de review.

## Plan recomendado

### Fase 1 - Estabilizacion inmediata

Objetivo: volver a tener una base verificable.

Checklist:

- [ ] Arreglar crash de `KDSTicket` con `alertLevels`.
- [ ] Resolver contrato de `TimerBadge`.
- [ ] Dejar `npm run test -w apps/house-menu` en verde.
- [ ] Remover `window.cleanupDuplicates` del runtime frontend.
- [ ] Revisar `API_KEY` default en `housepysbot`.
- [ ] Confirmar que `housepysbot` mantiene 68/68 tests pasando.

### Fase 2 - Limpieza de repo

Objetivo: reducir riesgo de review y deploy.

Checklist:

- [ ] Decidir oficialmente que apps quedan activas.
- [ ] Mover/confirmar apps archivadas bajo `archive/`.
- [ ] Actualizar `package.json` root para eliminar scripts rotos u obsoletos.
- [ ] Actualizar `docs/projectContext.md`, `docs/architecture.md`, `docs/techStack.md`.
- [ ] Separar cambios en commits/PRs pequenos.

### Fase 3 - Seguridad y configuracion

Objetivo: eliminar defaults inseguros y operaciones destructivas accidentales.

Checklist:

- [ ] Fail closed cuando falte `API_KEY` en produccion.
- [ ] Revisar RTDB rules.
- [ ] Documentar variables requeridas en `.env.example`.
- [ ] Crear scripts admin con dry-run para limpieza/migracion.
- [ ] Revisar service worker Firebase config por ambiente.

### Fase 4 - Performance

Objetivo: bajar costo de carga inicial.

Checklist:

- [ ] Auditar imports de `portal-hub`.
- [ ] Lazy-load vistas pesadas de `house-menu`.
- [ ] Separar `AnalyticsTab`.
- [ ] Revisar dependencias que entran en chunks de customer flow.
- [ ] Definir presupuesto de bundle.

## Orden sugerido de PRs

1. `fix(house-menu): stabilize kds tests`
2. `fix(house-menu): move duplicate cleanup out of client runtime`
3. `fix(housepysbot): fail closed when api key is missing in production`
4. `chore(repo): align active apps and archive metadata`
5. `docs(architecture): update house portal os current state`
6. `perf(frontend): split heavy route bundles`

## Comandos de verificacion

```powershell
npm run build -w apps/house-menu
npm run test -w apps/house-menu
npm run build -w apps/housepysbot
npm run test -w apps/housepysbot
npm run build -w apps/portal-hub
git status --short --branch
git diff --stat
```

## Decision necesaria del equipo

Antes de escribir mas features, el equipo debe decidir:

1. Cuales apps son producto activo hoy.
2. Cuales apps quedan archivadas.
3. Si `portal-hub` reemplaza a `househub` o conviven.
4. Si KDS debe seguir el comportamiento nuevo o el contrato de tests existente.
5. Que partes del diff actual deben convertirse en PRs separados.

## Cierre

La base tiene valor y no esta rota de raiz: los builds principales pasan y `housepysbot` esta sano en tests. El problema es de disciplina de integracion: demasiados cambios juntos, tests rotos en un flujo critico y configuracion peligrosa en runtime. Si el equipo estabiliza primero, House-Portal-OS puede volver a ser una plataforma mantenible en vez de una acumulacion dificil de revisar.
