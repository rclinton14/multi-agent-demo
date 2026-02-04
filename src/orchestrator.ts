import { Agent, AgentConfig } from "./agent.js";
import { getToolsByCategory } from "./tools/index.js";

export type AgentRole = "researcher" | "writer" | "reviewer";

const agentConfigs: Record<AgentRole, Omit<AgentConfig, "name">> = {
  researcher: {
    systemPrompt: `You are a Research Agent. Your job is to gather information from the web.
You have access to web tools to fetch URLs and make HTTP requests.
When given a research task:
1. Fetch relevant information from provided URLs
2. Extract key facts and data
3. Summarize your findings clearly
Be thorough but concise in your research.`,
    tools: getToolsByCategory(["web"]),
  },
  writer: {
    systemPrompt: `You are a Writer Agent. Your job is to process information and create written content.
You have access to file tools to read and write files in the workspace.
When given writing tasks:
1. Process the provided information
2. Create only 1 well-structured sentence
3. Save your work to files in the workspace
Focus on clarity and organization in your writing.`,
    tools: getToolsByCategory(["file"]),
  },
  reviewer: {
    systemPrompt: `You are a Reviewer Agent. Your job is to review content and provide feedback.
You have access to file tools to read files and code tools to analyze data.
When reviewing content:
1. Read the content carefully
2. Identify strengths and weaknesses
3. Provide specific, actionable suggestions for improvement
Be constructive and thorough in your reviews.`,
    tools: getToolsByCategory(["file", "code"]),
  },
};

export class Orchestrator {
  private agents: Map<string, Agent> = new Map();

  createAgent(role: AgentRole, name?: string): Agent {
    const agentName = name ?? role;
    const config = agentConfigs[role];
    const agent = new Agent({ ...config, name: agentName });
    this.agents.set(agentName, agent);
    return agent;
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  async runTask(agentName: string, task: string): Promise<string> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }
    console.log(`\n[Orchestrator] Assigning task to ${agentName}...`);
    const result = await agent.run(task);
    console.log(`[Orchestrator] ${agentName} completed task.`);
    return result;
  }

  async runPipeline(
    tasks: { agent: string; task: string | ((prev: string) => string) }[]
  ): Promise<string[]> {
    const results: string[] = [];

    for (const { agent, task } of tasks) {
      const taskPrompt =
        typeof task === "function" ? task(results[results.length - 1] ?? "") : task;
      const result = await this.runTask(agent, taskPrompt);
      results.push(result);
    }

    return results;
  }
}
