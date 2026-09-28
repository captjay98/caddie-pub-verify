// Daily checklist digest (scheduled job): one email when submission-checklist
// items come due, with the contest deadline countdown in the header.
// Runs as job_type `checklist_due`; reschedules 24h out.
// Design note: this is the single reminder mechanism — the deadline reminder
// case is covered by the countdown header (items are seeded with due dates
// anchored to the deadline), so a separate T-48h/T-24h email would duplicate.

import * as store from "./db";
import { sendEmail, emailShell } from "./email";
import { formatTimeUntil, formatTimeAgo } from "../lib/format";

export type DueItem = { title: string; due_at: string | null };

export async function runChecklistDigest(userId: number): Promise<{ due: DueItem[]; emailed: boolean }> {
  const contest = await store.getLatestContestDetail(userId);
  const deadline = contest?.contest.deadline_at ?? null;

  // Items that came due since the last daily run (24h window) and are still
  // open — old overdue rows were already emailed on the day they crossed.
  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const { results } = await store
    .db()
    .prepare(
      "SELECT title, due_at FROM tasks WHERE user_id = ?1 AND type = 'checklist' AND status != 'done' AND due_at IS NOT NULL AND due_at <= ?2 AND due_at > ?3 ORDER BY due_at",
    )
    .bind(userId, new Date().toISOString(), since)
    .all<DueItem>();
  const due = results;
  if (due.length === 0) return { due, emailed: false };

  const user = await store.getUserById(userId);
  if (!user) return { due, emailed: false };

  const rows = due
    .map(
      (d) =>
        `<li style="margin:8px 0"><span style="color:#e6e9ef;font-weight:600">${d.title}</span><br/><span style="color:#f0a83c;font-size:12px">due ${formatTimeAgo(d.due_at)}</span></li>`,
    )
    .join("");
  const countdown = deadline
    ? `<p style="color:#c8cdd8">Submission closes <strong style="color:#e6e9ef">${formatTimeUntil(deadline)}</strong>${contest?.contest.title ? ` — ${contest.contest.title}` : ""}.</p>`
    : "";
  const res = await sendEmail(
    user.email,
    `${due.length} submission item${due.length > 1 ? "s" : ""} due on the bag`,
    emailShell(
      "Submission checklist",
      `${countdown}<p style="color:#c8cdd8">Due now on the bag:</p><ul style="padding-left:18px">${rows}</ul><p style="color:#8b93a3">Open Caddie to check them off — the human swings.</p>`,
    ),
  );
  return { due, emailed: res.sent };
}