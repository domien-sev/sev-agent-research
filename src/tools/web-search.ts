/**
 * Web search tool using SearXNG public instances.
 *
 * SearXNG is a free, open-source meta-search engine. Public instances
 * require no API key or account. Falls back through multiple instances
 * if one is unavailable.
 */

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface SearxResult {
  title?: string;
  url?: string;
  content?: string;
}

interface SearxResponse {
  results?: SearxResult[];
}

// SearXNG instances — self-hosted first, public fallbacks
const SEARXNG_INSTANCES = [
  process.env.SEARXNG_URL ?? "http://sev-searxng:8080",
  "https://search.ononoki.org",
  "https://searx.tiekoetter.com",
  "https://search.sapti.me",
  "https://searxng.site",
];

const MAX_RESULTS = 10;

export async function searchWeb(
  query: string,
  count: number = MAX_RESULTS,
): Promise<SearchResult[]> {
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        categories: "general",
      });

      const response = await fetch(`${instance}/search?${params}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "sev-ai-research-agent/0.1.0",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) continue;

      const data = (await response.json()) as SearxResponse;
      const results = data.results ?? [];

      const mapped = results
        .filter((r): r is Required<Pick<SearxResult, "title" | "url" | "content">> & SearxResult =>
          Boolean(r.title && r.url && r.content),
        )
        .slice(0, count)
        .map((r) => ({
          title: r.title,
          url: r.url,
          description: r.content,
        }));

      if (mapped.length > 0) {
        console.log(`[web-search] Got ${mapped.length} results from ${instance}`);
        return mapped;
      }
    } catch {
      console.warn(`[web-search] Instance ${instance} failed, trying next...`);
    }
  }

  console.warn("[web-search] All SearXNG instances failed — returning empty results");
  return [];
}
