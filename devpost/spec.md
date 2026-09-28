---
doc: spec
status: approved
---

# Caddie — Technical Spec

## How This Works, In Plain Language

Caddie is one web app you run on your laptop (and later on Cloudflare). It has two halves on the same screen:

1. **The Card** — a short brief of what matters (deadline, what changed, scope line).
2. **Chat** — a caddie you type to. The caddie is an AI model that can **use tools**.

The tools are the important part. When you type “find me hackathons” or “put it on GitHub,” the model does not guess — it calls a tool. Tools run **on the server** (Cloudflare Worker), so secret keys never sit in the browser.

Tools we give the caddie:

| Tool | What it does |
|---|---|
| `search_devpost` | Look up hackathons on Devpost (Parallel Search + URLs) |
| `fetch_rules` | Download a contest rules page (**Parallel Extract** first — works on JS-heavy pages) |
| `extract_claims` | Pull deadlines / eligibility / must-dos **with the source URL** |
| `fit_verdict` | Score the contest against your profile |
| `save_kernel` | Write idea kernel + scope line to The Card |
| `plan_docs` | Write scope / prd / spec for *your* project |
| `create_repo` + `push_files` | Create a GitHub repo (private default) and push those docs |
| `recheck_rules` | Fetch rules again and say what **changed** |
| `judge_review` | Score your work vs the plan + contest judging criteria |
| `create_task` | Promote slow work (or a checklist/schedule) into a **task** and return immediately |
| `update_task` | Mark done / failed / retry / complete checklist items |

Data (profile, snapshots, plans) lives in **D1** — a small database Cloudflare runs. When you open Caddie, it reads D1 and fills The Card. When a tool changes something, The Card updates. No background scheduler in this version — you press **Re-check** when you want a refresh.

Why this shape: it’s the smallest system that still *proves* the idea (agent + brief + repo + judge) without becoming HackSteward again.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`

1. Browser loads TanStack Start app → reads **profile + card items + thread** from **D1**.
2. User types in **chat** → POST to a server function → **Vercel AI SDK** streams a reply and may call tools.
3. `search_devpost` / `fetch_rules` → Worker `fetch` to Devpost → store **snapshot** + **claims** (with citation URL) in D1 → The Card gets **Fit** / **Deadline** cards.
4. `plan_docs` → model writes three markdown docs → saved in D1 + local export.
5. `create_repo` / `push_files` → GitHub REST (PAT from Workers secret) → repo URL saved → The Card **Action** card shows the link.
6. `recheck_rules` → new snapshot → diff vs last → **What changed** card (impact-ranked).
7. `judge_review` → model scores against plan + judging criteria → **Judge watch** card + chat notes.
8. Slow work: model calls `create_task` → returns to chat → task runs async (Worker) → Tasks lane + Card blip on completion.
9. **Cron** (Cloudflare Trigger) runs scheduled tasks (e.g. nightly `recheck_rules`, morning Card regen) → same task pipeline.
10. The human submits on Devpost. Caddie never submits.

## Stack

| Piece | Choice | Why / tradeoff |
|---|---|---|
| Full-stack app | **TanStack Start** (React, file routes, server functions) | One codebase, SSR for The Card, first-class on Workers |
| Runtime | **Cloudflare Workers** | Free-ish demo, close to prod, secrets in `wrangler` |
| Schedule | **Cloudflare Cron Triggers** | Real timed jobs without a queue product |
| DB | **Cloudflare D1** (SQLite) | Local via wrangler; no separate DB server |
| Agent layer | **Vercel AI SDK** (`ai` package) | `streamText` + `tool()`; model-agnostic providers |
| LLM | **Env-selected provider** (`AI_PROVIDER` + key) | Claude / OpenAI / Gemini without code forks |
| Styling | **Tailwind CSS** + custom Halo Ops tokens from `prd.md` | Fast, maps to design tokens |
| GitHub | **REST v3** + fine-grained PAT (Workers secret) | Simplest path to “repo exists with docs” |
| Reliable web read | **Parallel Extract** (+ Search) | Devpost is often JS-rendered — Parallel returns usable text |
| Local run | **Vite + Cloudflare plugin + wrangler** | Same shape as deploy |

Docs: [TanStack Start](https://tanstack.com/start) · [Cloudflare Workers](https://developers.cloudflare.com/workers/) · [D1](https://developers.cloudflare.com/d1/) · [Vercel AI SDK](https://sdk.vercel.ai/docs) · [GitHub REST](https://docs.github.com/en/rest)

**Unverified until first slice:** exact TanStack Start + Cloudflare plugin versions — check in `5-build` slice 1.

## Where It Runs and How Someone Tries It

- **Runtime:** local Bun + Wrangler (dev), Cloudflare Workers (optional deploy).
- **Needs:** Bun 1.4+, Cloudflare account (for deploy only), one LLM API key, optional `GITHUB_TOKEN` (fine-grained: repo create + contents write).
- **Start:** `bun run dev` → open `http://localhost:3000` (final script names settled in `5-build`).
- **Demo recording:** screen capture of the local app — never requires deploy.
- **Submission:** public GitHub repo + 1–3 min video. Deployment is optional.

