import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

import { getLLMInsights } from "../ai_engine.js";

describe("ai_engine", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "📊 Las ventas subieron 15% esta semana." } }],
    });
  });

  it("returns insights from LLM", async () => {
    const result = await getLLMInsights({
      salesData: "Ventas: S/ 5000",
      attendanceData: "Staff: 5 presentes",
      inventoryData: "Stock: normal",
      prompt: "Generá un resumen",
    });
    expect(result).toContain("15%");
  });

  it("handles empty content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const result = await getLLMInsights({
      salesData: "none",
      attendanceData: "none",
      inventoryData: "none",
      prompt: "test",
    });
    expect(result).toBe("No insights generated.");
  });

  it("builds prompt with all data sections", async () => {
    await getLLMInsights({
      salesData: "SALES_DATA",
      attendanceData: "ATTENDANCE_DATA",
      inventoryData: "INVENTORY_DATA",
      prompt: "Resumí",
    });
    const callArgs = mockCreate.mock.calls[0][0];
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("SALES_DATA");
    expect(userMsg).toContain("ATTENDANCE_DATA");
    expect(userMsg).toContain("INVENTORY_DATA");
  });
});
