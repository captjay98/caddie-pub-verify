---
doc: prd
status: approved
---

# Caddie — Product Requirements

One line: An agent caddie for hackathons — finds the fit, sharpens the idea, writes the plan, creates the repo, and reviews you like a judge before you submit. It carries the bag; you swing.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `What "Working" Looks Like`, `The POC Boundary`.

## The Core Journey

1. **First use:** onboarding modal (name, stack, hours/week, goals) → profile. Then the shell: **The Card** | **Tasks** on the left, **chat** on the right.
2. **Empty Card:** “No contest on the bag yet” + **Find a hackathon**. Later visits: time-of-day context — contest, countdown, scope line, **what changed** alerts.
3. **In chat**, free-form: “find me hackathons”, “what about X?”, “sharpen this”, “plan it”, “put it on GitHub”, “review me”.
4. **Discover → decide:** Devpost results ranked against the builder profile; rules extracted with citations; fit verdict (worth it / stretch / skip).
5. **Ideate:** kernel sharpened to one demo-able idea. The Card shows **Scope line** + **Idea kernel**.
6. **Plan:** short skill-pack-style interview → generates `scope.md`, `prd.md`, `spec.md` for *their* project.
7. **Start:** create a GitHub repo and push those three docs. Success beat: the repo appears with the plan inside.
8. **Tasks in the loop:** checklist items from the plan; scheduled jobs (e.g. re-check); slow chat work promoted to an **agent task** so chat returns immediately.
9. **Review** (when they say they’re done): score against those docs + contest **judging criteria** from the user’s build notes / demo URL; name presentation risks. Unsparing.
10. **Return visits:** The Card updates (deadline, what changed). Re-check diffs the rules snapshot and ranks impact.

Success for the demo: first-use → discover → cited rules → plan → repo → task/job → judge review visible end to end in under three minutes on screen.

## Screens and Layout

One product shell, split like a brief + radio — plus a **Tasks** lane.

| Region | Role |
|---|---|
| **Left — The Card** | Periodic briefs and alerts. Tabs/segments: **Card** \| **Tasks**. Card types: Header · Deadline · What changed · Scope line · Idea kernel · Fit · Judge watch · Action · Tasks summary. Cadence language: Morning / Afternoon / Evening / Night. |
| **Right — Chat** | Persistent caddie channel. Free-form LLM with tools. Message thread + composer. Tool progress is visible in-thread. |

### Surfaces inventory (POC)

| Surface | Behavior |
|---|---|
| **Main shell** | Card \| Tasks (left) + Chat (right). Single route. |
| **Onboarding modal** | First run: display name, stack, hours/week, goals → profile. Dismissible only after save. |
| **Find a hackathon** | Empty-state CTA + chat command. Not a separate app. |
| **Contest detail slide-over** | From a Card row: claims + source citations + snapshot time. |
| **Repo success modal** | After push: repo URL, files included, “open repo” / “keep building”. |
| **Judge review panel** | Expands from Judge watch card (or chat artifact): scorecard + top risks. |
| **Task detail popover** | Title, type (checklist / scheduled / agent), status, due, retry if failed. |
| **Loading — chat** | Inline tool banners: “Fetching rules…”, “Creating repo…”. Stream tokens. |
| **Loading — Card** | Skeleton rows on first paint (not a bare spinner). After tools, cards crossfade/upsert. |
| **Empty** | First use: “No contest on the bag yet”. Tasks empty: “Nothing on the card yet”. |
| **Error** | Danger card / task row + last-good time + Retry. Never fake data. |

**Card anatomy:** kicker · headline · short body · optional source stamp · at most one primary action.

**Interactions:** Card actions open/run chat tools; tasks toggle complete; scheduled tasks show next run; agent tasks show running/done/failed with a result link.

## Look and Feel

