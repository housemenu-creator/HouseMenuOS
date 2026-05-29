export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}
