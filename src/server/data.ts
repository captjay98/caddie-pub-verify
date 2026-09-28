import { createServerFn } from "@tanstack/react-start";
import * as store from "./db";

export type Bootstrap = {
  authed: boolean;
  email: string | null;
  profile: store.ProfileRow | null;
  /** Stored UIMessages as JSON strings — parsed client-side (serializer constraint). */
  messageStrings: string[];
  cardItems: store.CardItemRow[];
  /** Submission deadline of the most recent contest, for the countdown. */
  deadlineAt: string | null;
  planDocs: store.PlanDocRow[];
  tasks: store.TaskRowLite[];
  contests: { id: number; title: string; active: number }[];
};

export const getBootstrap = createServerFn({ method: "GET" }).handler(async (): Promise<Bootstrap> => {
  const userId = await store.currentUserId();
  if (!userId) {
    return { authed: false, email: null, profile: null, messageStrings: [], cardItems: [], deadlineAt: null, planDocs: [], tasks: [], contests: [] };
  }
  const profile = await store.getProfile(userId);
  const threadId = await store.ensureThread(userId);
  const [messageStrings, cardItems, deadlineAt, planDocs, tasks, contests] = await Promise.all([
    store.getMessages(threadId),
    store.getCardItems(userId),
    store.getLatestDeadline(userId),
    store.getLatestPlanDocs(userId),
    store.getTasksLite(userId),
    store.listContests(userId),
  ]);
  const email = (await store.getUserById(userId))?.email ?? null;
  return { authed: true, email, profile, messageStrings, cardItems, deadlineAt, planDocs, tasks, contests };
});

export const toggleChecklist = createServerFn({ method: "POST" })
  .validator((input: { id: number; done: boolean }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    const { updateTaskStatus } = await import("./taskRunner");
    await updateTaskStatus(data.id, data.done ? "done" : "open", null, userId);
  });

export const dismissCard = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    await store.dismissCardItem(data.id, userId);
  });

export const clearBag = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await store.currentUserId();
  if (!userId) throw new Error("Not signed in");
  await store.clearTheBag(userId);
});

export const createChecklistTask = createServerFn({ method: "POST" })
  .validator((input: { title: string }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    const { createTask } = await import("./taskRunner");
    const deadlineAt = await store.getLatestDeadline(userId);
    const due =
      deadlineAt && !Number.isNaN(new Date(deadlineAt).getTime())
        ? new Date(new Date(deadlineAt).getTime() - 24 * 3600 * 1000).toISOString()
        : null;
    await createTask(userId, { type: "checklist", title: data.title, dueAt: due });
  });

export const retryAgentTask = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    const { runTask } = await import("./taskRunner");
    await runTask(data.id, userId);
  });

export const switchContest = createServerFn({ method: "POST" })
  .validator((input: { contestId: number }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    await store.setActiveContest(userId, data.contestId);
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .validator((input: { id: number; status: string }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    const { updateTaskStatus } = await import("./taskRunner");
    await updateTaskStatus(data.id, data.status, null, userId);
  });

export const saveProfile = createServerFn({ method: "POST" })
  .validator((input: { name: string; stack: string; hoursPerWeek: number; goals: string; country?: string; experienceLevel?: string; timezone?: string }) => input)
  .handler(async ({ data }) => {
    const userId = await store.currentUserId();
    if (!userId) throw new Error("Not signed in");
    await store.saveProfile(userId, data);
  });

export const register = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const { getUserByEmail, createUser, setSessionCookie } = await import("./db");
    const { hashPassword, newSalt, validEmail, signSession } = await import("./auth");
    if (!validEmail(data.email)) return { ok: false as const, error: "That email doesn't look valid." };
    if (data.password.length < 8) return { ok: false as const, error: "Password needs at least 8 characters." };
    const existing = await getUserByEmail(data.email);
    if (existing) return { ok: false as const, error: "That email already has a bag — log in instead." };
    const salt = newSalt();
    const hash = await hashPassword(data.password, salt);
    const userId = await createUser(data.email, hash, salt);
    await setSessionCookie(await signSession({ userId, issuedAt: Date.now() }));
    return { ok: true as const };
  });

export const login = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const { getUserByEmail, setSessionCookie } = await import("./db");
    const { hashPassword, signSession } = await import("./auth");
    const user = await getUserByEmail(data.email);
    if (!user) return { ok: false as const, error: "No bag under that email — register first." };
    const hash = await hashPassword(data.password, user.salt);
    if (hash !== user.password_hash) return { ok: false as const, error: "Wrong password." };
    await setSessionCookie(await signSession({ userId: user.id, issuedAt: Date.now() }));
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSessionCookie } = await import("./db");
  await clearSessionCookie();
});

export const forgotPassword = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const { getUserByEmail, db } = await import("./db");
    const { hashPassword, newSalt } = await import("./auth");
    const { sendEmail, emailShell } = await import("./email");
    const user = await getUserByEmail(data.email);
    // Same response either way — never disclose whether an account exists.
    if (!user) return { ok: true as const, message: "If that email has a bag, a temporary password is on its way." };
    const temp = `caddie-${crypto.getRandomValues(new Uint8Array(6)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`;
    const salt = newSalt();
    const hash = await hashPassword(temp, salt);
    await db()
      .prepare("UPDATE users SET password_hash = ?1, salt = ?2 WHERE id = ?3")
      .bind(hash, salt, user.id)
      .run();
    const result = await sendEmail(
      data.email,
      "Your Caddie temporary password",
      emailShell(
        "Password reset",
        `<p>Here is your temporary password:</p>
         <p style="font-family:monospace;font-size:16px;background:#151922;padding:8px 12px;border-radius:8px">${temp}</p>
         <p>Log in with it, then set a new one from <strong>Settings</strong>. Keep it safe — this email shouldn't be forwarded.</p>`,
      ),
    );
    if (!result.sent) {
      return { ok: false as const, error: `Email isn't configured yet (${result.skipped ?? result.error}). Ask the admin to reset it via CLI.` };
    }
    return { ok: true as const, message: "If that email has a bag, a temporary password is on its way." };
  });

export const getContestDetail = createServerFn({ method: "GET" }).handler(
  async (): Promise<store.ContestDetail | null> => store.getLatestContestDetail(await store.currentUserId()),
);

export const getLatestRepo = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ full_name: string; url: string } | null> => store.getLatestRepo(await store.currentUserId()),
);

export const getLatestJudgment = createServerFn({ method: "GET" }).handler(
  async (): Promise<store.Judgment | null> => store.getLatestJudgment(await store.currentUserId()),
);