**Direction: Halo Ops** (locked from look-variants.html #01 — learner chose over pit-wall hybrid).

| Token | Value |
|---|---|
| Type | Inter for UI · IBM Plex Mono for telemetry/labels · Space Grotesk optional for large display numbers |
| Background | HackSteward layered dark: `#090b10` base, `#101319` / `#151922` / `#1b2029` surfaces, horizon glow `rgba(77,159,255,0.13)` |
| Actions | Blue `#4d9fff` → `#2f7ddd` gradients (HackSteward primary) |
| Verified / hold | Green `#3ecf8e` |
| Warning / what changed | Amber `#f0a83c` |
| Danger / hard fail | Red `#ff7a83` |
| Borders | Crisp `rgba(255,255,255,0.13)` / subtle `0.07` |
| Geometry | Compact density, 8–12px radii, inset lift on cards, decision rails |
| Voice | Quiet chief-of-staff: short, direct, never fluffy. “Scope hold.” “Impact high.” “Source pinned.” |

**Signature moments:** decision rails with status · evidence/receipt stamps · compact metrics row · primary blue CTA.

**Hot state (same skeleton):** when impact is high or deadline is critical, the What changed rail uses amber/danger emphasis and a stronger CTA (pit-wall urgency borrowed from 04) — not a second theme.

Reference: `devpost/look-variants.html` (01 resting · 04 hot emphasis). Inspiration: today.ai interaction model; HackSteward visual system.

## Features and Behavior

*(scope.md > The Core Loop)*

### Profile
Builder enters stack, hours/week, goals once. Used for fit ranking and scope lines. Local only.

### Discover (Devpost only)
User asks in chat (or uses Find a hackathon from empty Card). Caddie searches/fetches Devpost listings or a pasted URL, ranks against profile. Output: 1–3 matches with one-line why.

### Extract + fit
On a chosen contest: fetch rules page, extract deadlines, eligibility, must-dos with **source citations**. Fit verdict: worth it / stretch / skip + reasons.

### Ideate / sharpen
Chat turns refine an idea to **one kernel** (what to demo, who it’s for, why it matters). `save_kernel` writes Idea kernel + Scope line to The Card immediately. `plan_docs` may refine them later.

### Plan (skill-pack quality)
Interview produces `scope.md`, `prd.md`, `spec.md` for the user’s project — the same discipline we used here. Completeness over length.

### Start (GitHub)
User confirms. Caddie **creates a GitHub repo** and **pushes the three docs** (GitHub REST + fine-grained PAT — as decided in `spec.md`). **Default private**; user can ask to make it public. Success: repo exists with those files.

### What changed
Re-check rules source; diff vs last snapshot; rank impact (deadline moved / eligibility flipped / noise). The Card shows a What changed card; chat can explain.

### Judge review
User says they’re done (or “review me”) and supplies **build notes and/or a demo URL** (what they built, link to video/repo if any). Caddie evaluates that evidence against the plan docs **and** contest judging criteria (Design, Impact, Innovation, Presentation). Output: scorecard-style notes + top risks (especially presentation). No invented demos.

### Tasks
Three kinds on the Tasks lane — all first-class:

1. **Checklist** — submission/plan todos (video, repo, license, description, review…), checkable, due dates anchored to the contest deadline.
2. **Scheduled** — timed jobs (e.g. morning Card regen, nightly `recheck_rules`). User or caddie can create; shows next run / last run.
3. **Agent-promoted** — when chat work will take a while (deep extract, multi-contest scan, full plan write), the LLM **creates a task** and returns to chat immediately. Task runs async, status on Tasks + a Card blip when done/failed.

### The Card content set
Header · Deadline · What changed · Scope line · Idea kernel · Fit · Judge watch · Action · Tasks summary (open count / next due).

## States and Boundaries

- **First use** — Onboarding modal → The Card: “No contest on the bag yet” + Find a hackathon. Chat ready. Tasks empty state.
- **Normal use** — Card populated; Tasks show checklist + scheduled + agent jobs; chat free.
- **Loading** — Card skeletons; chat tool banners; agent tasks `running` with progress text.
- **Empty after filters / no match** — honest empty copy (“Devpost search returned nothing”) — never fake results.
- **Fetch/rules failure** — red “can’t read rules” card with last-good snapshot time + Retry in chat. No fabricated brief.
- **Task failure** — failed task row + retry; chat can re-dispatch.
- **What changed: none** — quiet; don’t invent deltas.
- **Persistence** — profile, snapshots, plan docs, repo URL, **tasks (incl. schedule)** live in local/edge DB (D1). Reload restores Card + Tasks + thread.
- **Who submits** — the human. Caddie prepares and reviews; it never submits or posts.
- **Citations** — extracted claims show source; failure to cite is a product bug.

## Product Decisions

- Name: **Caddie** (learner).
- Layout: **The Card left, chat right** (inverted vs today.ai) (learner).
- Chat is free-form LLM + tools (learner).
- Card set: header, deadline, what changed, scope line, idea kernel, fit, judge watch, action, tasks summary (co-designed).
- Empty state: bag-empty + Find a hackathon (learner agreed).
- Error state: visible fail + last-good + retry (learner agreed).
- Look: **01 Halo Ops** resting; hot state may borrow 04 alert emphasis (learner).
- GitHub: **REST + fine-grained PAT** (not OAuth/MCP) for the POC — as decided in `spec.md` (learner).
- Judge review is in the POC as a thin chat/card beat (learner).
- Time-of-day Card cadence (morning/afternoon/evening/night) as copy/frame **plus** optional scheduled regen (learner).
- **Tasks are in the POC:** checklist + scheduled + agent-promoted long jobs (learner).
- **UI inventory is in the POC:** onboarding modal, slide-over, success modal, skeletons, tool banners (learner).
- LLM may **promote slow work to a task** and continue chat (learner).

## What We're Building

Everything in **Features and Behavior** + **Screens and Layout** inventory inside the POC boundary from `scope.md`: profile, Devpost discover, extract+fit, ideate, plan docs, GitHub repo+push, what-changed, judge review, **Tasks (checklist / scheduled / agent-promoted)**, **UI surfaces & states (modals, skeletons, tool banners)**, The Card + chat, Halo Ops look.

## Deferred From the POC

Implied but out: accounts/GitHub OAuth sync, push/email/Slack notifications, MLH and other sources, long-term memory product, full multi-hour brainstorm product, teams, mobile, submission form filler, deploying the user’s app. *(Cloudflare Cron is in-scope as the schedule mechanism for Tasks; a general job platform / queues product is not.)*

## Possible Later Enhancements

Morning Card emails; multi-contest bag with portfolio scoring; memories of past entries; Slack “rules changed” ping; Will It Ship practice mode.

## Non-Goals

- Not a social/community product.
- Not a marketplace.
- Not a general calendar/todo product — Tasks are **hackathon-scoped** (submission checklist, scheduled rules/card jobs, agent jobs) only.
- Never submits on the user’s behalf.
- Not a hosted multi-tenant SaaS in this POC.

## Open Questions

None. GitHub path is decided in `spec.md` (REST + fine-grained PAT).
