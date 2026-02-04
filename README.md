# Multi-Agent Research System

A TypeScript demonstration of orchestrated AI agents using the Anthropic SDK. Three specialized agents work together to research topics, write summaries, and review content.

## Agents

| Agent | Role | Tools |
|-------|------|-------|
| **Researcher** | Fetches and analyzes web content | `fetch_url`, `http_request` |
| **Writer** | Creates structured documents | `read_file`, `write_file`, `list_files` |
| **Reviewer** | Reviews and analyzes output | `read_file`, `run_code` |

## Setup

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Usage

### CLI Demo

```bash
npm start
```

Runs a demo pipeline that researches the Anthropic Model Spec, writes a summary, and reviews it.

### Web Interface

```bash
npm run server
```

Open http://localhost:3000 to use the web interface:

1. Enter a research topic
2. Click "Initialize"
3. Watch agents process in real-time
4. View results from each agent

## Project Structure

```
├── src/
│   ├── index.ts          # CLI demo
│   ├── server.ts         # Web server with SSE
│   ├── agent.ts          # Agent class with tool execution
│   ├── orchestrator.ts   # Multi-agent coordination
│   └── tools/
│       ├── index.ts      # Tool registry
│       ├── file-tools.ts # File operations (sandboxed to workspace/)
│       ├── web-tools.ts  # HTTP requests
│       └── code-tools.ts # JavaScript execution (sandboxed VM)
├── public/
│   └── index.html        # Web frontend
└── workspace/            # Sandboxed directory for agent file operations
```

## How It Works

1. **Orchestrator** creates agents with role-specific system prompts and tools
2. **Pipeline** passes tasks sequentially, with each agent's output available to the next
3. **Agent** runs an agentic loop: sends messages to Claude, executes tool calls, repeats until done
4. **Tools** are sandboxed (files restricted to `workspace/`, code runs in Node VM)

## License

MIT
