/**
 * Builds a structured research summary from search results.
 *
 * This is the deterministic summarization layer — it formats and
 * organizes search results into a readable report. For AI-powered
 * synthesis, the OpenClaw skill layer handles that via Claude.
 */

import type { SearchResult } from "../tools/web-search.js";

export function buildResearchSummary(
  query: string,
  results: SearchResult[],
): string {
  const sections: string[] = [];

  // Header
  sections.push(`## Research: ${query}`);
  sections.push("");

  // Key findings (top 5 results)
  const topResults = results.slice(0, 5);
  sections.push("### Key Findings");
  sections.push("");

  for (const [i, result] of topResults.entries()) {
    sections.push(`**${i + 1}. ${result.title}**`);
    sections.push(result.description);
    sections.push(`Source: ${result.url}`);
    sections.push("");
  }

  // Additional sources (if more than 5)
  if (results.length > 5) {
    sections.push("### Additional Sources");
    sections.push("");
    for (const result of results.slice(5)) {
      sections.push(`- [${result.title}](${result.url})`);
    }
    sections.push("");
  }

  // Metadata
  sections.push("---");
  sections.push(
    `*${results.length} sources found | ${new Date().toISOString().split("T")[0]}*`,
  );

  return sections.join("\n");
}
