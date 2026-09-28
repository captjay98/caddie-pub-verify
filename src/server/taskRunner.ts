// Task runner (spec.md > Components > Task Runner (Worker)).
// POC runs short jobs in-request (the spec's sanctioned shortcut); cron enqueues
// due scheduled tasks into the same runner.

import { recheckRules } from "./recheck";
import * as store from "./db";

export type TaskRow = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  status: string;
  job_type: string | null;
  user_id: number | null;
  payload_json: string | null;
  due_at: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function getTasks(userId: number): Promise<TaskRow[]> {
  const { results } = await store.db()
    .prepare("SELECT * FROM tasks WHERE user_id = ?1 ORDER BY status = 'done', COALESCE(due_at, next_run_at), id")
    .bind(userId)
    .all<TaskRow>();
  return results;
}

export async function createTask(
  userId: number,
  input: {
    type: string;
    title: string;
    body?: string | null;
    jobType?: string | null;
    payload?: unknown;
    dueAt?: string | null;
    nextRunAt?: string | null;
  },
): Promise<number> {
  const result = await store.db()
    .prepare(
      "INSERT INTO tasks (type, title, body, status, job_type, payload_json, due_at, next_run_at, created_at, updated_at, user_id) VALUES (?1, ?2, ?3, 'open', ?4, ?5, ?6, ?7, ?8, ?8, ?9)",
    )
    .bind(
      input.type,
      input.title,
      input.body ?? null,
      input.jobType ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
      input.dueAt ?? null,
      input.nextRunAt ?? null,
      new Date().toISOString(),
      userId,
    )
    .run();
  return Number(result.meta.last_row_id);
}

export async function updateTaskStatus(id: number, status: string, error?: string | null, userId?: number): Promise<void> {
  // userId required for client-driven mutations; the runner passes the task's
  // owner so a raw id can never touch another user's task.
  if (!userId) return;
  await store.db()
    .prepare("UPDATE tasks SET status = ?1, error = ?2, last_run_at = ?3, updated_at = ?3 WHERE id = ?4 AND user_id = ?5")
    .bind(status, error ?? null, new Date().toISOString(), id, userId)
    .run();
}

export async function rescheduleTask(id: number, nextRunAt: string): Promise<void> {
  await store.db()
    .prepare("UPDATE tasks SET status = 'open', next_run_at = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(nextRunAt, new Date().toISOString(), id)
    .run();
}

/** Runs one agent/scheduled job to completion (short jobs only). */
export async function runTask(taskId: number, userId: number): Promise<void> {
  const task = await store.db().prepare("SELECT * FROM tasks WHERE id = ?1 AND user_id = ?2").bind(taskId, userId).first<TaskRow>();
  if (!task) return;
  await updateTaskStatus(taskId, "running", null, task.user_id ?? userId);
  try {
    if (task.job_type === "scout_hackathons") {
      const { runWeeklyScout } = await import("./scout");
      const result = await runWeeklyScout(task.user_id ?? 1);
      await updateTaskStatus(taskId, "done", null, task.user_id ?? userId);
      if (task.user_id && result.emailed) {
        // Keep the digest outcome visible on the lane.
        await createTask(task.user_id, {
          type: "checklist",
          title: "Review this week's scout picks",
          body: `${result.picks.length} contests ranked — the digest email has the links.`,
        });
      }
      return;
    }
    if (task.job_type === "checklist_due") {
      const { runChecklistDigest } = await import("./checklistDigest");
      const result = await runChecklistDigest(task.user_id ?? 1);
      await updateTaskStatus(taskId, "done", null, task.user_id ?? userId);
      return;
    }
    if (task.job_type === "recheck_rules") {
      const result = await recheckRules(task.user_id ?? 1);
      if (!("failed" in result)) {
        if (result.changed) {
          await createTask(task.user_id ?? 1, {
            type: "checklist",
            title: "Review what changed and re-pin claims",
            body: "recheck_rules detected a rules change — deltas are in chat history.",
          });
          // Scheduled rechecks email the builder when rules move (slice 12).
          if (task.type === "scheduled" && task.user_id) {
            const email = await store
              .db()
              .prepare("SELECT email FROM users WHERE id = ?1")
              .bind(task.user_id)
              .first<{ email: string }>();
            if (email) {
              const { sendEmail, emailShell } = await import("./email");
              await sendEmail(
                email.email,
                "Rules changed on the contest in your bag",
                emailShell(
                  "The rules moved",
                  `<p>A scheduled re-check found <strong>changes</strong> in the contest rules for the bag:
                   <a href="http://localhost:3000" style="color:#4d9fff">open Caddie</a> and re-pin the claims before they bite.</p>
                   <p style="color:#f0a83c">Deadline-adjacent changes rank highest — check What changed on The Card.</p>`,
                ),
              );
            }
          }
        }
      }
      await updateTaskStatus(taskId, "done", null, task.user_id ?? userId);
      return;
    }
    throw new Error(`Unknown job_type: ${task.job_type ?? "(none)"}`);
  } catch (e) {
    await updateTaskStatus(taskId, "failed", String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300), task.user_id ?? userId);
  }
}

/** Cron entry: run every due scheduled task. */
export async function runDueScheduledTasks(): Promise<number> {
  const now = new Date().toISOString();
  const { results } = await store.db()
    .prepare("SELECT id, user_id, job_type FROM tasks WHERE type = 'scheduled' AND status != 'running' AND next_run_at IS NOT NULL AND next_run_at <= ?1")
    .bind(now)
    .all<{ id: number; user_id: number | null; job_type: string | null }>();
  for (const row of results) {
    await runTask(row.id, row.user_id ?? 1);
    // Re-book: scouts weekly, checklist digests daily, re-checks every 12h.
    const intervalMs =
      row.job_type === "scout_hackathons"
        ? 7 * 24 * 3600 * 1000
        : row.job_type === "checklist_due"
          ? 24 * 3600 * 1000
          : 12 * 3600 * 1000;
    const next = new Date(Date.now() + intervalMs).toISOString();
    await rescheduleTask(row.id, next);
  }
  return results.length;
}
