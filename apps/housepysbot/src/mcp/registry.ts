import type { ChatCompletionTool } from "openai/resources/chat/completions.js";
import type { McpToolDefinition, McpToolResult } from "./types.js";

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, branchId: string) => Promise<McpToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, MCPTool>();

  register(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAll(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  toMcpDefinitions(): McpToolDefinition[] {
    return this.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: "object",
        properties: t.parameters as Record<string, { type: string; description: string }>,
        required: Object.keys(t.parameters),
      },
    }));
  }

  toOpenAiTools(): ChatCompletionTool[] {
    return this.getAll().map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties: t.parameters,
          required: Object.keys(t.parameters),
        },
      },
    }));
  }
}

export const registry = new ToolRegistry();
