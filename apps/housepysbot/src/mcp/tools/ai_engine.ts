import OpenAI from 'openai';

/**
 * Kimi K2.6 AI Engine
 * Wrapper para el endpoint de NVIDIA Build (OpenAI-compatible).
 * Genera insights cualitativos y realiza análisis de texto complejos.
 */

const kimi = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export interface LLMInsightRequest {
  salesData: string;
  attendanceData: string;
  inventoryData: string;
  prompt: string;
}

export async function getLLMInsights(req: LLMInsightRequest): Promise<string> {
  const response = await kimi.chat.completions.create({
    model: 'moonshotai/kimi-k2.6',
    messages: [{
      role: 'system',
      content: `Eres un analista de operaciones de restaurante experto. Genera insights concisos y accionables basados en los datos operativos.`
    }, {
      role: 'user',
      content: buildPrompt(req)
    }],
    temperature: 0.7,
    max_tokens: 2048,
  });

  return response.choices[0].message.content || 'No insights generated.';
}

function buildPrompt(req: LLMInsightRequest): string {
  return `Datos de Ventas:
${req.salesData}

Datos de Asistencia:
${req.attendanceData}

Datos de Inventario:
${req.inventoryData}

${req.prompt}`;
}
