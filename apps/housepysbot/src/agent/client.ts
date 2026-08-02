/**
 * AI Client — OpenAI connection with fallback model support.
 */
import OpenAI from "openai";
import logger from "../lib/logger.js";

export const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3.6-flash";
export const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK || "openrouter/auto";

export function createClient() {
  const key = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Configura OPENAI_API_KEY (Groq) en el .env"
    );
  }
  return new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
    apiKey: key,
  });
}

/**
 * Call the LLM with automatic fallback.
 * Tries PRIMARY_MODEL first, falls back to FALLBACK_MODEL on failure.
 */
export async function callWithFallback(
  client: ReturnType<typeof createClient>,
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, "model">,
  retries = 1,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await client.chat.completions.create(
          { ...params, model, stream: false },
          { signal: controller.signal },
        );
        clearTimeout(timeout);
        return res as OpenAI.Chat.Completions.ChatCompletion;
      } catch (e: any) {
        const isRetryable = [429, 402, 500, 502, 503].includes(e.status) || e.name === "AbortError";
        if (attempt < retries && isRetryable) {
          logger.info(`⚠ Modelo ${model} (intento ${attempt + 1}): ${e.message}, reintentando...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (model === models[models.length - 1] && attempt === retries) {
          throw e;
        }
        logger.info(`⚠ Modelo ${model} falló, probando fallback: ${e.message}`);
      }
    }
  }
  throw new Error("No hay modelos disponibles");
}
