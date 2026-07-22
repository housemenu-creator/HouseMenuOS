/**
 * Agent — public API entry point.
 *
 * Re-exports from the refactored modules:
 *   - processMessage.ts  → multi-turn agent loop
 *   - prompt-builder.ts  → SenderInfo type
 *
 * ⚠️ Internal modules (client.ts, prompt-builder.ts, processMessage.ts)
 *    are implementation details. Import from index.ts only.
 */
export { processMessage, type SenderInfo } from "./processMessage.js";
