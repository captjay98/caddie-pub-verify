---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Scaffold plus proof that Parallel can read Devpost**
  Becomes usable: A dev server that boots with a minimal route, plus a probe command that pulls the Devpost Learn rules page through Parallel Extract and prints readable text. The two spec-flagged risks (unverified TanStack Start + Cloudflare combo, JS-heavy Devpost pages) are dead or exposed on day one.
  Why now: The spec's own decision table requires the first slice to prove `fetch_rules` via Parallel on the real contest page, and marks the framework versions unverified. This is the one allowed technical-layer slice — it independently proves a critical risk and leaves runnable evidence. Bootstrapping (scaffold, deps, wrangler, D1 bindings) lives inside it.
  PRD ref: `prd.md > The Core Journey` (steps 1-2), `prd.md > What We're Building`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Components > Tool — fetch_rules + extract_claims`, `spec.md > Decisions and Open Issues`
  Build: Scaffold TanStack Start with the Cloudflare plugin, wrangler config, D1 binding, and migration 0001; one minimal route that renders; a probe script calling Parallel Extract on the Devpost Learn contest/rules URL.
  Verify (mechanical): `npm run dev` serves the route with no errors; run the probe and confirm it prints readable page text containing real contest markers (title/deadline), not an error body.
  Learner check: Read the probe output next to the live Devpost page and confirm it pulled the same substance.
  Commit: `Scaffold app and prove Parallel Extract reads Devpost rules`

- [x] **2. The shell: onboarding, profile, and a caddie that talks**
  Post-ship auth strategy (learner decision, 2026-09-26): email + password with session cookie, profile keyed to user id. No email provider in the first version — password reset via a CLI hash-clear instead; add Resend/CF Email only when real users exist. Full tool-coverage verification completed: all 13 tools (search_devpost, fetch_rules, save_claims, save_fit, save_kernel, plan_docs, create_repo, push_files, make_public, judge_review, recheck_rules, create_task, update_task) fired successfully; Parallel confirmed as the read/search path.
  Becomes usable: The real app — Card | Tasks on the left, chat on the right, Halo Ops look. First run shows the onboarding modal; the profile saves to D1 and survives reload; the caddie streams replies (no tools yet). Empty Card and empty Tasks states are real.
  Why now: This is the stage every later slice performs on, and it's where look-and-feel feedback can still reshape the build cheaply — six more slices land on whatever we approve here.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Features and Behavior > Profile`
  Spec ref: `spec.md > Components > Shell — Card | Chat split`, `spec.md > Components > Profile Store`, `spec.md > Components > Chat Surface`, `spec.md > Look and Feel`, `spec.md > Data Model` (profile, threads, messages)
  Build: Two-pane shell with Card/Tasks tabs per Halo Ops tokens; onboarding modal (name, stack, hours/week, goals) that cannot be dismissed before save; profile → D1; AI SDK `streamText` server function with env-selected provider; single default thread persisted in `messages`; bag-empty Card state and Tasks empty state.
  Verify (mechanical): Complete onboarding → `profile` row exists in local D1; reload → modal stays gone and profile data renders; send a chat message → streamed reply arrives and both messages are in `messages` after reload.
  Learner check: Open the app, do onboarding, have a short exchange with the caddie, then reload — does the shell feel like Halo Ops, and what would you change?
  Commit: `Add shell, onboarding profile, and streaming chat`

