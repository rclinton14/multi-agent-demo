import "dotenv/config";
import { Orchestrator } from "./orchestrator.js";

async function main() {
  console.log("=== Multi-Agent Demo ===\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    console.error("Copy .env.example to .env and add your API key");
    process.exit(1);
  }

  const orchestrator = new Orchestrator();

  // Create agents with different roles
  orchestrator.createAgent("researcher", "researcher");
  orchestrator.createAgent("writer", "writer");
  orchestrator.createAgent("reviewer", "reviewer");

  console.log("Created agents: researcher, writer, reviewer\n");

  // Demo scenario: Research, write, and review a topic
  const topic = "the Anthropic Model Spec";
  const sourceUrl = "https://docs.anthropic.com/en/docs/resources/model-spec";

  console.log(`\nStarting demo: Research and summarize "${topic}"\n`);
  console.log("=".repeat(50));

  try {
    const results = await orchestrator.runPipeline([
      {
        agent: "researcher",
        task: `Research the following topic by fetching content from this URL: ${sourceUrl}

Extract the key points and main concepts. Provide a structured summary of what you find.`,
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
3. Specific suggestions for improvement

After your review, use the run_code tool to count the number of words in your review.`,
      },
    ]);

    console.log("\n" + "=".repeat(50));
    console.log("\n=== Final Results ===\n");

    console.log("--- Researcher Output ---");
    console.log(results[0]);

    console.log("\n--- Writer Output ---");
    console.log(results[1]);

    console.log("\n--- Reviewer Output ---");
    console.log(results[2]);

    console.log("\n=== Demo Complete ===");
  } catch (error) {
    console.error("\nError during demo:", error);
    process.exit(1);
  }
}

main();
