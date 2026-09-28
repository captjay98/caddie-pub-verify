import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CADDIE_SYSTEM, getModel } from "../../lib/llm";
import { countryName } from "../../lib/countries";
import { parallelExtract, parallelSearchDevpost } from "../../server/parallel";
import { createRepo, pushFile, slugify, setRepoVisibility, licenseText } from "../../server/github";
import { judgeWork } from "../../server/judge";
import { recheckRules } from "../../server/recheck";
import { generateDigest } from "../../server/digest";
import { createTask, runTask, updateTaskStatus } from "../../server/taskRunner";
import { currentUserId } from "../../server/db";
import * as store from "../../server/db";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await store.currentUserId();
        if (!userId) return Response.json({ error: "Not signed in" }, { status: 401 });
        // Card writes land on the active contest's bag (multi-bag: switch primary in the UI).
        const setBagCards = async (type: string, items: Parameters<typeof store.setCardItems>[2]) => {
          const contestId = await store.getActiveContestId(userId);
          await store.setCardItems(userId, type, items, contestId);
        };
        const { messages }: { messages: UIMessage[] } = await request.json();
        const threadId = await store.ensureThread(userId);

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) await store.appendMessage(threadId, lastUser);

        const profile = await store.getProfile(userId);
        const system = profile
          ? `${CADDIE_SYSTEM}

The builder on the bag: ${profile.name}. Stack: ${profile.stack ?? "unspecified"}. Capacity: ${profile.hours_per_week ?? "?"}h/week. Goals: ${profile.goals ?? "unspecified"}. Based in: ${profile.country ? countryName(profile.country) : "unknown"}. Timezone: ${profile.timezone ?? "unknown"}. Experience: ${profile.experience_level ?? "unknown"}.

Presentation rules (the builder reads these like an ops brief, not an essay):
- No walls of text. Max two short paragraphs, then facts as bullet rows in "key → value" form.
- Lead with the consequence, not the label ("Submission closes in 3 weeks — the demo needs a public URL", not "Deadline:").
- Status words inline-colored by the UI: say "worth it", "attention", "blocked" plainly.
- When a tool accepts a "note", always write one: a single closing line of YOUR interpretation — the point of view a chief of staff adds after the data ("onesecos can wait.", "work backwards from this date."). Name the specific thing, never a generic filler.

Tooling rules:
- "find me hackathons" / discovery -> call search_devpost, then present the top 2-3 with a one-line why each, citing each contest's URL.
- A contest is chosen (or a Devpost URL is pasted) -> call fetch_rules on the contest page, then save_claims with every deadline / eligibility / must-do exactly as the rules text states (never invent or restate loosely), including deadline_at parsed to ISO 8601, then save_fit with a verdict (worth_it / stretch / skip) grounded in the builder's stack and hours.
- The builder wants to sharpen an idea -> interview briefly (one question at a time), then call save_kernel with the single demo-able kernel and a scope line. Push back on scope creep — cut until one loop is demo-able.
- The builder is ready to plan -> interview briefly, then call plan_docs with tight, project-specific scope.md / prd.md / spec.md (completeness over length; mirrors the discipline of a real plan-first build).
- "Put it on GitHub" -> confirm the repo name with the builder, then call create_repo (private by default) and immediately push_files with the returned full_name. If GITHUB_TOKEN is missing, say the repo step is skipped and the plan is still saved — never fake a repo.
- "Review me" / the builder says they're done -> ask once for build notes and a demo URL if not provided, then call judge_review. Relay the scorecard plainly and name the top risks — the review must sting honestly.
- "Re-check" / morning brief -> call recheck_rules. If unchanged, say so in one line. If changed, immediately call save_claims with the new verbatim claims and summarize the delta (old vs new), ranking impact (deadline moved > eligibility flipped > noise).
- "Scout" / "weekly picks" / "what should I enter this week" -> call create_task with type scheduled, job_type scout_hackathons, next_run_at one week out (title "Weekly scout"), then offer to run it once now if they want. "Run the scout" / "run it now" -> call create_task with type agent, job_type scout_hackathons (it runs to completion: writes a This-week's-picks card and emails the digest — say the card is on the bag).
- After the submission checklist is seeded (first save_claims), offer to set up the daily checklist email once: create_task with type scheduled, job_type checklist_due, next_run_at tomorrow morning (title "Daily checklist digest"). It emails when items come due, with the deadline countdown in the header — no separate deadline email needed.
- "Make it public" -> confirm once, then call make_public with the repo full_name. Always remind about the open-source license — the contest rules require a detectable license file.
- After creating a repo (or when asked about licenses) -> call add_license with the repo full_name; MIT unless the builder says otherwise.
- Slow work (deep re-checks, scheduled jobs like weekly scouts) -> create_task with type agent or scheduled; the Tasks lane carries the status.
- ELIGIBILITY CROSS-CHECK: the builder's country is in the briefing above ("Based in: …") — use it on EVERY turn that involves a contest. Compare eligibility claims against it: if their country/region appears in an exclusion list, say so LOUDLY in your reply ("⚠ This contest excludes <region> — check the fine print before investing hours"). If they're eligible, one quiet line is enough. Never say the location is unknown when the briefing names it.
- Tone calibrates to experience: first hackathon -> explain jargon; seasoned -> skip basics.
- Keep the final reply tight and operational. Cite the contest URL when you summarize.`
          : CADDIE_SYSTEM;

        const result = streamText({
          model: getModel(),
          system,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(8),
          tools: {
            search_devpost: tool({
              description:
                "List LIVE open Devpost hackathons ranked for this builder — always-current open_state, deadlines, prizes, org (incl. Google, NVIDIA, Amazon, Meta, MLH runs). Use for any discovery ask; the query only focuses the ranking.",
              inputSchema: z.object({
                query: z.string().describe("What kind of hackathon the builder is looking for"),
              }),
              execute: async ({ query }) => {
                const profile = await store.getProfile((await store.currentUserId())!);
                const stackTerms = (profile?.stack ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                try {
                  const { fetchOpenDevpostContests, rankContests } = await import("../../server/discover");
                  const ranked = rankContests(await fetchOpenDevpostContests(), stackTerms).slice(0, 8);
                  const matches = ranked.map((c) => ({
                    title: c.title,
                    url: c.url,
                    excerpt: `${c.org ?? "Independent"} · ${c.dates ?? "dates unstated"} · ${c.timeLeft ?? "clock unknown"} · prizes ${c.prizeAmount ?? "—"} · themes: ${c.themes.join(", ") || "—"} · ${c.registrations.toLocaleString()} registered`,
                  }));
                  return { source: "devpost-open-api", matches };
                } catch (e) {
                  // Feed unreachable — fall back to web search, marked as unverified.
                  const raw = e instanceof Error ? e.message : String(e);
                  const matches = await parallelSearchDevpost(query);
                  return { source: "web-search-fallback (open-state unverified)", fallbackError: raw, matches };
                }
              },
            }),

            fetch_rules: tool({
              description: "Fetch a contest page (or its /rules page) and store a snapshot. Returns readable markdown.",
              inputSchema: z.object({
                url: z.string().url().describe("The Devpost contest URL"),
              }),
              execute: async ({ url }) => {
                const userId = (await store.currentUserId())!;
                try {
                  const { title, markdown } = await parallelExtract(
                    url,
                    "Hackathon deadline, eligibility, prizes, judging criteria, submission requirements",
                  );
                  const cleanTitle = title.replace(/\s*-\s*Devpost\s*$/i, "").replace(/^Build With AI:\s*/i, "");
                  const contestId = await store.upsertContest(userId, url, cleanTitle, null);
                  const snapshotId = await store.insertSnapshot(contestId, markdown, "ok");
                  await setBagCards("header", [
                    {
                      title: cleanTitle,
                      body: `Source → ${url}\nRead → ${markdown.length.toLocaleString()} chars of rules`,
                      action_label: "Open detail",
                      action_tool: "open_detail",
                    },
                  ]);
                  return { contestId, snapshotId, url, chars: markdown.length, markdown: markdown.slice(0, 9000) };
                } catch (e) {
                  // Surface the real failure to the model instead of the SDK's masked error.
                  const raw = e instanceof Error ? e.message : String(e);
                  const detail = raw.split("\n")[0].slice(0, 300);
                  await setBagCards("rules-error", [
                    {
                      title: "Can't read the rules — the source refused",
                      body: `Page → ${url}\nCause → ${detail}`,
                      severity: "danger",
                      action_label: "Retry in chat",
                      action_tool: "retry_fetch",
                    },
                  ]);
                  return { failed: true, detail };
                }
              },
            }),

            save_claims: tool({
              description:
                "Persist extracted rules claims (deadline / eligibility / must_do) for the contest you just fetched. Every claim must come verbatim from fetched text.",
              inputSchema: z.object({
                url: z.string().url().describe("The contest URL the claims came from"),
                deadline_at: z
                  .string()
                  .optional()
                  .describe("The submission deadline parsed from the rules, as ISO 8601 (e.g. 2026-10-26T17:00:00-04:00)"),
                claims: z
                  .array(
                    z.object({
                      kind: z.enum(["deadline", "eligibility", "must_do", "other"]),
                      text: z.string(),
                    }),
                  )
                  .min(1),
                note: z
                  .string()
                  .optional()
                  .describe("One line of your own interpretation as the caddie — the point of view that closes the card (e.g. 'Everything anchors to this date — work backwards from it.')"),
                personal: z
                  .string()
                  .optional()
                  .describe("Eligibility flag for THIS builder: if the rules exclude their country/region, state it as a hard warning; if eligible, one quiet confirmation line"),
              }),
              execute: async ({ url, deadline_at, claims, note, personal }) => {
                const userId = (await store.currentUserId())!;
                const contestId = await store.upsertContest(userId, url, url, deadline_at ?? null);
                const snapshotId = await store.insertSnapshot(contestId, `claims@${new Date().toISOString()}`, "claims");
                const saved = await store.insertClaims(contestId, snapshotId, claims, url);
                const deadlineClaim = claims.find((c) => c.kind === "deadline");
                await setBagCards("deadline", [
                  {
                    title: deadlineClaim
                      ? "Submission closes — the clock is the boss"
                      : "No deadline found in the rules text",
                    body: deadlineClaim
                      ? `Closes → ${deadlineClaim.text}${note ? `\nNote → ${note}` : ""}`
                      : `Stated → nowhere in what was read${note ? `\nNote → ${note}` : ""}`,
                    severity: deadlineClaim ? "warn" : "danger",
                    action_label: "Open detail",
                    action_tool: "open_detail",
                  },
                ]);
                await store.seedSubmissionChecklist(userId, deadline_at ?? null);
                // Digest for the slide-over: summary up top, verbatim claims below.
                try {
                  const latest = await store.getLatestSnapshotForContest(contestId);
                  const snapshotRow = await store.getSnapshotMarkdown(latest?.id ?? snapshotId);
                  const digest = await generateDigest(snapshotRow ?? claims.map((c) => c.text).join("\n"));
                  await store.saveDigest(contestId, digest);
                } catch {
                  // Digest is additive — claims remain the source of truth if it fails.
                }
                return { saved };
              },
            }),

            save_kernel: tool({
              description:
                "Persist the sharpened idea kernel and scope line to The Card during ideation. Call once the idea is one demo-able thing.",
              inputSchema: z.object({
                kernel: z.string().describe("The one demo-able idea: what to demo, who it's for, why it matters"),
                scope_line: z.string().describe("One line bounding what the POC will and won't do"),
              }),
              execute: async ({ kernel, scope_line }) => {
                const userId = (await store.currentUserId())!;
                const kernelHead = kernel.split(/[.—-]/)[0].trim();
                await setBagCards("idea-kernel", [
                  { title: kernelHead || "Idea kernel", body: kernel.slice(kernelHead.length).trim() || kernel },
                ]);
                await setBagCards("scope-line", [
                  { title: scope_line, severity: "ok" },
                ]);
                return { saved: true };
              },
            }),

            plan_docs: tool({
              description:
                "Persist the three planning documents (scope.md, prd.md, spec.md) for the builder's project. Call once per document after the interview settles that part.",
              inputSchema: z.object({
                scope_md: z.string().describe("scope.md — kernel, audience, core loop, POC boundary, cut list"),
                prd_md: z.string().describe("prd.md — journey, screens, behavior, states"),
                spec_md: z.string().describe("spec.md — stack, data model, components, failure modes"),
              }),
              execute: async ({ scope_md, prd_md, spec_md }) => {
                const userId = (await store.currentUserId())!;
                const contest = await store.getLatestContestDetail(userId);
                const contestId = contest?.contest.id ?? null;
                await store.savePlanDoc(userId, contestId, "scope", scope_md);
                await store.savePlanDoc(userId, contestId, "prd", prd_md);
                await store.savePlanDoc(userId, contestId, "spec", spec_md);
                await setBagCards("plan", [
                  {
                    title: "Three docs ready — the plan carries forward",
                    body: "scope.md → written\nprd.md → written\nspec.md → written",
                    severity: "ok",
                    action_label: "Read the plan",
                    action_tool: "open_plan",
                  },
                ]);
                return { saved: 3 };
              },
            }),

            create_repo: tool({
              description:
                "Create a private GitHub repo for the builder's project. Default private; the builder can ask to make it public afterwards. Confirm with the builder before calling.",
              inputSchema: z.object({
                name: z.string().describe("Repo name; will be slugified"),
              }),
              execute: async ({ name }) => {
                const userId = (await store.currentUserId())!;
                try {
                  const repo = await createRepo(slugify(name));
                  await store.recordRepo(userId, repo.full_name, repo.url);
                  await setBagCards("action", [
                    {
                      title: "Repo created — the plan has a home",
                      body: `Repo → ${repo.full_name}\nVisibility → private\nDocs → ready to push`,
                      severity: "ok",
                      action_label: "Open repo",
                      action_tool: "open_repo",
                    },
                  ]);
                  return repo;
                } catch (e) {
                  return { failed: true, detail: String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300) };
                }
              },
            }),

            push_files: tool({
              description:
                "Push the three saved plan documents (scope.md, prd.md, spec.md) into the repo created by create_repo. Fails cleanly if the docs were never generated.",
              inputSchema: z.object({
                full_name: z.string().describe("The repo full_name returned by create_repo (owner/name)"),
              }),
              execute: async ({ full_name }) => {
                const userId = (await store.currentUserId())!;
                try {
                  const docs = await store.getLatestPlanDocs(userId);
                  if (docs.length === 0) {
                    return { failed: true, detail: "No plan docs saved yet — run plan_docs first." };
                  }
                  for (const doc of docs) {
                    await pushFile(full_name, `${doc.kind}.md`, doc.body);
                  }
                  await setBagCards("action", [
                    {
                      title: "The plan is on GitHub — repo materialized with the docs inside",
                      body: `Repo → ${full_name}\nPushed → ${docs.map((d) => d.kind + ".md").join(", ")}\nVisibility → private (ask to flip)\nNote → The plan now lives outside your head — this URL is what judges will clone.`,
                      severity: "ok",
                      action_label: "Open repo",
                      action_tool: "open_repo",
                    },
                  ]);
                  return { pushed: docs.map((d) => `${d.kind}.md`) };
                } catch (e) {
                  return { failed: true, detail: String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300) };
                }
              },
            }),

            judge_review: tool({
              description:
                "Run the unsparing judge review against the saved plan docs and the builder's declared evidence (build notes and/or demo URL). Scores Design/Impact/Innovation/Presentation and lists top risks. Never invents a demo.",
              inputSchema: z.object({
                build_notes: z.string().describe("What the builder actually built and how it went"),
                demo_url: z.string().optional().describe("Link to a demo video or live app, if any"),
              }),
              execute: async ({ build_notes, demo_url }) => {
                const userId = (await store.currentUserId())!;
                try {
                  const docs = await store.getLatestPlanDocs(userId);
                  if (docs.length === 0) {
                    return { failed: true, detail: "No plan docs saved — nothing to judge against yet." };
                  }
                  const judgment = await judgeWork({
                    planDocs: docs,
                    buildNotes: build_notes,
                    demoUrl: demo_url,
                    judgingCriteria: ["Design", "Impact", "Innovation", "Presentation"],
                  });
                  await store.saveJudgment(userId, judgment);
                  return { scored: judgment.criteria.map((c) => `${c.name}: ${c.score}`), top_risks: judgment.top_risks };
                } catch (e) {
                  return { failed: true, detail: String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300) };
                }
              },
            }),

            recheck_rules: tool({
              description:
                "Re-fetch the current contest's rules and compare against the last snapshot. Quiet when nothing changed. If changed, follow up immediately by calling save_claims with the new verbatim claims (including deadline_at).",
              inputSchema: z.object({}),
              execute: async () => {
                const result = await recheckRules((await store.currentUserId())!);
                if ("failed" in result) return result;
                if (!result.changed) return { changed: false };
                return {
                  changed: true,
                  url: result.url,
                  old_claims: result.oldClaims,
                  new_markdown: result.newMarkdown,
                  next_step: "Call save_claims now with the new verbatim claims for this URL.",
                };
              },
            }),

            create_task: tool({
              description:
                "Create a task on the Tasks lane. Types: checklist (a todo), scheduled (a timed job like a weekly scout, daily checklist digest, or nightly re-check — give next_run_at ISO), or agent (promote slow work). job_type: 'recheck_rules' (nightly rules diff), 'scout_hackathons' (weekly search + ranked picks card + digest email), 'checklist_due' (daily email when submission-checklist items come due).",
              inputSchema: z.object({
                type: z.enum(["checklist", "scheduled", "agent"]),
                title: z.string(),
                body: z.string().optional(),
                next_run_at: z.string().optional().describe("ISO datetime, for scheduled tasks"),
                job_type: z.enum(["recheck_rules", "scout_hackathons", "checklist_due"]).optional().describe("For agent/scheduled tasks"),
              }),
              execute: async ({ type, title, body, next_run_at, job_type }) => {
                const userId = (await store.currentUserId())!;
                const id = await createTask(userId, {
                  type,
                  title,
                  body: body ?? null,
                  jobType: job_type ?? null,
                  nextRunAt: type === "scheduled" ? next_run_at ?? null : null,
                });
                let status: string = "open";
                if (type === "agent" && job_type) {
                  await runTask(id, userId);
                  const row = await import("../../server/taskRunner").then((m) => m.getTasks(userId));
                  status = row.find((t) => t.id === id)?.status ?? "done";
                }
                return { taskId: id, status };
              },
            }),

            update_task: tool({
              description: "Update a task: mark done, reopen, or retry a failed agent task.",
              inputSchema: z.object({
                task_id: z.number(),
                status: z.enum(["open", "done", "failed", "retry"]),
              }),
              execute: async ({ task_id, status }) => {
                const userId = (await store.currentUserId())!;
                if (status === "retry") {
                  await runTask(task_id, userId);
                  return { taskId: task_id, status: "ran" };
                }
                await updateTaskStatus(task_id, status);
                return { taskId: task_id, status };
              },
            }),

            make_public: tool({
              description:
                "Flip a repo you created from private to public. Only call after the builder explicitly confirms — this exposes the code.",
              inputSchema: z.object({
                full_name: z.string().describe("owner/name of the repo"),
              }),
              execute: async ({ full_name }) => {
                const userId = (await store.currentUserId())!;
                try {
                  await setRepoVisibility(full_name, true);
                  await setBagCards("action", [
                    {
                      title: "Repo is public — judges can clone it",
                      body: `Repo → ${full_name}\nVisibility → public\nNote → Add an open-source license before submission — the rules require a detectable one.`,
                      severity: "ok",
                      action_label: "Open repo",
                      action_tool: "open_repo",
                    },
                  ]);
                  return { full_name, visibility: "public" };
                } catch (e) {
                  return { failed: true, detail: String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300) };
                }
              },
            }),

            add_license: tool({
              description:
                "Add a LICENSE file (MIT or Apache-2.0) to a repo's root. Contest rules require a detectable open-source license.",
              inputSchema: z.object({
                full_name: z.string().describe("owner/name of the repo"),
                spdx: z.enum(["mit", "apache-2.0"]).optional().describe("License choice, default MIT"),
              }),
              execute: async ({ full_name, spdx }) => {
                const userId = (await store.currentUserId())!;
                try {
                  await pushFile(full_name, "LICENSE", licenseText(spdx ?? "mit"));
                  await setBagCards("action", [
                    {
                      title: "License added — the repo passes the rules check",
                      body: `Repo → ${full_name}\nLicense → ${(spdx ?? "mit").toUpperCase()} at the root\nNote → Contest rules want a detectable license — this satisfies it.`,
                      severity: "ok",
                      action_label: "Open repo",
                      action_tool: "open_repo",
                    },
                  ]);
                  return { full_name, license: (spdx ?? "mit").toUpperCase() };
                } catch (e) {
                  return { failed: true, detail: String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 300) };
                }
              },
            }),

            save_fit: tool({
              description: "Persist the fit verdict for the current contest against the builder's profile.",
              inputSchema: z.object({
                verdict: z.enum(["worth_it", "stretch", "skip"]),
                reasons: z.string().describe("One or two tight lines grounded in the builder's stack and hours"),
                fit_rows: z
                  .array(z.object({ label: z.string(), value: z.string() }))
                  .optional()
                  .describe("2-3 concrete fit facts as label/value pairs (e.g. Time → 12h/week fits a 2-week POC; Stack → TS/React matches)"),
                risks: z.array(z.string()).optional().describe("0-2 named risks, each with the concrete thing to watch"),
                note: z
                  .string()
                  .optional()
                  .describe("Your closing point of view as the caddie — what the builder should do with this verdict"),
              }),
              execute: async ({ verdict, reasons, fit_rows, risks, note }) => {
                const label = verdict === "worth_it" ? "Worth it — clear the calendar" : verdict === "stretch" ? "Stretch — decide with eyes open" : "Skip — not your fight";
                const bodyParts: string[] = [];
                if (fit_rows?.length) {
                  bodyParts.push(...fit_rows.map((r) => `${r.label} → ${r.value}`));
                } else {
                  bodyParts.push(reasons);
                }
                if (risks?.length) bodyParts.push(...risks.map((r) => `Risk → ${r}`));
                if (note) bodyParts.push(`Note → ${note}`);
                await setBagCards("fit", [
                  {
                    title: label,
                    body: bodyParts.join("\n"),
                    severity: verdict === "worth_it" ? "ok" : verdict === "stretch" ? "warn" : "danger",
                    action_label: "Open detail",
                    action_tool: "open_detail",
                  },
                ]);
                return { verdict };
              },
            }),
          },
        });

        return createUIMessageStreamResponse({
          stream: toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
            onFinish: async ({ messages: all }) => {
              const lastAssistant = [...all].reverse().find((m) => m.role === "assistant");
              const text = lastAssistant?.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("")
                .trim();
              // Never persist an empty assistant message (aborted/failed stream).
              if (lastAssistant && text) await store.appendMessage(threadId, lastAssistant);
            },
          }),
        });
      },
    },
  },
});
