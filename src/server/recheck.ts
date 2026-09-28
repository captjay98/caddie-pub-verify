// recheck_rules (spec.md > Tool — recheck_rules): refetch the rules, diff vs the last
// snapshot by content hash. Quiet when nothing changed; never invents deltas.

import { parallelExtract } from "./parallel";
import * as store from "./db";

export type RecheckResult =
  | { changed: false }
  | { changed: true; oldClaims: { kind: string; text: string }[]; newMarkdown: string; url: string; snapshotId: number }
  | { failed: true; detail: string };

export async function recheckRules(userId: number): Promise<RecheckResult> {
  const detail = await store.getLatestContestDetail(userId);
  if (!detail) return { failed: true, detail: "No contest on the bag yet — find one first." };
  const contest = detail.contest;

  const prev = await store.getLatestSnapshotForContest(contest.id);
  const { markdown } = await parallelExtract(
    contest.url,
    "Hackathon deadline, eligibility, prizes, judging criteria, submission requirements",
  );
  const newHash = await store.hashContent(markdown);

  if (prev && prev.content_hash === newHash) {
    await store.setCardItems(userId, "what-changed", [
      {
        title: "Rules unchanged — nothing needs your attention",
        body: `Checked → ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\nSource → ${contest.url}`,
        severity: "ok",
        action_label: "Open detail",
        action_tool: "open_detail",
      },
    ]);
    return { changed: false };
  }

  const snapshotId = await store.insertSnapshot(contest.id, markdown, "ok");
  await store.setCardItems(userId, "what-changed", [
    {
      title: "The rules moved — claims need re-pinning before they bite",
      body: `Changed → vs last snapshot\nImpact → deadline/eligibility deltas in chat\nSource → ${contest.url}`,
      severity: "warn",
      action_label: "Open detail",
      action_tool: "open_detail",
    },
  ]);
  return {
    changed: true,
    oldClaims: detail.claims.map((c) => ({ kind: c.kind, text: c.text })),
    newMarkdown: markdown.slice(0, 9000),
    url: contest.url,
    snapshotId,
  };
}
