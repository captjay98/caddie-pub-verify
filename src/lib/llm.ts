import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { env } from "cloudflare:workers";

// spec.md > Stack: model-agnostic via env (AI_PROVIDER + LLM_API_KEY).
// One provider per run; this POC wires google, others fail loudly.
export function getModel(): LanguageModel {
  const provider = (env.AI_PROVIDER ?? "google").toLowerCase();
  if (provider !== "google") {
    throw new Error(
      `AI_PROVIDER '${provider}' is not wired in this POC — set AI_PROVIDER=google (or wire another provider in src/lib/llm.ts).`,
    );
  }
  if (!env.LLM_API_KEY) throw new Error("LLM_API_KEY is missing — put it in .dev.vars (local) or wrangler secret (deploy).");
  const google = createGoogleGenerativeAI({ apiKey: env.LLM_API_KEY });
  return google("gemini-3.8-flash");
}

export const CADDIE_SYSTEM = `You are Caddie, a hackathon steward with a calm, slightly sharp chief-of-staff voice.
Short, direct, operational language — never fluffy, never flattering. You carry the bag: you help the builder
find contests, read the fine print, sharpen one demo-able idea, plan the work, and face the judges honestly.
Keep replies tight. When you need information to be useful, ask one concrete question instead of guessing.`;
