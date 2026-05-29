import type { McpToolResult } from "./types.js";

export interface ToolAdapter {
  toOpenAiTools(): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  executeTool(name: string, args: Record<string, unknown>, branchId: string): Promise<McpToolResult>;
}

export function createAdapter(getAllTools: () => Array<{ name: string; description: string; parameters: Record<string, unknown>; execute: Function }>): ToolAdapter {
  return {
    toOpenAiTools() {
      return getAllTools().map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: "object" as const,
            properties: t.parameters,
          },
        },
      }));
    },
    async executeTool(name, args, branchId) {
      const tool = getAllTools().find((t) => t.name === name);
      if (!tool) return { success: false, error: `Tool "${name}" no encontrado` };
      return tool.execute(args, branchId);
    },
  };
}