## Look and Feel

Implements `prd.md > Look and Feel`.

- **Halo Ops** resting state: `#090b10` / `#101319` / `#151922`, Inter, compact density, decision rails.
- Actions `#4d9fff`, ok `#3ecf8e`, warn `#f0a83c`, danger `#ff7a83`.
- Mono labels (Plex Mono), optional Space Grotesk for large stats.
- Hot alerts: stronger amber rail + primary CTA (04 emphasis) when impact is high.
- Copy voice: short ops language — “Scope hold.” “Source pinned.”

Tailwind theme extension carries these as CSS variables so the build agent doesn’t re-decide colors.

## Components

### Shell — Card | Chat split
Left = The Card, right = persistent chat. Single route in POC.
PRD ref: `prd.md > Screens and Layout`.

### The Card
Reads `card_items` from D1 on open; upserts after tools. Tabs: **Card** \| **Tasks**. Card types: header, deadline, what-changed, scope-line, idea-kernel, fit, judge-watch, action, tasks-summary. Skeletons on first paint.
PRD ref: `prd.md > The Card content set`, `Screens and Layout`.

### Tasks Lane
Lists `tasks`: checklist (toggle complete), scheduled (next/last run), agent (running/done/failed + result). Task detail popover. Empty/error states per PRD.
PRD ref: `prd.md > Tasks`.

### UI Chrome
Onboarding modal · contest slide-over (claims + citations) · repo success modal · judge review panel · chat tool banners. Halo Ops styling.
PRD ref: `prd.md > Screens and Layout` (surfaces inventory).

### Chat Surface
Message list + composer. Streams AI SDK responses; tool progress banners; agent can post “task created” chips that deep-link to Tasks.
PRD ref: `prd.md > Screens and Layout`.

### Agent Runtime (server)
`streamText` + registered tools. Each tool: validate input → side effect / fetch → write D1 → return structured result the model can narrate.
PRD ref: `prd.md > Features and Behavior` (all headings).

### Tool — search_devpost
**Parallel Search** (primary) scoped to Devpost, plus direct Devpost URL ingest. Returns matches list. Stores `contest` rows.
PRD ref: `prd.md > Discover (Devpost only)`.

### Tool — fetch_rules + extract_claims
**Reliable read path (in order):**
1. **Parallel Extract** — rendered markdown/text of the rules URL (handles JS-heavy pages). Primary path.
2. **Raw `fetch` + HTML parse** — fast path when the page is static (or as a cache warm).
3. **Paste rules text** — labeled last-resort fallback if both fail (explicitly marked `source: user-paste`, never silent).

