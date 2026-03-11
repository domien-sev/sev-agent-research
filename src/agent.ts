import { BaseAgent } from "@domien-sev/agent-sdk";
import type { AgentConfig } from "@domien-sev/agent-sdk";
import type { RoutedMessage, AgentResponse, Artifact } from "@domien-sev/shared-types";
import { createItem } from "@directus/sdk";
import { searchWeb } from "./tools/web-search.js";
import { buildResearchSummary } from "./handlers/summarize.js";

export class ResearchAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async onStart(): Promise<void> {
    this.logger.info("Research agent started — ready for queries");
  }

  async onStop(): Promise<void> {
    this.logger.info("Research agent shutting down");
  }

  async handleMessage(message: RoutedMessage): Promise<AgentResponse> {
    const query = message.text.trim();
    this.logger.info(`Research request from ${message.user_id}: ${query}`);

    if (!query) {
      return this.reply(message, "Please provide a research query.");
    }

    // Check for delegation keywords
    if (this.shouldDelegate(query)) {
      return this.handleDelegation(message, query);
    }

    try {
      this.status = "busy";

      // Step 1: Web search
      this.logger.info("Searching the web...");
      const searchResults = await searchWeb(query);

      if (searchResults.length === 0) {
        this.status = "online";
        return this.reply(message, `No results found for: "${query}". Try rephrasing your query.`);
      }

      // Step 2: Build summary
      this.logger.info(`Found ${searchResults.length} results, building summary...`);
      const summary = buildResearchSummary(query, searchResults);

      // Step 3: Store as artifact in Directus
      const artifact = await this.storeArtifact(query, summary, searchResults);
      this.logger.info(`Artifact stored: ${artifact.id ?? "unknown"}`);

      // Step 4: Store in shared memory for other agents
      await this.setMemory(`research:${Date.now()}`, {
        query,
        summary: summary.substring(0, 500),
        artifact_id: artifact.id,
        source_count: searchResults.length,
      });

      this.status = "online";

      return this.reply(
        message,
        `${summary}\n\n---\n_Research stored as artifact. ${searchResults.length} sources analyzed._`,
      );
    } catch (err) {
      this.status = "online";
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Research failed: ${errMsg}`);
      return this.reply(message, `Research failed: ${errMsg}`);
    }
  }

  private reply(message: RoutedMessage, text: string): AgentResponse {
    return {
      channel_id: message.channel_id,
      thread_ts: message.thread_ts ?? message.ts,
      text,
    };
  }

  private shouldDelegate(query: string): boolean {
    const lower = query.toLowerCase();
    return (
      lower.startsWith("write ") ||
      lower.startsWith("publish ") ||
      lower.startsWith("code ") ||
      lower.startsWith("refactor ")
    );
  }

  private async handleDelegation(
    message: RoutedMessage,
    query: string,
  ): Promise<AgentResponse> {
    const lower = query.toLowerCase();
    let targetAgent: string;
    let reason: string;

    if (lower.startsWith("write ") || lower.startsWith("publish ")) {
      targetAgent = "content";
      reason = "content writing/publishing";
    } else if (lower.startsWith("code ") || lower.startsWith("refactor ")) {
      targetAgent = "openhands";
      reason = "code changes";
    } else {
      targetAgent = "orchestrator";
      reason = "unclear scope";
    }

    await this.delegateTask(targetAgent, query, {
      original_channel: message.channel_id,
      original_user: message.user_id,
    });

    return this.reply(
      message,
      `This looks like ${reason} — I've delegated to the **${targetAgent}** agent. They'll pick it up shortly.`,
    );
  }

  private async storeArtifact(
    query: string,
    summary: string,
    sources: Array<{ title: string; url: string }>,
  ): Promise<Artifact> {
    const client = this.directusManager.getClient("sev-ai");

    const artifact: Omit<Artifact, "id" | "date_created" | "date_updated"> = {
      title: `Research: ${query.substring(0, 100)}`,
      type: "research",
      content: JSON.stringify({
        query,
        summary,
        sources: sources.map((s) => ({ title: s.title, url: s.url })),
        generated_at: new Date().toISOString(),
      }),
      created_by: "research",
      tags: ["research", "auto-generated"],
    };

    // @ts-ignore — @directus/sdk createItem generic resolves to never for custom schemas
    return client.request(createItem("artifacts", artifact));
  }
}
