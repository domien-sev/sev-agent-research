/**
 * Web search tool using the Brave Search API.
 *
 * Brave Search offers a generous free tier (1 req/sec, 2000/month)
 * and doesn't require a Google account.
 *
 * Falls back to a no-results response if the API key is missing
 * or the request fails, so the agent can still operate in dev mode.
 */

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_RESULTS = 10;

export async function searchBrave(
  query: string,
  count: number = MAX_RESULTS,
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.warn("[brave-search] BRAVE_API_KEY not set — returning empty results");
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  const response = await fetch(`${BRAVE_API_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave Search API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as BraveSearchResponse;
  const webResults = data.web?.results ?? [];

  return webResults
    .filter((r): r is Required<Pick<BraveWebResult, "title" | "url" | "description">> & BraveWebResult =>
      Boolean(r.title && r.url && r.description),
    )
    .map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));
}
