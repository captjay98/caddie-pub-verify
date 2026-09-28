// Digest generation (final-review revision): the slide-over leads with a
// machine-written digest, verbatim claims stay one click away. Honesty rule:
// the digest is labeled AI-written; the claims stay verbatim with sources.

import { generateText } from "ai";
import { getModel } from "../lib/llm";
import type { ContestDigest } from "./db";

export type { ContestDigest };

const DIGEST_SYSTEM = `You distill hackathon rules into a decision brief. Calm chief-of-staff voice: short, direct, no fluff.
Return STRICT JSON:
{"headline":"one sentence: what this contest actually is","bullets":["3-5 key → value facts: deadline, eligibility in plain words, must-dos, prizes"],"watch_out":"the single clause most likely to disqualify or surprise a busy builder, or empty string"}
No markdown fence, no commentary outside the JSON.`;

export async function generateDigest(markdown: string): Promise<ContestDigest> {
  const result = await generateText({
    model: getModel(),
    system: DIGEST_SYSTEM,
    prompt: `RULES TEXT (verbatim source):\n${markdown.slice(0, 12000)}\n\nWrite the decision brief.`,
  });
  const text = result.text.trim().replace(/^```json\s*|```\s*$/g, "");
  const parsed = JSON.parse(text) as ContestDigest;
  if (!Array.isArray(parsed.bullets)) throw new Error("Digest returned malformed JSON");
  return parsed;
}
