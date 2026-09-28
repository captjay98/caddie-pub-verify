import { env } from "cloudflare:workers";
import type { UIMessage } from "ai";

// D1 access (spec.md > Data Model). Single default thread in the POC.
export function db(): D1Database {
  return env.DB;
}

function now(): string {
  return new Date().toISOString();
}

export type ProfileRow = {
  id: number;
  name: string;
  stack: string | null;
  hours_per_week: number | null;
  goals: string | null;
  country: string | null;
  experience_level: string | null;
  timezone: string | null;
  updated_at: string;
};

export type UserRow = { id: number; email: string; password_hash: string; salt: string };

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  return db()
    .prepare("SELECT id, email, password_hash, salt FROM users WHERE email = ?1")
    .bind(email.toLowerCase())
    .first<UserRow>();
}

export async function getUserById(id: number): Promise<{ id: number; email: string } | null> {
  return db().prepare("SELECT id, email FROM users WHERE id = ?1").bind(id).first<{ id: number; email: string }>();
}

export async function createUser(email: string, passwordHash: string, salt: string): Promise<number> {
  const result = await db()
    .prepare("INSERT INTO users (email, password_hash, salt, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(email.toLowerCase(), passwordHash, salt, now())
    .run();
  return Number(result.meta.last_row_id);
}

/** Reads the signed caddie_session cookie inside a server function context. */
export async function currentUserId(): Promise<number | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie("caddie_session");
  const { verifySession } = await import("./auth");
  const payload = await verifySession(token);
  return payload?.userId ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie("caddie_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie("caddie_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getProfile(userId: number | null): Promise<ProfileRow | null> {
  if (!userId) return null;
  const { results } = await db()
    .prepare("SELECT id, name, stack, hours_per_week, goals, country, experience_level, timezone, updated_at FROM profile WHERE user_id = ?1 ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .all<ProfileRow>();
  return results[0] ?? null;
}

export type ProfileInput = {
  name: string;
  stack: string;
  hoursPerWeek: number;
  goals: string;
  country?: string;
  experienceLevel?: string;
  timezone?: string;
};

export async function saveProfile(userId: number, input: ProfileInput): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO profile (name, stack, hours_per_week, goals, country, experience_level, timezone, user_id, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT(user_id) DO UPDATE SET
         name = ?1, stack = ?2, hours_per_week = ?3, goals = ?4,
         country = ?5, experience_level = ?6, timezone = ?7, updated_at = ?9`,
    )
    .bind(input.name, input.stack, input.hoursPerWeek, input.goals, input.country ?? null, input.experienceLevel ?? null, input.timezone ?? null, userId, now())
    .run();
}

export async function ensureThread(userId: number): Promise<number> {
  const existing = await db()
    .prepare("SELECT id FROM threads WHERE user_id = ?1 ORDER BY id LIMIT 1")
    .bind(userId)
    .first<{ id: number }>();
  if (existing) return existing.id;
  const result = await db()
    .prepare("INSERT INTO threads (title, user_id, created_at) VALUES ('default', ?1, ?2)")
    .bind(userId, now())
    .run();
  return Number(result.meta.last_row_id);
}

// Full UIMessages cross the server-function boundary as JSON strings —
// TanStack's serializer rejects UIMessage's `metadata: unknown` field.
export async function getMessages(threadId: number): Promise<string[]> {
  const { results } = await db()
    .prepare("SELECT content FROM messages WHERE thread_id = ?1 ORDER BY id")
    .bind(threadId)
    .all<{ content: string }>();
  return results.map((r) => r.content);
}

export async function appendMessage(threadId: number, message: UIMessage): Promise<void> {
  await db()
    .prepare("INSERT INTO messages (thread_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(threadId, message.role, JSON.stringify(message), now())
    .run();
}

export async function getCardItems(userId: number | null): Promise<CardItemRow[]> {
  if (!userId) return [];
  const contestId = await getActiveContestId(userId);
  const { results } = await db()
    .prepare(
      "SELECT * FROM card_items WHERE user_id = ?1 AND dismissed = 0 AND (contest_id IS NULL OR contest_id = ?2) ORDER BY sort, id",
    )
    .bind(userId, contestId)
    .all<CardItemRow>();
  return results;
}

export async function dismissCardItem(id: number, userId: number): Promise<void> {
  await db()
    .prepare("UPDATE card_items SET dismissed = 1, updated_at = ?2 WHERE id = ?1 AND user_id = ?3")
    .bind(id, now(), userId)
    .run();
}

export async function clearTheBag(userId: number): Promise<void> {
  await db().prepare("DELETE FROM card_items WHERE user_id = ?1").bind(userId).run();
}

export type CardItemRow = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  severity: string | null;
  action_label: string | null;
  action_tool: string | null;
  sort: number | null;
  updated_at: string;
};

function resetCardType(type: string): Promise<void> {
  return db().prepare("DELETE FROM card_items WHERE type = ?1").bind(type).run().then(() => undefined);
}

export type CardItemInsert = {
  title: string;
  body?: string | null;
  severity?: string | null;
  action_label?: string | null;
  action_tool?: string | null;
};

export async function setCardItems(
  userId: number,
  type: string,
  items: CardItemInsert[],
  contestId: number | null = null,
): Promise<void> {
  await db()
    .prepare("DELETE FROM card_items WHERE user_id = ?1 AND type = ?2 AND (contest_id IS ?3 OR ?3 IS NULL)")
    .bind(userId, type, contestId)
    .run()
    .then(() => undefined);
  let sort = 0;
  for (const item of items) {
    await db()
      .prepare(
        "INSERT INTO card_items (type, title, body, severity, action_label, action_tool, sort, updated_at, user_id, contest_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
      )
      .bind(type, item.title, item.body ?? null, item.severity ?? null, item.action_label ?? null, item.action_tool ?? null, sort++, now(), userId, contestId)
      .run();
  }
}

export async function upsertContest(userId: number, url: string, title: string, deadlineAt: string | null): Promise<number> {
  const existing = await db()
    .prepare("SELECT id FROM contests WHERE user_id = ?1 AND url = ?2")
    .bind(userId, url)
    .first<{ id: number }>();
  if (existing) {
    if (deadlineAt) {
      await db().prepare("UPDATE contests SET deadline_at = ?1 WHERE id = ?2").bind(deadlineAt, existing.id).run();
    }
    return existing.id;
  }
  // A newly found contest goes on the bag as primary.
  await db().prepare("UPDATE contests SET active = 0 WHERE user_id = ?1").bind(userId).run();
  const result = await db()
    .prepare("INSERT INTO contests (title, url, deadline_at, source, created_at, user_id, active) VALUES (?1, ?2, ?3, 'devpost', ?4, ?5, 1)")
    .bind(title, url, deadlineAt, now(), userId)
    .run();
  return Number(result.meta.last_row_id);
}

export async function insertSnapshot(
  contestId: number,
  contentMd: string,
  status: string,
): Promise<number> {
  const hash = await hashContent(contentMd);
  const result = await db()
    .prepare("INSERT INTO snapshots (contest_id, fetched_at, content_hash, html_or_md, status) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(contestId, now(), hash, contentMd, status)
    .run();
  return Number(result.meta.last_row_id);
}

export async function hashContent(contentMd: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contentMd));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ClaimInput = { kind: string; text: string };

export async function insertClaims(
  contestId: number,
  snapshotId: number,
  claims: ClaimInput[],
  sourceUrl: string,
): Promise<number> {
  for (const claim of claims) {
    await db()
      .prepare("INSERT INTO claims (snapshot_id, kind, text, source_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(snapshotId, claim.kind, claim.text, sourceUrl, now())
      .run();
  }
  if (claims.length > 0) {
    await db().prepare("UPDATE contests SET source = ?1 WHERE id = ?2").bind(sourceUrl, contestId).run();
  }
  return claims.length;
}

export async function getActiveContestId(userId: number): Promise<number | null> {
  const active = await db()
    .prepare("SELECT id FROM contests WHERE user_id = ?1 AND active = 1 ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first<{ id: number }>();
  if (active) return active.id;
  // fall back to latest
  const latest = await db()
    .prepare("SELECT id FROM contests WHERE user_id = ?1 ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first<{ id: number }>();
  return latest?.id ?? null;
}

export async function setActiveContest(userId: number, contestId: number): Promise<void> {
  await db().prepare("UPDATE contests SET active = 0 WHERE user_id = ?1").bind(userId).run();
  await db().prepare("UPDATE contests SET active = 1 WHERE user_id = ?1 AND id = ?2").bind(userId, contestId).run();
}

export async function listContests(userId: number): Promise<{ id: number; title: string; active: number }[]> {
  const { results } = await db()
    .prepare("SELECT id, title, active FROM contests WHERE user_id = ?1 ORDER BY active DESC, id DESC")
    .bind(userId)
    .all<{ id: number; title: string; active: number }>();
  return results;
}

export async function getLatestDeadline(userId: number | null): Promise<string | null> {
  if (!userId) return null;
  const row = await db()
    .prepare("SELECT deadline_at FROM contests WHERE user_id = ?1 AND deadline_at IS NOT NULL ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first<{ deadline_at: string }>();
  return row?.deadline_at ?? null;
}

export type PlanDocRow = { id: number; kind: string; body: string; created_at: string };

export async function recordRepo(userId: number, fullName: string, url: string): Promise<void> {
  await db()
    .prepare("INSERT INTO repos (full_name, url, created_at, user_id) VALUES (?1, ?2, ?3, ?4)")
    .bind(fullName, url, now(), userId)
    .run();
}

export async function getLatestRepo(userId: number | null): Promise<{ full_name: string; url: string } | null> {
  if (!userId) return null;
  return db()
    .prepare("SELECT full_name, url FROM repos WHERE user_id = ?1 ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first<{ full_name: string; url: string }>();
}

export async function getLatestSnapshotForContest(contestId: number): Promise<{ id: number; content_hash: string | null } | null> {
  return db()
    .prepare("SELECT id, content_hash FROM snapshots WHERE contest_id = ?1 AND status = 'ok' ORDER BY id DESC LIMIT 1")
    .bind(contestId)
    .first<{ id: number; content_hash: string | null }>();
}

export async function getSnapshotMarkdown(id: number): Promise<string | null> {
  const row = await db().prepare("SELECT html_or_md FROM snapshots WHERE id = ?1").bind(id).first<{ html_or_md: string }>();
  return row?.html_or_md ?? null;
}

export async function saveDigest(contestId: number, digest: ContestDigest): Promise<void> {
  // Replace-on-write: one digest per contest, latest wins (no unbounded growth).
  await db().prepare("DELETE FROM card_items WHERE type = 'contest-digest-data' AND title = ?1").bind(`digest:${contestId}`).run();
  await db()
    .prepare(
      "INSERT INTO card_items (type, title, body, sort, updated_at) VALUES ('contest-digest-data', ?1, ?2, 0, ?3)",
    )
    .bind(`digest:${contestId}`, JSON.stringify(digest), now())
    .run();
}

export async function getLatestDigest(contestId: number): Promise<ContestDigest | null> {
  const row = await db()
    .prepare("SELECT body FROM card_items WHERE type = 'contest-digest-data' AND title = ?1 ORDER BY id DESC LIMIT 1")
    .bind(`digest:${contestId}`)
    .first<{ body: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.body);
  } catch {
    return null;
  }
}

export type Judgment = {
  criteria: { name: string; score: string; notes: string }[];
  top_risks: string[];
};

export async function saveJudgment(userId: number, judgment: Judgment): Promise<void> {
  // Bars + the why: "Design → 1/10 · zero visual proof to evaluate"
  const scores = judgment.criteria
    .map((c) => `${c.name} → ${c.score}/10 · ${(c.notes ?? "").split(/[.—]/)[0].trim().slice(0, 90)}`)
    .join("\n");
  await setCardItems(userId, "judge-watch", [
    {
      title: "How the judges will hit you — scorecard ready",
      body: `${scores}\nTop risk → ${judgment.top_risks[0] ?? "none recorded"}\nNote → Fix presentation first; it is the cheapest score to move and the first thing judges see.`,
      severity: "warn",
      action_label: "Open scorecard",
      action_tool: "open_judgment",
    },
  ]);
  // Raw JSON for the panel lives in a data card The Card never renders.
  await setCardItems(userId, "judge-watch-data", [{ title: "data", body: JSON.stringify(judgment) }]);
}

export async function getLatestJudgment(userId: number | null): Promise<Judgment | null> {
  if (!userId) return null;
  // Raw JSON lives on the data card; the display card carries human text.
  const row = await db()
    .prepare("SELECT body FROM card_items WHERE user_id = ?1 AND type = 'judge-watch-data' ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first<{ body: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.body) as Judgment;
  } catch {
    return null;
  }
}

export type TaskRowLite = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  status: string;
  due_at: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  error: string | null;
};

export async function getTasksLite(userId: number | null): Promise<TaskRowLite[]> {
  if (!userId) return [];
  const { results } = await db()
    .prepare(
      "SELECT id, type, title, body, status, due_at, next_run_at, last_run_at, error FROM tasks WHERE user_id = ?1 ORDER BY status = 'done', COALESCE(due_at, next_run_at), id",
    )
    .bind(userId)
    .all<TaskRowLite>();
  return results;
}

/** Submission checklist, due dates anchored to the contest deadline. */export async function seedSubmissionChecklist(userId: number, deadlineAt: string | null): Promise<void> {
  const existing = await db()
    .prepare("SELECT COUNT(*) n FROM tasks WHERE user_id = ?1 AND type = 'checklist'")
    .bind(userId)
    .first<{ n: number }>();
  if ((existing?.n ?? 0) > 0) return;
  const items = [
    { title: "Record the demo video (under 3 minutes)", offsetH: -72 },
    { title: "Make the repo public and add a license", offsetH: -48 },
    { title: "Write the Devpost description", offsetH: -48 },
    { title: "Run the judge review and fix the top risk", offsetH: -24 },
    { title: "Submit on Devpost (the human swings)", offsetH: -2 },
  ];
  for (const item of items) {
    const due =
      deadlineAt && !Number.isNaN(new Date(deadlineAt).getTime())
        ? new Date(new Date(deadlineAt).getTime() + item.offsetH * 3600 * 1000).toISOString()
        : null;
    await db()
      .prepare("INSERT INTO tasks (type, title, status, due_at, created_at, updated_at, user_id) VALUES ('checklist', ?1, 'open', ?2, ?3, ?3, ?4)")
      .bind(item.title, due, now(), userId)
      .run();
  }
}

export async function savePlanDoc(userId: number, contestId: number | null, kind: string, body: string): Promise<void> {
  await db()
    .prepare("INSERT INTO plan_docs (contest_id, kind, body, created_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(contestId, kind, body, now(), userId)
    .run();
}

export async function getLatestPlanDocs(userId: number | null): Promise<PlanDocRow[]> {
  if (!userId) return [];
  // Latest body per kind (one interview at a time in the POC).
  const out: PlanDocRow[] = [];
  for (const kind of ["scope", "prd", "spec"]) {
    const row = await db()
      .prepare("SELECT id, kind, body, created_at FROM plan_docs WHERE user_id = ?1 AND kind = ?2 ORDER BY id DESC LIMIT 1")
      .bind(userId, kind)
      .first<PlanDocRow>();
    if (row) out.push(row);
  }
  return out;
}

export type ContestDigest = {
  headline: string;
  bullets: string[];
  watch_out: string;
};

export type ContestDetail = {
  contest: { id: number; title: string; url: string; deadline_at: string | null };
  claims: { id: number; kind: string; text: string; source_url: string | null }[];
  digest: ContestDigest | null;
};

export async function getLatestContestDetail(userId: number | null): Promise<ContestDetail | null> {
  if (!userId) return null;
  const contestId = await getActiveContestId(userId);
  if (!contestId) return null;
  const contest = await db()
    .prepare("SELECT id, title, url, deadline_at FROM contests WHERE id = ?1")
    .bind(contestId)
    .first<ContestDetail["contest"]>();
  if (!contest) return null;
  const { results } = await db()
    .prepare(
      "SELECT c.id, c.kind, c.text, c.source_url FROM claims c JOIN snapshots s ON s.id = c.snapshot_id WHERE s.contest_id = ?1 ORDER BY c.id",
    )
    .bind(contest.id)
    .all<ContestDetail["claims"][number]>();
  const digest = await getLatestDigest(contest.id);
  return { contest, claims: results, digest };
}
