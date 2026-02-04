import "dotenv/config";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { Orchestrator } from "./orchestrator.js";

const WORKSPACE_DIR = path.resolve(process.cwd(), "workspace");

const PORT = 3000;

type SSEClient = {
  res: http.ServerResponse;
};

let clients: SSEClient[] = [];

function sendEvent(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    client.res.write(message);
  });
}

// Patch console.log to capture agent events
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  originalLog(...args);
  const message = args.map(String).join(" ");

  // Parse orchestrator messages
  if (message.includes("[Orchestrator] Assigning task to")) {
    const agent = message.match(/to (\w+)/)?.[1];
    sendEvent("agent_start", { agent });
  } else if (message.includes("[Orchestrator]") && message.includes("completed")) {
    const agent = message.match(/\] (\w+) completed/)?.[1];
    sendEvent("agent_complete", { agent });
  } else if (message.includes("Using tool:")) {
    const match = message.match(/\[(\w+)\] Using tool: (\w+)/);
    if (match) {
      sendEvent("tool_use", { agent: match[1], tool: match[2] });
    }
  } else if (message.includes("Tool result:")) {
    const match = message.match(/\[(\w+)\] Tool result: (\w+)/);
    if (match) {
      sendEvent("tool_result", { agent: match[1], success: match[2] === "success" });
    }
  }
};

async function runResearch(topic: string, sourceUrl?: string) {
  const orchestrator = new Orchestrator();
  orchestrator.createAgent("researcher", "researcher");
  orchestrator.createAgent("writer", "writer");
  orchestrator.createAgent("reviewer", "reviewer");

  sendEvent("pipeline_start", { topic });

  const url = sourceUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replace(/ /g, "_"))}`;

  const results = await orchestrator.runPipeline([
    {
      agent: "researcher",
      task: `Research the following topic by fetching content from this URL: ${url}

Extract the key points and main concepts about "${topic}". Provide a structured summary of what you find.`,
    },
    {
      agent: "writer",
      task: (researchResults) => `Based on the following research, write a concise summary document and save it to "summary.md" in the workspace:

Research findings:
${researchResults}

Create a well-formatted markdown document with:
- A title
- Key points as bullet points
- A brief conclusion`,
    },
    {
      agent: "reviewer",
      task: `Read the file "summary.md" from the workspace and review it.

Provide feedback on:
1. Clarity and organization
2. Completeness of information
3. Specific suggestions for improvement`,
    },
  ]);

  // Read summary.md and extract conclusion
  let conclusion = "No conclusion found.";
  try {
    const summaryPath = path.join(WORKSPACE_DIR, "summary.md");
    const summaryContent = await fs.readFile(summaryPath, "utf-8");
    const conclusionMatch = summaryContent.match(/## Conclusion\s*\n+([\s\S]*?)(?=\n##|$)/i);
    if (conclusionMatch) {
      conclusion = conclusionMatch[1].trim();
    }
  } catch {
    // File might not exist
  }

  sendEvent("pipeline_complete", {
    results: {
      researcher: results[0],
      writer: results[1],
      reviewer: results[2],
    },
    conclusion,
  });

  return results;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve static files
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await fs.readFile(path.join(process.cwd(), "public", "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  // SSE endpoint for real-time updates
  if (url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const client: SSEClient = { res };
    clients.push(client);

    req.on("close", () => {
      clients = clients.filter((c) => c !== client);
    });

    return;
  }

  // API endpoint to start research
  if (url.pathname === "/api/research" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { topic, sourceUrl } = JSON.parse(body);
        if (!topic) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Topic is required" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "started", topic }));

        // Run in background
        runResearch(topic, sourceUrl).catch((err) => {
          sendEvent("error", { message: err.message });
        });
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
