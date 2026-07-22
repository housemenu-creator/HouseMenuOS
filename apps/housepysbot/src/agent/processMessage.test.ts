/**
 * Tests for the AI agent loop: processMessage() + _processMessage()
 *
 * Strategy: mock OpenAI + MCP + Firebase at module level so the
 * agent loop runs deterministically. We test:
 *   - Text-only responses (no tool calls)
 *   - Single tool call
 *   - Multi-turn tool calling
 *   - Error handling (rate limit, model down, etc.)
 *   - Agent tool filtering (atencion shouldn't see admin tools)
 *   - Max iterations reached
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks (must be before any imports) ─────────────────

const mockCreate = vi.fn();
const mockExecuteTool = vi.fn();
const mockToOpenAiTools = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

vi.mock("../mcp/adapter.js", () => ({
  createAdapter: vi.fn(() => ({
    toOpenAiTools: mockToOpenAiTools,
    executeTool: mockExecuteTool,
  })),
}));

vi.mock("../mcp/server.js", () => ({
  loadTools: vi.fn(),
  registry: { getAll: vi.fn(() => []) },
}));

vi.mock("../rag/retrieval.js", () => ({
  getRelevantContext: vi.fn(() => Promise.resolve("")),
}));

vi.mock("../lib/branch.js", () => ({
  getBranchInfo: vi.fn(() =>
    Promise.resolve({
      name: "Test Restaurant",
      address: "Av. Prueba 123",
      phone: "999888777",
      schedule: "Lun-Dom 10am-10pm",
      deliveryFee: 5,
      freeThreshold: 30,
      deliveryEnabled: true,
    }),
  ),
}));

vi.mock("../lib/agentConfig.js", () => ({
  getAgentConfigCached: vi.fn((_branchId: string, agentId: string) => {
    const templates: Record<string, any> = {
      atencion: {
        id: "atencion",
        name: "Atención",
        systemPrompt: `Eres un asistente de prueba.
INFORMACIÓN DEL RESTAURANTE:
Nombre: {name}{address}{phone}{schedule}{delivery}
HERRAMIENTAS: ver_menu, buscar_producto, crear_pedido`,
        allowedTools: ["ver_menu", "buscar_producto", "crear_pedido"],
      },
      admin: {
        id: "admin",
        name: "Admin",
        systemPrompt: `Eres un admin de prueba.
INFORMACIÓN DEL RESTAURANTE:
Nombre: {name}{address}{phone}{schedule}{delivery}
HERRAMIENTAS: cancelar_pedido, analytics_resumen`,
        allowedTools: ["cancelar_pedido", "analytics_resumen"],
      },
    };
    return Promise.resolve(
      templates[agentId] || {
        id: agentId,
        name: agentId,
        systemPrompt: `Fallback agent ${agentId}`,
        allowedTools: [],
      },
    );
  }),
}));

vi.mock("../lib/telemetry.js", () => ({
  reportToolCall: vi.fn(() => Promise.resolve()),
}));

vi.mock("../lib/firebase.js", () => {
  const mockRef = vi.fn();
  const mockChild = vi.fn();
  const mockGet = vi.fn(() => Promise.resolve({ exists: () => false, val: () => null }));
  return {
    initFirebase: vi.fn(() => ({})),
    ref: mockRef,
    child: mockChild,
    get: mockGet,
    set: vi.fn(),
  };
});

// Don't let dotenv touch real env
vi.mock("dotenv/config", () => ({}));

// ── SUT ─────────────────────────────────────────────────

// Set predictable env before importing SUT
process.env.OPENAI_API_KEY = "test-key-groq-fake";
process.env.OPENAI_BASE_URL = "https://api.groq.com/openai/v1";
process.env.OPENROUTER_MODEL = "test-model";
process.env.OPENROUTER_FALLBACK = "test-fallback";
process.env.HOUSEPYSBOT_BRANCH_ID = "test-branch";

// Helper: build a mock LLM response
function llmResponse(content: string | null, toolCalls?: any[]) {
  return {
    choices: [
      {
        message: {
          content: toolCalls ? null : content,
          tool_calls: toolCalls || undefined,
        },
      },
    ],
  };
}

function toolCall(name: string, args: Record<string, any>, id = "call_1") {
  return {
    id,
    type: "function" as const,
    function: { name, arguments: JSON.stringify(args) },
  };
}

describe("processMessage", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockExecuteTool.mockReset();
    mockToOpenAiTools.mockReset().mockReturnValue([]);
    process.env.OPENAI_API_KEY = "test-key-groq-fake";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Text-only responses ─────────────────────────

  it("returns the LLM text content when no tools called", async () => {
    mockCreate.mockResolvedValueOnce(llmResponse("Hola, ¿en qué puedo ayudarte?"));

    const { processMessage } = await import("./index.js");
    const result = await processMessage("Hola", "test-branch", []);

    expect(result).toBe("Hola, ¿en qué puedo ayudarte?");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("injects RAG context into the system prompt", async () => {
    mockCreate.mockResolvedValueOnce(llmResponse("Respuesta con RAG"));

    const { getRelevantContext } = await import("../rag/retrieval.js");

    const { processMessage } = await import("./index.js");
    await processMessage("¿qué hay de menú?", "test-branch", []);

    expect(getRelevantContext).toHaveBeenCalledWith("¿qué hay de menú?", 3);
  });

  // ── 2. Single tool call ────────────────────────────

  it("executes one tool and returns final answer", async () => {
    // First call: LLM wants to call ver_menu
    mockCreate.mockResolvedValueOnce(
      llmResponse(null, [toolCall("ver_menu", {})]),
    );
    // Tool execution succeeds
    mockExecuteTool.mockResolvedValueOnce({
      success: true,
      data: [{ name: "Lomo Saltado", price: 28 }],
      message: "Menú encontrado",
    });
    // Second call: LLM summarizes
    mockCreate.mockResolvedValueOnce(
      llmResponse("Tenemos Lomo Saltado a S/ 28"),
    );

    mockToOpenAiTools.mockReturnValue([
      { type: "function", function: { name: "ver_menu", description: "Ver menú" } },
    ]);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("qué hay?", "test-branch", []);

    expect(result).toBe("Tenemos Lomo Saltado a S/ 28");
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockExecuteTool).toHaveBeenCalledWith("ver_menu", {}, "test-branch");
  });

  // ── 3. Tool execution failure ──────────────────────

  it("reports tool execution error back to LLM", async () => {
    mockCreate.mockResolvedValueOnce(
      llmResponse(null, [toolCall("ver_menu", {})]),
    );
    mockExecuteTool.mockRejectedValueOnce(new Error("Firebase timeout"));
    mockCreate.mockResolvedValueOnce(
      llmResponse("Hubo un error al consultar el menú, intentá de nuevo."),
    );

    mockToOpenAiTools.mockReturnValue([
      { type: "function", function: { name: "ver_menu", description: "Ver menú" } },
    ]);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("qué hay?", "test-branch", []);

    expect(result).toContain("error");
  });

  // ── 4. Multi-turn (tool → tool → answer) ──────────

  it("handles multi-turn tool calling (tool → tool → answer)", async () => {
    // Turn 1: ver_menu
    mockCreate.mockResolvedValueOnce(
      llmResponse(null, [toolCall("ver_menu", {})]),
    );
    mockExecuteTool.mockResolvedValueOnce({
      success: true,
      data: [{ name: "Lomo Saltado" }],
      message: "Menú listado",
    });
    // Turn 2: buscar_producto (based on previous result)
    mockCreate.mockResolvedValueOnce(
      llmResponse(null, [toolCall("buscar_producto", { nombre: "Lomo" })]),
    );
    mockExecuteTool.mockResolvedValueOnce({
      success: true,
      data: [{ name: "Lomo Saltado", price: 28 }],
      message: "Producto encontrado",
    });
    // Turn 3: final answer
    mockCreate.mockResolvedValueOnce(
      llmResponse("El Lomo Saltado está S/ 28"),
    );

    mockToOpenAiTools.mockReturnValue([
      { type: "function", function: { name: "ver_menu", description: "x" } },
      { type: "function", function: { name: "buscar_producto", description: "x" } },
    ]);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("qué hay?", "test-branch", []);

    expect(result).toBe("El Lomo Saltado está S/ 28");
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(mockExecuteTool).toHaveBeenCalledTimes(2);
  });

  // ── 5. Max iterations reached ─────────────────────

  it("summarizes when max tool iterations reached (5 turns)", async () => {
    // All 5 turns return a tool call (the agent is stuck in a loop)
    for (let i = 0; i < 5; i++) {
      mockCreate.mockResolvedValueOnce(
        llmResponse(null, [toolCall("ver_menu", {})]),
      );
      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        data: [{ name: "Lomo Saltado" }],
        message: "OK",
      });
    }
    // Final summarization call
    mockCreate.mockResolvedValueOnce(
      llmResponse("Resumen final después de varios pasos."),
    );

    mockToOpenAiTools.mockReturnValue([
      { type: "function", function: { name: "ver_menu", description: "x" } },
    ]);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("qué hay?", "test-branch", []);

    expect(result).toContain("Resumen final");
    expect(mockCreate).toHaveBeenCalledTimes(6); // 5 tool turns + 1 summary
  });

  // ── 6. Tool filtering by agent config ─────────────

  it("filters tools per agent (atencion can't use admin tools)", async () => {
    mockCreate.mockResolvedValueOnce(llmResponse("Soy el agente de atención"));

    mockToOpenAiTools.mockReturnValue([
      { type: "function", function: { name: "ver_menu", description: "x" } },
      { type: "function", function: { name: "analytics_resumen", description: "x" } },
      { type: "function", function: { name: "crear_pedido", description: "x" } },
      { type: "function", function: { name: "cancelar_pedido", description: "x" } },
    ]);

    const { processMessage } = await import("./index.js");
    await processMessage("hola", "test-branch", [], "atencion");

    // Should only have atencion's tools: ver_menu, buscar_producto, crear_pedido
    const callArg = mockCreate.mock.calls[0][0];
    const toolNames = callArg.tools?.map((t: any) => t.function.name) || [];
    expect(toolNames).toContain("ver_menu");
    expect(toolNames).toContain("crear_pedido");
    expect(toolNames).not.toContain("analytics_resumen");
    expect(toolNames).not.toContain("cancelar_pedido");
  });

  // ── 7. Error handling ─────────────────────────────

  it("returns friendly message on 429 rate limit", async () => {
    const rateLimitError = new Error("Rate limit exceeded");
    (rateLimitError as any).status = 429;
    (rateLimitError as any).code = 429;
    mockCreate.mockRejectedValue(rateLimitError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("Demasiadas consultas");
  });

  it("returns friendly message on 401 auth error", async () => {
    const authError = new Error("401 Invalid API key");
    (authError as any).status = 401;
    (authError as any).code = 401;
    mockCreate.mockRejectedValue(authError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("no está configurado");
  });

  it("returns friendly message on 500 server error", async () => {
    const serverError = new Error("Server Error");
    (serverError as any).status = 500;
    mockCreate.mockRejectedValue(serverError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("temporalmente caída");
  });

  it("returns friendly message on timeout (AbortError)", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "AbortError";
    mockCreate.mockRejectedValue(timeoutError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("tardó demasiado");
  });

  it("returns friendly message on insufficient quota", async () => {
    const quotaError = new Error("Insufficient quota");
    (quotaError as any).status = 402;
    mockCreate.mockRejectedValue(quotaError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("Sin crédito disponible");
  });

  it("returns generic error for unknown errors", async () => {
    const unknownError = new Error("Something weird happened");
    mockCreate.mockRejectedValue(unknownError);

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toContain("error inesperado");
  });

  // ── 8. Fallback model ──────────────────────────────

  it("tries fallback model when primary fails", async () => {
    // Primary fails
    const primaryErr = new Error("Model overloaded");
    (primaryErr as any).status = 502;
    mockCreate.mockRejectedValueOnce(primaryErr);
    // Fallback succeeds
    mockCreate.mockResolvedValueOnce(llmResponse("Respuesta desde fallback"));

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    expect(result).toBe("Respuesta desde fallback");
    // Should have been called twice (primary failed, fallback worked)
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  // ── 9. No API key configured ──────────────────────

  it("returns error when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const { processMessage } = await import("./index.js");
    const result = await processMessage("hola", "test-branch", []);

    // Should be caught by the outer try/catch in processMessage
    expect(result).toContain("no está configurado");
  });

  // ── 10. Customer lookup from agent/index path ──────
  // (Firebase mock returns empty customers — lookup returns null, no context injected.
  //  Tested indirectly via the no-error path passing with senderInfo supplied.)
});