Then `extract_claims` → `claims` rows with `source_url`, `kind` (deadline/eligibility/must_do), `text`. Never invent claims without a source.
PRD ref: `prd.md > Extract + fit`, `States and Boundaries` (citations).

### Tool — fit_verdict
Profile + claims → worth it / stretch / skip + reasons. Writes `card_items.fit`.
PRD ref: `prd.md > Extract + fit`.

### Tool — save_kernel
Persists the sharpened idea + scope line to `card_items` (idea-kernel, scope-line) during ideate. `plan_docs` may refine them later.
PRD ref: `prd.md > Ideate / sharpen`.

### Tool — plan_docs
Interview already in chat; tool finalizes `scope.md`, `prd.md`, `spec.md` strings → D1 `plan_docs` + optional file export.
PRD ref: `prd.md > Plan (skill-pack quality)`.

### Tool — create_repo + push_files
GitHub REST: `POST /user/repos` + `PUT /repos/{owner}/{repo}/contents/{path}`. **Default `private: true`**; user may say “make it public” → `PATCH /repos/{owner}/{repo}`. Repo success modal shows visibility.
PRD ref: `prd.md > Start (GitHub)`.

### Tool — recheck_rules
New snapshot → compare claims → delta with impact (deadline | eligibility | noise) → `card_items.what_changed`.
PRD ref: `prd.md > What changed`.

### Tool — judge_review
Inputs: plan docs + user build notes / URL. Output: scorecard vs Design / Impact / Innovation / Presentation + top risks.
PRD ref: `prd.md > Judge review`.

### Tool — create_task / update_task
Types: `checklist` | `scheduled` | `agent`. **No separate schedule API** — `type=scheduled` + `next_run_at` is enough (user/caddie can create via this tool). Agent tasks store a `job_type` + payload (e.g. `deep_extract`, `recheck_rules`, `plan_docs`) for the Worker to run. Chat returns immediately with a task chip.
PRD ref: `prd.md > Tasks`.

### Task Runner (Worker)
Executes `agent` and `scheduled` jobs asynchronously (await in the same request for short jobs; for POC longer jobs can run in a scheduled/follow-up invocation or Workflows-lite via cron + queued rows). Updates task status + card blip on completion/failure.
PRD ref: `prd.md > Tasks`, `States and Boundaries`.

### Cron Trigger
`wrangler.toml` cron (e.g. `0 7 * * *` morning card, `0 */12 * * *` recheck). Enqueues due `scheduled` tasks into the same runner.

### Profile Store
First-use form (stack, hours/week, goals). D1 `profile` (single row POC).
PRD ref: `prd.md > Profile`.

## Data Model

**D1 (SQLite)**

```
profile        id, name, stack, hours_per_week, goals, updated_at
contests       id, title, url, deadline_at, source, created_at
snapshots      id, contest_id, fetched_at, content_hash, html_or_md, status
claims         id, snapshot_id, kind, text, source_url, created_at
card_items     id, type, title, body, severity, action_label, action_tool, sort, updated_at
plan_docs      id, contest_id, kind (scope|prd|spec), body, created_at
repos          id, contest_id, full_name, url, created_at
tasks          id, type (checklist|scheduled|agent), title, body, status (open|running|done|failed),
               job_type, payload_json, due_at, next_run_at, last_run_at, error, created_at, updated_at
threads        id, title, created_at
messages       id, thread_id, role, content, tool_name, task_id, created_at
```

Persistence: profile / snapshots / claims / card_items / plan_docs / repos survive reload via D1. Chat history too (POC: single default thread).

## File Structure

