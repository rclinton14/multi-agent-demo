import * as fs from "fs/promises";
import * as path from "path";
import { Tool, ToolResult } from "./index.js";

const WORKSPACE_DIR = path.resolve(process.cwd(), "workspace");

function resolveSafePath(filePath: string): string | null {
  const resolved = path.resolve(WORKSPACE_DIR, filePath);
  if (!resolved.startsWith(WORKSPACE_DIR)) {
    return null;
  }
  return resolved;
}

export const fileTools: Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file in the workspace directory. Returns the file content as a string.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "The relative path to the file within the workspace directory",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file in the workspace directory. Creates the file if it doesn't exist, or overwrites if it does.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "The relative path to the file within the workspace directory",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description:
      "List all files and directories in a directory within the workspace.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "The relative path to the directory within the workspace. Use '.' for the root workspace directory.",
        },
      },
      required: ["path"],
    },
  },
];

export async function executeFileTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });

    switch (name) {
      case "read_file": {
        const filePath = resolveSafePath(input.path as string);
        if (!filePath) {
          return { success: false, error: "Path is outside workspace" };
        }
        const content = await fs.readFile(filePath, "utf-8");
        return { success: true, result: content };
      }

      case "write_file": {
        const filePath = resolveSafePath(input.path as string);
        if (!filePath) {
          return { success: false, error: "Path is outside workspace" };
        }
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, input.content as string, "utf-8");
        return { success: true, result: `File written to ${input.path}` };
      }

      case "list_files": {
        const dirPath = resolveSafePath(input.path as string);
        if (!dirPath) {
          return { success: false, error: "Path is outside workspace" };
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        }));
        return { success: true, result: files };
      }

      default:
        return { success: false, error: `Unknown file tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