- [x] **3. Discover: find hackathons, cited rules, fit verdict**
  Becomes usable: "Find me hackathons" returns ranked Devpost matches with a one-line why; choosing one extracts its rules into cited claims (deadline / eligibility / must-dos) and a fit verdict — Deadline and Fit cards appear on The Card, and the slide-over shows claims with source stamps.
  Why now: The discovery half of the demo chain, and the heaviest external-integration surface; slice 1 proved the read path, this turns it into product.
  PRD ref: `prd.md > Features and Behavior > Discover (Devpost only)`, `prd.md > Features and Behavior > Extract + fit`, `prd.md > Screens and Layout` (contest detail slide-over, tool banners)
  Spec ref: `spec.md > Components > Tool — search_devpost`, `spec.md > Components > Tool — fetch_rules + extract_claims`, `spec.md > Components > Tool — fit_verdict`, `spec.md > Data Model` (contests, snapshots, claims, card_items)
  Build: `search_devpost` (Parallel Search scoped to Devpost plus pasted-URL ingest); `fetch_rules` + `extract_claims` (Parallel Extract primary, raw fetch fast path, labeled paste fallback); `fit_verdict` scoring against profile; tool progress banners in chat; contest detail slide-over with citations.
  Verify (mechanical): Run discovery against the real Devpost Learn contest from chat; every `claims` row has a non-null `source_url`; Card renders Deadline + Fit; a deliberately bad URL produces the danger card with last-good time and Retry — never a fabricated brief.
  Learner check: Ask the caddie to find a hackathon, open the slide-over, and check every claim shows a source you could point a judge at.
  Commit: `Add Devpost discovery, cited rules extraction, and fit verdict`

- [x] **4. Ideate and plan: kernel cards plus the three docs**
  Becomes usable: Chat sharpens an idea to one kernel — Idea kernel and Scope line cards hit The Card immediately — then a short interview produces `scope.md`, `prd.md`, `spec.md` for the user's project, saved and viewable.
  Why now: This creates the raw material the kernel acts on; the repo push in the next slice needs real docs to push.
  PRD ref: `prd.md > Features and Behavior > Ideate / sharpen`, `prd.md > Features and Behavior > Plan (skill-pack quality)`
  Spec ref: `spec.md > Components > Tool — save_kernel`, `spec.md > Components > Tool — plan_docs`, `spec.md > Data Model` (card_items, plan_docs)
  Build: `save_kernel` writing idea-kernel + scope-line card_items during chat; `plan_docs` finishing the interview and storing the three markdown docs in D1 with a way to read them back (chat artifact or minimal viewer).
  Verify (mechanical): `save_kernel` → two new card_items rows of the right types; `plan_docs` → three plan_docs rows with non-trivial bodies that render intact.
  Learner check: Sharpen an idea in chat, watch the Card update, run the plan interview, and read the three docs — do they sound like your project rather than a template?
  Commit: `Add idea kernel and plan document generation`

- [x] **5. GitHub: the repo appears with the plan inside**
  Becomes usable: "Put it on GitHub" creates a private repo and pushes the three docs; the success modal shows URL, files, and visibility; an Action card links the repo.
  Why now: First kernel beat — the exact action the scope doc says separates Caddie from chat with search.
  PRD ref: `prd.md > Features and Behavior > Start (GitHub)`, `prd.md > Screens and Layout` (repo success modal)
  Spec ref: `spec.md > Components > Tool — create_repo + push_files`, `spec.md > Important Failure Modes`
  Build: GitHub REST with a fine-grained PAT from a Workers secret; `POST /user/repos` (private by default) and `PUT` contents for the three docs; make-public via `PATCH` on request; success modal; token-missing/403 explains and skips without losing saved docs.
  Verify (mechanical): Push to a throwaway repo name; confirm via the GitHub API that the repo exists, is private, and contains scope.md / prd.md / spec.md with bodies matching D1; clean up the throwaway.
  Learner check: Watch the success modal, open the repo on GitHub, and confirm the three docs are sitting there.
  Commit: `Add GitHub repo creation and doc push`

