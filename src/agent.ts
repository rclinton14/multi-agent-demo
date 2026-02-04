import Anthropic from "@anthropic-ai/sdk";
import { Tool, executeTool } from "./tools/index.js";

export type AgentConfig = {
  name: string;
  systemPrompt: string;
  tools: Tool[];
  model?: string;
};

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export class Agent {
  private client: Anthropic;
  private config: AgentConfig;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(config: AgentConfig) {
    this.client = new Anthropic();
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  async run(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    let response = await this.client.messages.create({
      model: this.config.model ?? "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: this.config.systemPrompt,
      tools: this.config.tools,
      messages: this.conversationHistory,
    });

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`  [${this.name}] Using tool: ${toolUse.name}`);
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        console.log(
          `  [${this.name}] Tool result: ${result.success ? "success" : "error"}`
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      this.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      this.conversationHistory.push({
        role: "user",
        content: toolResults,
      });

      response = await this.client.messages.create({
        model: this.config.model ?? "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: this.config.systemPrompt,
        tools: this.config.tools,
        messages: this.conversationHistory,
      });
    }

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const finalResponse = textBlocks.map((b) => b.text).join("\n");

    this.conversationHistory.push({
      role: "assistant",
      content: response.content,
    });

    return finalResponse;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
