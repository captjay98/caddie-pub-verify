// Weekly scout (scheduled job): search Devpost, rank against the builder's
// profile, write a "This week's picks" card, and email a digest.
// Runs as job_type `scout_hackathons`; reschedules 7 days out.

import { generateText } from "ai";
import { getModel } from "../lib/llm";
import * as store from "./db";
import { fetchOpenDevpostContests, rankContests } from "./discover";
import { sendEmail, emailShell } from "./email";

export type ScoutPick = {
  title: string;
  url: string;
  why: string;
  verdict: "worth it" | "stretch" | "skip";
};

const SCOUT_SYSTEM = `You scout Devpost for a hackathon builder. Rank the candidate contests against their profile and return the 3-5 that best fit.
Rules:
- Pick ONLY from the candidates listed in the prompt — never invent a contest or a URL.
- Prefer OPEN contests with future deadlines; flag ended ones as "skip".
- "worth it" = fits stack + hours + country eligibility. "stretch" = real fit but tight on hours/deadline. "skip" = ended, wrong stack, or exclusionary.
- One sharp "why" per pick, in the builder's voice (chief-of-staff, no fluff).
Return STRICT JSON: {"picks":[{"title":"","url":"","why":"","verdict":"worth it|stretch|skip"}]}
No markdown fence, no commentary outside the JSON.`;

export async function runWeeklyScout(userId: number): Promise<{ picks: ScoutPick[]; emailed: boolean }> {
  const profile = await store.getProfile(userId);
  const stack = profile?.stack?.trim() || "general web developer";
  const hours = profile?.hours_per_week ?? 10;
  const country = profile?.country ?? "";

  // Candidates come from the live Devpost open-contests feed — every entry is
  // a real, currently-open contest page (open_state === "open", not
  // invite-only), pre-ranked for stack match and major-org presence. No web
  // search noise, no ended contests.
  const stackTerms = stack.split(",").map((s) => s.trim()).filter(Boolean);
  const ranked = rankContests(await fetchOpenDevpostContests(), stackTerms);
  const candidates = ranked.slice(0, 10).map((c) => ({
    title: c.title,
    url: c.url,
    excerpt: `${c.org ?? "Independent"} · ${c.dates ?? "dates unstated"} · ${c.timeLeft ?? "clock unknown"} · prizes ${c.prizeAmount ?? "—"} · themes: ${c.themes.join(", ") || "—"}`,
  }));
  if (candidates.length === 0) throw new Error("Scout found no open Devpost contests this week — nothing to rank.");

  const result = await generateText({
    model: getModel(),
    system: SCOUT_SYSTEM,
    prompt: `BUILDER PROFILE: stack=${stackTerms.join(", ") || "unspecified"}; hours/week=${hours}; country=${country || "unknown"}.\nCANDIDATES (all verified open):\n${candidates
      .map((c) => `- ${c.title} | ${c.url} | ${c.excerpt.slice(0, 240)}`)
      .join("\n")}\n\nRank the best 3-5.`,
  });
  const text = result.text.trim().replace(/^```json\s*|```\s*$/g, "");
  const parsed = JSON.parse(text) as { picks?: ScoutPick[] };
  const picks = Array.isArray(parsed.picks) ? parsed.picks.slice(0, 5) : [];
  if (picks.length === 0) throw new Error("Scout returned no picks.");

  // Pin each pick to the real candidate page by title match (the model can
  // paraphrase titles or echo the wrong URL — honesty over a full board).
  const pickRows = picks.map((p) => {
    const byTitle = candidates.filter((c) => c.title && (c.title.toLowerCase().includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(c.title.toLowerCase())));
    const candidate = byTitle[0];
    const url = candidate?.url ?? p.url;
    return { ...p, url };
  });
  const contestRows = pickRows.filter((p) => candidates.some((c) => c.url === p.url));
  if (contestRows.length === 0) throw new Error("Scout picks did not resolve to real contest pages.");

  // Card (contest-agnostic: contest_id NULL shows on every bag). Body is built
  // here from structured picks — one blank line per row — so the renderer's
  // block parser never sees a merged blob.
  await store.setCardItems(
    userId,
    "scout",
    [
      {
        title: "This week's picks",
        body: contestRows
          .map((p) => `${p.title} → ${p.url}\n${p.verdict === "worth it" ? "Worth it" : p.verdict === "stretch" ? "Stretch" : "Skip"}: ${p.why}`)
          .join("\n\n"),
        severity: "ok",
        action_label: "See the picks",
        action_tool: "open_detail",
      },
    ],
    null,
  );

  // Email digest.
  const user = await store.getUserById(userId);
  let emailed = false;
  if (user) {
    const rows = contestRows
      .map(
        (p) =>
          `<li style="margin:10px 0"><a href="${p.url}" style="color:#4d9fff;font-weight:600">${p.title}</a> — <span style="color:${
            p.verdict === "worth it" ? "#3ecf8e" : p.verdict === "stretch" ? "#f0a83c" : "#ff7a83"
          }">${p.verdict}</span><br/><span style="color:#c8cdd8">${p.why}</span></li>`,
      )
      .join("");
    const res = await sendEmail(
      user.email,
      "This week's hackathon picks",
      emailShell(
        "Weekly scout",
        `<p>Ranked for your bag — ${stack} · ${hours}h/wk${country ? ` · ${country}` : ""}.</p><ul style="padding-left:18px">${rows}</ul><p style="color:#8b93a3">Open Caddie to put one on the bag and read the fine print.</p>`,
      ),
    );
    emailed = res.sent;
  }
  return { picks: contestRows, emailed };
}