# Integración Gemini Pro API — Plan

## Contexto
Usuario paga Gemini Pro. El proyecto actualmente usa OpenRouter (housepysbot) y OpenAI (voucher verification). No hay Gemini.

## Fase 1 — housepysbot: Gemini Pro como modelo principal
- Instalar `@google/generative-ai`
- Crear `src/lib/geminiClient.ts` con adapter que implemente `chat.completions.create({ messages, tools, tool_choice })`
- Gemini usa `functionDeclarations` vs `tools` de OpenAI — mapear formato MCP
- Control por env var `GEMINI_API_KEY` vs `OPENROUTER_API_KEY`
- Gemini 2.5 Flash como primario, Qwen como fallback

## Fase 2 — Sorteos transparentes con Gemini
- Reemplazar `Math.random()` en `Admin.tsx:handleExecuteRaffle` y `functions/src/index.ts:drawWinner`
- Crear `src/lib/geminiRaffle.ts`:
  - Input: tickets + seed público (timestamp/blockhash)
  - Output: índice ganador + hash SHA-256 + razonamiento
- Justifica el marketing "Smart Contract" existente en la UI

## Fase 3 — Búsqueda semántica en house-menu
- Nuevo endpoint `/api/search` (en housepysbot o servicio aparte)
- Embeddings de Gemini (`embedding-001`, 768d) para rankear productos
- Modificar `SearchBar` en CustomerView para fetch con debounce 300ms
- Fallback: búsqueda substring actual

## Fase 4 — Voucher verification con Gemini Vision
- Modificar `apps/sorteos-automaticos/src/lib/verifyVoucher.ts`
- Gemini Pro Vision (`gemini-2.5-flash-exp`) como alternativa a GPT-4o-mini
- Orden: Gemini → OpenAI → Mock
