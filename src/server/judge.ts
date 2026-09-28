// judge_review (spec.md > Tool — judge_review): a dedicated, unsparing evaluation pass.
// The judge model sees ONLY the plan docs + the builder's declared evidence — it never
// invents a demo, and it scores against the contest's judging criteria.

import { generateText } from "ai";
import { getModel } from "../lib/llm";
import type { Judgment } from "./db";

const JUDGE_SYSTEM = `You are a Devpost judge at the end of judging period: fair, ruthless, and specific.
You score ONLY against evidence provided. If evidence is missing for a criterion, say so and score low — never imagine a demo, a video, or a repo.
You write like an ops chief: short, direct, no flattery. Every risk names the concrete thing to fix.

Return STRICT JSON matching:
{"criteria":[{"name":"Design","score":"1-10","notes":"..."},{"name":"Impact",...},{"name":"Innovation",...},{"name":"Presentation",...}],"top_risks":["...","...","..."]}
Scores are always out of 10 — in the JSON and in any narration of the scorecard. Never use another scale.
No markdown fence, no commentary outside the JSON.`;

export async function judgeWork(input: {
  planDocs: { kind: string; body: string }[];
  buildNotes: string;
  demoUrl?: string;
  judgingCriteria: string[];
}): Promise<Judgment> {
  const plan = input.planDocs.map((d) => `--- ${d.kind}.md ---\n${d.body}`).join("\n\n");
  const prompt = `CONTEST JUDGING CRITERIA: ${input.judgingCriteria.join(", ")}

THE PLAN (what was promised):
${plan || "(no plan docs saved)"}

BUILDER'S DECLARED EVIDENCE:
Build notes: ${input.buildNotes || "(none provided)"}
Demo URL: ${input.demoUrl || "(none provided)"}

Score each criterion 1-10 with specific notes citing what the plan says vs what the evidence shows. List the top 3 risks, weighted toward presentation (the usual killer).`;

  const result = await generateText({
    model: getModel(),
    system: JUDGE_SYSTEM,
    prompt,
  });

  const text = result.text.trim().replace(/^```json\s*|```\s*$/g, "");
  const parsed = JSON.parse(text) as Judgment;
  if (!Array.isArray(parsed.criteria) || !Array.isArray(parsed.top_risks)) {
    throw new Error("Judge returned malformed JSON");
  }
  return parsed;
}