```
caddie/
├── wrangler.toml              # Workers + D1 bindings
├── package.json
├── vite.config.ts             # Cloudflare / TanStack Start
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx          # Card | Tasks + Chat shell
│   ├── components/
│   │   ├── TheCard.tsx
│   │   ├── TasksLane.tsx
│   │   ├── Chat.tsx
│   │   ├── modals/            # onboarding, repo success
│   │   ├── overlays/          # contest detail, judge review
│   │   ├── states/            # skeletons, empty, error
│   │   └── cards/*.tsx
│   ├── server/
│   │   ├── db.ts
│   │   ├── agent.ts
│   │   ├── taskRunner.ts
│   │   ├── cron.ts
│   │   └── tools/
│   │       ├── searchDevpost.ts
│   │       ├── fetchRules.ts
│   │       ├── extractClaims.ts
│   │       ├── fitVerdict.ts
│   │       ├── saveKernel.ts
│   │       ├── planDocs.ts
│   │       ├── githubRepo.ts  # create + push + visibility
│   │       ├── recheckRules.ts
│   │       ├── judgeReview.ts
│   │       └── tasks.ts       # create_task / update_task
│   ├── styles/
│   │   └── halo.css           # Halo Ops tokens
│   └── lib/
│       ├── types.ts
│       └── llm.ts             # provider from env
├── migrations/
│   └── 0001_init.sql
└── devpost/                   # curriculum (not app code)
```

## External Services and Dependencies

| Service | Calls | Keys | Notes |
|---|---|---|---|
| LLM (env provider) | chat + extract + review | `LLM_API_KEY` | Via Vercel AI SDK |
| **Parallel** Search + Extract | Devpost discovery + rendered page text | `PARALLEL_API_KEY` | **Primary** path for JS-heavy Devpost pages |
| Devpost | direct HTML as fast path | none | Parallel fallback keeps rules reliable |
| GitHub REST | create repo, put contents | `GITHUB_TOKEN` (fine-grained) | User-owned token in secrets |
| Cloudflare | Workers, D1 | account (deploy) | Local D1 via wrangler |

## Important Failure Modes

- **Rules page fetch fails** → Card shows danger “can’t read rules” + last-good snapshot time + Retry in chat. No fabricated brief.
- **LLM key missing / provider error** → chat shows explicit error; tools don’t half-run.
- **GitHub token missing / 403** → explain “repo step skipped — check GITHUB_TOKEN”; plan docs still saved.
- **Long task dies mid-run** → task `failed` with error + Retry; Card does not pretend success.

## What Was Simplified and Why

- **No push/email** — Task status is on-screen; notifications later.
- **Agent long jobs** — `create_task` + Worker/cron runner (not a full queue product).
- **GitHub PAT not OAuth/MCP** — one secret proves the kernel; OAuth is productization.
- **Model-agnostic via env** — one provider per run; no in-app model picker.
- **Devpost only** — one source proves extract + fit; MLH later.
- **Single profile / single thread** — one builder story for the demo.

## Decisions and Open Issues

| Decision | Choice | Why |
|---|---|---|
| App framework | TanStack Start on Workers | Learner |
| DB | D1 | Learner |
| Agent SDK | Vercel AI SDK | Learner |
| LLM | Env-selected provider | Learner |
| GitHub | PAT + REST | Learner |
| Capabilities | Server-side tools (not browser routes alone) | Learner (correct that fetch is a tool) |
| Card refresh | On open + after tools | Learner |
| **Tasks + schedule + agent-promoted jobs** | In POC (checklist / cron / create_task) | Learner |
| **UI inventory** | Modals, slide-overs, skeletons, tool banners | Learner |
| **save_kernel** | Ideate writes Card immediately | Learner |
| **Repo visibility** | Private by default; user can make public | Learner |
| Local run | Vite + CF plugin + wrangler | Learner |
| Look | Halo Ops (#01) | Learner |

**JS-heavy Devpost pages:** primary read is **Parallel Extract** (rendered text), not raw HTML. Raw fetch is only a cheap fast path. Paste-text is an explicit labeled fallback. First `5-build` slice must prove `fetch_rules` on `learn-ai-basics.devpost.com` via Parallel.

Open: none blocking approval.
