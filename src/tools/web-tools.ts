import { Tool, ToolResult } from "./index.js";

export const webTools: Tool[] = [
  {
    name: "fetch_url",
    description:
      "Fetch content from a URL using a GET request. Returns the response body as text.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "http_request",
    description:
      "Make an HTTP request with configurable method, headers, and body.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to request",
        },
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        },
        headers: {
          type: "object",
          description: "Optional HTTP headers as key-value pairs",
          additionalProperties: { type: "string" },
        },
        body: {
          type: "string",
          description: "Optional request body (for POST, PUT, PATCH)",
        },
      },
      required: ["url", "method"],
    },
  },
];

export async function executeWebTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "fetch_url": {
        const response = await fetch(input.url as string);
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        const text = await response.text();
        const truncated =
          text.length > 10000 ? text.slice(0, 10000) + "\n...[truncated]" : text;
        return { success: true, result: truncated };
      }

      case "http_request": {
        const options: RequestInit = {
          method: input.method as string,
          headers: input.headers as Record<string, string> | undefined,
        };
        if (input.body && ["POST", "PUT", "PATCH"].includes(options.method!)) {
          options.body = input.body as string;
        }
        const response = await fetch(input.url as string, options);
        const text = await response.text();
        const truncated =
          text.length > 10000 ? text.slice(0, 10000) + "\n...[truncated]" : text;
        return {
          success: true,
          result: {
            status: response.status,
            statusText: response.statusText,
            body: truncated,
          },
        };
      }

      default:
        return { success: false, error: `Unknown web tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
