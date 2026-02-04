import Anthropic from "@anthropic-ai/sdk";
import { fileTools, executeFileTool } from "./file-tools.js";
import { webTools, executeWebTool } from "./web-tools.js";
import { codeTools, executeCodeTool } from "./code-tools.js";

export type Tool = Anthropic.Tool;

export type ToolResult = {
  success: boolean;
  result?: unknown;
  error?: string;
};

export const allTools: Tool[] = [...fileTools, ...webTools, ...codeTools];

export function getToolsByCategory(
  categories: ("file" | "web" | "code")[]
): Tool[] {
  const tools: Tool[] = [];
  if (categories.includes("file")) tools.push(...fileTools);
  if (categories.includes("web")) tools.push(...webTools);
  if (categories.includes("code")) tools.push(...codeTools);
  return tools;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const fileToolNames = fileTools.map((t) => t.name);
  const webToolNames = webTools.map((t) => t.name);
  const codeToolNames = codeTools.map((t) => t.name);

  if (fileToolNames.includes(name)) {
    return executeFileTool(name, input);
  }
  if (webToolNames.includes(name)) {
    return executeWebTool(name, input);
  }
  if (codeToolNames.includes(name)) {
    return executeCodeTool(name, input);
  }

  return { success: false, error: `Unknown tool: ${name}` };
}
