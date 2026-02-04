import * as vm from "vm";
import { Tool, ToolResult } from "./index.js";

export const codeTools: Tool[] = [
  {
    name: "run_code",
    description:
      "Execute JavaScript code in a sandboxed environment. The code has access to console.log for output. Returns the result of the last expression and any console output.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "The JavaScript code to execute",
        },
      },
      required: ["code"],
    },
  },
];

export async function executeCodeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  if (name !== "run_code") {
    return { success: false, error: `Unknown code tool: ${name}` };
  }

  try {
    const logs: string[] = [];
    const sandbox = {
      console: {
        log: (...args: unknown[]) => {
          logs.push(args.map((a) => String(a)).join(" "));
        },
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(input.code as string);
    const result = script.runInContext(context, { timeout: 5000 });

    return {
      success: true,
      result: {
        returnValue: result,
        logs,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
