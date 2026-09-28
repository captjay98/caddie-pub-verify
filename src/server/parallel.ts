// Parallel Search + Extract (spec.md > External Services and Dependencies).
// Primary read path for JS-heavy Devpost pages.

import { env } from "cloudflare:workers";

const KEY = () => {
  const key = env.PARALLEL_API_KEY;
  if (!key) throw new Error("PARALLEL_API_KEY is missing — put it in .dev.vars (local) or wrangler secret (deploy).");
  return key;
};

export type SearchMatch = { title: string; url: string; excerpt: string };

export async function parallelSearchDevpost(query: string, _maxResults = 8): Promise<SearchMatch[]> {
  const res = await fetch("https://api.parallel.ai/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY() },
    body: JSON.stringify({
      objective: `Find active hackathons on Devpost relevant to: ${query}`,
      search_queries: [query, `${query} site:devpost.com hackathon`],
      // GA /v1/search rejects max_results and source_policy as body extras
      // (they belong to other API generations); domain scoping is in the objective.
    }),
  });
  if (!res.ok) throw new Error(`Parallel Search HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { results?: { title?: string; url: string; excerpts?: string[] }[] };
  return (data.results ?? []).map((r) => ({
    title: r.title ?? r.url,
    url: r.url,
    excerpt: (r.excerpts ?? []).join(" ").slice(0, 400),
  }));
}

export async function parallelExtract(url: string, objective: string): Promise<{ title: string; markdown: string }> {
  const res = await fetch("https://api.parallel.ai/v1/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": KEY() },
    body: JSON.stringify({
      urls: [url],
      objective,
      advanced_settings: { full_content: { max_chars_per_result: 60000 } },
    }),
  });
  if (!res.ok) throw new Error(`Parallel Extract HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    results?: { title?: string; full_content?: string; excerpts?: string[] }[];
    errors?: unknown[];
  };
  const r = data.results?.[0];
  const markdown = r?.full_content || (r?.excerpts ?? []).join("\n") || "";
  if (!markdown || markdown.length < 400) throw new Error(`Could not read usable text from ${url}.`);
  return { title: r?.title ?? url, markdown };
}
