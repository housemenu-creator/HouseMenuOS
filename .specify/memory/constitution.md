<!--
  Sync Impact Report — v1.0.0
  Version: (new) 1.0.0
  Principles: 6 core principles defined
  Sections: Security & Compliance, Scalability Architecture, Development Workflow
  Governance: Amendment procedure, versioning, compliance review
  Follow-up: Testing infrastructure needs setup (Vitest config exists but no tests)
-->

# House-Portal-OS Constitution

## Core Principles

### I. Testing-First (NON-NEGOTIABLE)
Toda feature nueva DEBE incluir tests automatizados antes de ser marcada como completa.
- Unit tests para lógica de negocio y helpers
- Integration tests para flujos críticos (pedidos, auth, bot commands)
- Vitest + Testing Library como framework único
- Mínimo 70% de cobertura en código nuevo
- Excepciones solo con justificación documentada en el spec

### II. Monorepo Governance
El monorepo escala con reglas claras para añadir nuevos módulos.
- Nuevas apps en `/apps/` con naming `kebab-case`
- Nuevos paquetes compartidos en `/packages/@house/*`
- No duplicar lógica entre apps — si se repite, va a un package
- Cada app DEBE especificar su dependencia de `@house/*` packages
- NO dependencias entre apps directamente — solo vía packages

### III. Clean Minimalist Design System
Un solo sistema de diseño para los 10+ frontends presentes y futuros.
- Única fuente de verdad: `@house/tokens` (variables `--cm-*`)
- Prohibido: hex hardcodeados, clases legacy (`culinary-*`, `hub-*`, `worker-*`), estilos inline
- Toda nueva vista parte de un template en `docs/clean-minimalist/templates/`
- Toda vista incluye 4 estados: loading, empty, error, populated
- Layout shell estándar: `md:pl-64 pt-16 md:pt-0` para apps con sidebar

### IV. API Contracts & Documentación
Para que 10+ apps y un bot se comuniquen sin romperse.
- Toda interacción entre frontend y Firebase DEBE tener contratos definidos
- Schemas de RTDB documentados en la spec de cada feature
- Los cambios a schemas existentes requieren migración backward-compatible
- Bot commands documentados con formato de entrada/salida
- Usar `/speckit.plan` para generar `contracts/api-spec.json`

### V. Agentic Workflow (Spec → Ruflo → Registry)
El flujo de desarrollo para features nuevas es:
1. `/speckit.specify` — documentar qué y por qué
2. `/speckit.plan` — definir arquitectura y contratos
3. `/speckit.tasks` — desglosar en tareas accionables
4. **Ruflo swarm** — ejecutar cada tarea con agentes especializados
5. `walkthrough.md` — registrar progreso de la sesión
6. Actualizar `AGENTS.md` si el feature añade nuevos patrones o skills

### VI. TypeScript Strict & Code Quality
Código que escala necesita disciplina de tipos.
- strict mode obligatorio en `tsconfig.json`
- `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes` activados
- Prohibido `any` — excepciones solo con `// eslint-disable-next-line` documentado
- Linter sin warnings antes de commit

## Tech Stack Locked

| Capa | Tecnología | Versión Mínima |
|---|---|---|
| Runtime | Node.js | 22.x |
| Frontend | React + Vite | 19 + 8 |
| Styling | Tailwind CSS | 3.4 |
| Animaciones | Framer Motion | 12 |
| UI Package | @house/ui | Última |
| Tokens | @house/tokens | Última |
| DB | Firebase RTDB | — |
| Auth | Firebase Auth | — |
| Bot LLM | OpenRouter | — |
| Bot Channels | Telegraf + whatsapp-web.js | — |
| Testing | Vitest | 4.x |
| Agent CLI | opencode / Claude Code | — |
| Orquestación | Ruflo swarm | — |

No se permite añadir librerías externas sin:
1. Justificación documentada en la spec
2. Aprobación del lead
3. Actualización de esta tabla

## Security & Compliance

- Firebase Rules restrictivas por nodo (mínimo privilegio)
- Firebase Auth requerido para toda operación de escritura
- Secretos, tokens y claves API NUNCA commiteados — usar `.env` + `.gitignore`
- Validar toda entrada en frontera (API routes, bot handlers)
- Las rutas de bot deben sanitizar input antes de enviar a LLM

## Desarrollo y Escalabilidad

### Branch Strategy
- `main` — siempre estable y deployable
- `NNN-feature-name` — features nuevas (prefijo numérico secuencial)
- `fix/descripcion` — hotfixes
- NO commitear directo a main — siempre via feature branch

### Quality Gates (pre-commit)
```bash
npm run lint        # 0 warnings
npm run typecheck   # 0 errors
npm run test        # tests pasando
npm run build       # build exitoso
```

### Performance Budgets
- Las apps nuevas deben cargar en < 3s en 3G
- Lazy loading para rutas pesadas
- Bundle size monitoreado en househub (app más compleja)

### Migración & Refactors
- Los refactors grandes requieren spec y plan antes de implementar
- Migraciones de datos en RTDB: script + verificación + rollback plan
- Clean Minimalist migration sirve como template para futuras migraciones

## Governance

- Esta constitución tiene prioridad sobre prácticas ad-hoc
- Enmiendas requieren: documento de cambio + aprobación + actualización
- Versionado semver:
  - MAJOR: principios eliminados o cambios disruptivos
  - MINOR: nuevos principios o secciones
  - PATCH: aclaraciones, wording, typos
- Todo feature nuevo DEBE verificar compliance con esta constitución
- Revisión trimestral de principios vs. realidad del proyecto

**Version**: 1.0.0 | **Ratified**: 2026-05-29 | **Last Amended**: 2026-05-29
