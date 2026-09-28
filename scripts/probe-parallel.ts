// Slice 1 risk probe: prove Parallel Extract returns usable text for the
// Devpost Learn contest pages (spec.md > Decisions and Open Issues).
// Run: npm run probe:parallel   (reads PARALLEL_API_KEY from env or .env)

import { readFileSync } from "node:fs";

const BASE = "https://api.parallel.ai/v1/extract";
const URLS = [
  "https://learn-ai-basics.devpost.com/",
  "https://learn-ai-basics.devpost.com/rules",
];
const OBJECTIVE =
  "Hackathon deadline, eligibility requirements, prizes, judging criteria, and submission requirements";

type ExtractResult = {
  url: string;
  title?: string;
  excerpts?: string[];
  full_content?: string;
};

type ExtractResponse = {
  results?: ExtractResult[];
  errors?: { url?: string; message?: string }[];
};

const key = process.env.PARALLEL_API_KEY ?? loadDotEnvKey();
if (!key) {
  console.error("PARALLEL_API_KEY is not set. Export it or put it in .env and rerun.");
  process.exit(2);
}

function loadDotEnvKey(): string | undefined {
  try {
    const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
      .split("\n")
      .find((l) => l.startsWith("PARALLEL_API_KEY="));
    return line?.slice("PARALLEL_API_KEY=".length).trim();
  } catch {
    return undefined;
  }
}

const res = await fetch(BASE, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": key,
  },
  body: JSON.stringify({
    urls: URLS,
    objective: OBJECTIVE,
    advanced_settings: { full_content: true },
  }),
});

if (!res.ok) {
  console.error(`Extract API HTTP ${res.status}:`, (await res.text()).slice(0, 500));
  process.exit(1);
}

const data = (await res.json()) as ExtractResponse;

if (data.errors?.length) {
  console.error("Extract API reported per-URL errors:", JSON.stringify(data.errors, null, 2));
}

let usable = 0;
for (const r of data.results ?? []) {
  const text = r.full_content || (r.excerpts ?? []).join("\n");
  const ok = !!text && text.length > 400;
  if (ok) usable++;
  console.log(
    `\n=== ${r.url}\n    title: ${r.title ?? "(none)"}  bytes: ${text?.length ?? 0}  usable: ${ok}`,
  );
  if (ok) console.log(text!.slice(0, 1200).replace(/\s+\n/g, "\n") + "\n    ...");
}

if (usable === 0) {
  console.error("\nFAIL: no URL returned usable text (>400 chars). The read path is not proven.");
  process.exit(1);
}
console.log(`\nPASS: ${usable}/${URLS.length} URLs returned usable markdown.`);