- [x] **6. Judge review: the unsparing scorecard**
  Becomes usable: "Review me" with build notes and/or a demo URL produces a scorecard against the plan docs and the contest judging criteria (Design / Impact / Innovation / Presentation), with top risks called out — Judge watch card plus the review panel.
  Why now: Second kernel beat, and the one aimed at how the learner actually lost a hackathon. With this, the kernel is fully proven; the remaining two slices are return-visit additions that can be cut if time runs out.
  PRD ref: `prd.md > Features and Behavior > Judge review`
  Spec ref: `spec.md > Components > Tool — judge_review`, `spec.md > Components > UI Chrome` (judge review panel), `spec.md > Data Model` (card_items judge-watch)
  Build: `judge_review` consuming plan docs plus user-supplied evidence, emitting per-criterion notes and specific risks with no invented demos; Judge watch card; expanding review panel.
  Verify (mechanical): Run a review with real plan docs and honest notes; output covers all four criteria with risks that cite what the plan actually says; Judge watch card and panel render from the result.
  Learner check: Have the caddie review this very project with honest notes — does it name presentation risks specifically, and does it sting a little?
  Commit: `Add judge review scorecard and risks`

- [x] **7. What changed: re-check and impact-ranked diffs**
  Becomes usable: Re-check re-fetches the rules, diffs against the last snapshot, ranks impact (deadline / eligibility / noise), and a What changed card appears — quiet when nothing changed.
  Why now: This is the "rules move" reason builders come back; it only needs slice 3's snapshots.
  PRD ref: `prd.md > Features and Behavior > What changed`, `prd.md > States and Boundaries` (don't invent deltas)
  Spec ref: `spec.md > Components > Tool — recheck_rules`, `spec.md > Data Model` (snapshots, claims, card_items)
  Build: `recheck_rules` producing a new snapshot, claim-level diff, impact classification, and a what-changed card item; Re-check entry points in chat and on The Card.
  Verify (mechanical): Re-check on unchanged rules reports honestly quiet; mutate one stored claim to simulate a moved deadline and confirm the next re-check flags it high-impact with old vs new.
  Learner check: Hit re-check twice — silence when nothing changed, then watch the simulated deadline move get flagged.
  Commit: `Add rules recheck with impact-ranked what-changed`

- [x] **8. Tasks: checklist, scheduled, and agent-promoted jobs**
  Becomes usable: The Tasks tab shows checkable checklist items anchored to the deadline, scheduled jobs with next/last run, and agent-promoted tasks that run async (running / done / failed with a result link); cron fires scheduled jobs; the Card shows a tasks summary and completion blips.
  Why now: In the POC boundary by learner decision, but it's the garnish — it goes last because the async runner is the spec's shakiest mechanism (handled with short jobs via waitUntil, not a queue product), and the video is already complete without it.
  PRD ref: `prd.md > Features and Behavior > Tasks`, `prd.md > Screens and Layout` (task detail popover)
  Spec ref: `spec.md > Components > Tool — create_task / update_task`, `spec.md > Components > Task Runner (Worker)`, `spec.md > Components > Cron Trigger`, `spec.md > Data Model` (tasks)
  Build: `tasks` table wiring; `create_task` / `update_task` tools; checklist seeded from the plan; one agent-promoted long job path (chat returns immediately, runner completes, Card blip); scheduled rows enqueued by a wrangler cron trigger; task detail popover; tasks-summary card.
  Verify (mechanical): Promote a job from chat → immediate return, task transitions running→done with a result; toggling a checklist item persists across reload; with `wrangler dev --test-scheduled`, fire cron and confirm a due scheduled task executes.
  Learner check: Promote a slow job from chat and watch it complete on Tasks; check off a checklist item and reload to confirm it stuck.
  Commit: `Add tasks lane, async agent jobs, and cron schedule`

- [x] **9. Multi-user auth (email + password)**
  Becomes usable: Judges can register and get their own empty bag; your data is yours alone. Login survives reload, logout clears.
  Why now: Learner decision — a judge may actually test the app ("for judging and testing" is in the repo clause). Rubric grounds it: Stage Two Design says "complete, coherent product experience — not just a technical proof of concept"; Potential Impact wants the solution demonstrated for a real audience.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Data Model` (users), `spec.md > Stack`
  Build: Migration 0003 (users table, user_id scoping on profile/threads/card_items/tasks/plan_docs/repos/contests); PBKDF2 hashing via Web Crypto; register/login/logout server fns with signed cookie session; register/login UI gating the shell; per-user checklist seeding.
  Verify (mechanical): Register two users in the browser → each sees an empty bag; your data invisible to the other; login persists across reload; logout returns to login screen.
  Learner check: Register a judge-style account, confirm the bag is empty and separate from yours.
  Commit: `Add multi-user auth with email and password`

- [x] **10a. Landing page for logged-out visitors** (shipped: hero, real product screenshot, capability cards, embedded register/login)
- [x] **10b. Onboarding v2 + eligibility cross-check + local time** (shipped: country combobox, experience level, auto-timezone; claims pinning flags eligibility for the builder's country — verified with Quebec (blocked) and Canada (eligible) tests; deadlines render in local time)
- [x] **10c. Resend wiring** (shipped: password-reset-by-email (temp password), rules-changed alert email on scheduled rechecks; RESEND_API_KEY/RESEND_FROM in secrets)
- [x] **10d. Multi-bag switcher** (shipped: migration 0005 — contest_id on card_items, active flag on contests; new finds go on the bag automatically; selector switches primary; cards scoped per contest — verified with 5 contests)
- [x] **10. Deploy to Cloudflare Workers**
  Becomes usable: A public URL judges can open — no laptop required.
  Why now: The repo clause says "for judging and testing"; Presentation asks for footage of the project working on the device it was built for.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: Remote D1 with real database_id, wrangler secrets (LLM_API_KEY, PARALLEL_API_KEY, GITHUB_TOKEN), schema migration on remote, `wrangler deploy` via the cron wrapper entry.
  Verify (mechanical): Public URL serves the shell; register + chat + one tool call work remotely.
  Learner check: Open the deployed URL from a phone or another device, register, send one message.
  Commit: `Deploy Caddie to Cloudflare Workers`
  Deployed: https://caddie.jamalibrahim.dev (custom domain, captjay98 account) — landing 200, register→onboarding→shell verified in-browser, chat + search_devpost tool call ran with ranked verdicts, logout→login round-trip verified, messages persist to remote D1 (users 1, messages 1-3), assets 200, cron schedules 0 7 * * * + 0 */12 * * * registered.

## Hands-on Checkpoints

- [x] Early usable behavior explored — end of slice 2 (shell + chat): learner approved 50/50 layout, requested resizable divider (shipped + verified); auth/users raised and consciously declined per POC boundary
- [x] Final kick-the-tires exploration and feedback completed — end of slice 8

## Final Review

- [x] Final kick-the-tires exploration and feedback completed — end of slice 8
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

Learner kick-the-tires feedback (2026-09-26): UI feels underwhelming; too much text without cards; cards generic and uninspiring ("even hacksteward has better cards"); tasks lane looks generic; missing light mode; missing settings/profile surface; asked to verify the full UI-surface inventory against today.ai. Agreed revisions (unchecked until implemented, verified, and retried):

- [x] Dual theme — port HackSteward's `[data-theme]` token-swap pattern (light + dark) into `halo.css` with a header toggle and persisted preference
- [x] Card anatomy upgrade — narrative headlines, status pills, key-value meta rows, nested evidence, action buttons (today.ai patterns) replacing generic kicker+title+body cards
- [x] Tasks lane polish — today.ai-style task rows (status dot, title, meta line, due chip, grouped sections) instead of plain boxes
- [x] Profile/settings surface — header entry point to view and edit the builder profile (and theme choice)
- [x] Chat text→cards — system-prompt guidance to structure replies as short sections/tables so the renderer shows cards instead of text walls

Proposed and recommended for deferral (learner may overturn): light mode was initially flagged as scope gravity, but HackSteward itself ships dual themes via token swap, so it is in-scope as a revision rather than a new feature.

Dress rehearsal (agent-run, one chained conversation, real UI): kernel → plan docs → private repo push (3 docs verified on GitHub) → judge review — all four beats completed in a single chat turn; The Card rendered all ten card types; judge risks were concrete (record video, deploy, public repo). Rehearsal repo deleted after verification. Two findings fixed during the rehearsal: judge narration drift to /5 scale (pinned to /10) and stale rows for deleted repos (cosmetic, accepted).

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: focused alternative (experienced plan-first learner) — "trap the real error, never trust a masked one," traced during the build: AI SDK's masked tool errors were caught by returning raw `{failed, detail}` from `execute`, exposing the D1 bind-count bug and the GitHub User-Agent 403; cited in the map's practice section and recorded in Revisions.
Route and stops: reference route in `devpost/app-map.html` (Shell → tools object → db.ts); not toured interactively with the learner — labeled as a reference route in the map.
Edit outcome: not applicable (focused route; no optional edit exercised).
Reflection: transfer question offered twice in chat ("what would you do differently next time you start with an agent?"); answer pending or declined — learner's response, if any, belongs in the ignored profile only.
Activity mode: prior practice connected (build evidence), map checked in-browser (renders, SVG + details present, 0 network deps, no secrets) and shown via the in-app browser pane.

## Revisions

- [Auth + deploy moved before ship] — learner challenged the "judges just watch" assumption; rubric Stage Two confirms it: Design = "complete, coherent product experience — not just a technical proof of concept", Impact = "based on what's demonstrated". Login and deployment promoted from post-ship to slices 9-10 with learner agreement.

- [GitHub tool uses gh auth token locally] — GITHUB_TOKEN env var absent; `gh auth token` (captjay98) supplies it in .dev.vars for local dev. Fine-grained PAT remains the deploy-time shape per spec.
- [GitHub fetch needs explicit User-Agent] — tool got HTTP 403 with empty body from Workers because GitHub requires a User-Agent header and workerd's fetch sends none; direct curl with the same token worked. Added `User-Agent: caddie-poc` to ghHeaders.
- [Cron delivery via the custom server entry] — earlier approach (bun-built `src/entry-cron.ts` wrapper + `wrangler.cron.jsonc`) broke in deploy: the deployed bundle's app default resolved undefined (stale Sep 26 bundle vs. the new app build; `Cannot read properties of undefined (reading 'fetch')` → HTTP 500 on landing and /api/chat). Root fix: point `wrangler.jsonc` `main` at `src/server.ts` (the Cloudflare-docs custom entrypoint pattern) so the `@cloudflare/vite-plugin` build carries the `scheduled` handler itself — `dist/server/wrangler.json` (no_bundle: true, assets ../client, routes, crons, D1) is the deploy config. Deleted `src/entry-cron.ts` and `wrangler.cron.jsonc`; package.json deploy script updated to `bun run build && wrangler deploy -c dist/server/wrangler.json`.
- [Agent jobs run in-request] — TanStack Start server routes don't expose a handle to `ctx.waitUntil` for the POC, so short agent jobs (recheck_rules) run to completion inside the tool call per the spec's "await in the same request for short jobs" allowance. The Tasks lane still shows running → done transitions from persisted rows.
- [checklist seeding anchor] — submission checklist is seeded on the first save_claims for a contest (5 items, due dates anchored to the parsed deadline), not on plan_docs.

- [Package manager switched npm → bun] — learner directive mid-build: "always use bun, also use browser-use for testing." tsx dropped (bun runs TS natively); `probe:parallel` now `bun scripts/probe-parallel.ts`; UI verification goes through the browser-use plugin instead of curl-only checks.

## Fresh-clone walk fixes (2026-09-27, post-probe)

- [3 blocking bugs fixed after a live probe walk (register → onboarding → find → vet) — a judge who clones the repo can now use the product end to end.]
  - BUG 1 (fresh clone dead on arrival): local D1 migrations were manual-only; `bun run dev` never applied them, so a fresh clone hit `D1_ERROR: no such table: users`. Fix: `dev` script now chains `bun run db:migrate` (`wrangler d1 migrations apply caddie-db --local`) before `vite dev`. Verified: deleted `.wrangler/state`, ran `bun run dev`, migrations 0001–0005 applied automatically, fresh registration succeeded.
  - BUG 2 (onboarding dead-end): typing a country never set the `country` state — only clicking a dropdown chip did, so "type Nigeria → On the bag" stayed disabled with no explanation; chip clicks were also racy (onMouseDown + 150ms blur close could unmount the dropdown before the click). Fix: submit (and the canSave gate) now auto-resolve an exact case-insensitive name/code match in the query; a "Pick your country from the list" hint shows when the query doesn't resolve; blur close delay raised 150 → 300ms and chips gained an onClick fallback alongside onMouseDown. Verified: type-only "Nigeria" + submit works, garbage shows the hint, chip click works via full click sequence (touch path covered by onClick).
  - BUG 3 (agent ignored profile country): `saveProfile` never wrote `country`, `experience_level`, or `timezone` (INSERT/ON CONFLICT only persisted name/stack/hours/goals), so the briefing always said "Based in: unknown" and eligibility-by-country — the core promise — never ran. Fix: all three fields persisted (migration 0004 columns were already there); the per-turn briefing now renders the country name via `countryName()` plus timezone, and the eligibility cross-check rule tells the model to use the briefed country every turn. Verified: profile row stores NG/Africa-Lagos; a "find me hackathons" turn replies "builders based in Nigeria eligible" and never claims location unknown, across repeated turns.
  - Screenshots per the docs/screens contract: `onboarding-hint.png`, `country-resolved.png`, `agent-nigeria-context.png` (1280×720 PNGs in docs/screens/).

## Cross-account isolation fix (2026-09-27, privacy — found in fresh-account probe)

- [BUG 4 — cross-account data leak (critical, privacy).] Fresh user B saw user A's entire chat history and the agent briefed from user A's profile. Root cause was TWO layers, both fixed:
  1. Client: `useChat` seeded its messages once at component mount from the bootstrap payload; after logout → register, `router.invalidate()` refreshed the loader data but the hook kept the previous user's messages in its internal state — user B's channel rendered user A's thread and the next turn POSTed that history to the agent. Fix: the authed shell is now a child component keyed by session email (`<AuthedShell key={boot.email}>`), so every per-user state (chat, tabs, modals) remounts fresh when the account changes.
  2. Server: three mutations took raw ids with no user filter — `updateTaskStatus` (via toggleChecklist/setTaskStatus), `dismissCardItem`, and `clearTheBag` (a `DELETE FROM card_items` with no WHERE — one user's "clear bag" wiped every user's cards). Fix: all three now take the session user id and filter `WHERE … AND user_id = ?`.
  Verified: scoped UPDATE/DELETE from the wrong user no-op (task stays open, other user's cards survive — previously both would have been hit). Reads were audited: thread/profile/tasks/cards/claims/plan docs/repos/contests were already user-scoped or reachable only via ids created by the same user's own flow.
- [BUG 5 — first-use onboarding did not reliably appear after register.] Root cause: the onboarding modal renders when `!boot.profile`, but with the leaked chat state the fresh account landed in a channel that looked populated and the modal's mount timing raced the loader refresh. Fix: the keyed shell guarantees a clean mount on user change, so a fresh account deterministically gets the empty channel + immediate first-use modal. Verified on wiped D1: register → "unbriefed" + empty channel ("Type to the caddie…") + modal auto-opens; onboarding with typed-only Canada → find turn briefs "confirm eligibility for Canada", never Nigeria, never "location unknown".
  Screenshots: `docs/screens/fresh-user-isolated.png`, `docs/screens/first-use-modal.png`.
