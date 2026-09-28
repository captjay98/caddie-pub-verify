# Caddie

An agent caddie for hackathons — finds the fit, sharpens the idea, writes the plan, creates the repo, and reviews you like a judge before you submit. It carries the bag; you swing.

Built for **Build With AI: Basics** (Devpost Learn). The planning docs that shaped it — scope.md, prd.md, spec.md — live in `devpost/` alongside the build checklist.

## Run it

**Local dev** needs [Bun](https://bun.sh) and your API keys — no Cloudflare account. `bun run dev` is two steps in one: **wrangler** applies the D1 migrations to a local database (created on first run, no login needed), then Vite serves the app.

1. `bun install`
2. Copy `.env.example` to `.dev.vars` and fill in your keys
3. `bun run dev` — wrangler migrates the local D1, then serves http://localhost:3000
4. Register, answer the onboarding brief, and ask for hackathons

**Deploy** additionally needs a Cloudflare account: `wrangler login` once, then `bun run deploy` — builds and deploys to Cloudflare Workers per `wrangler.jsonc` (cron triggers: morning brief + 12h rules re-check).

## What it does

- **Discover** — reads Devpost's live open-contest listing, ranked against your stack and hours; ended contests never enter the list
- **Vet** — fetches a contest's rules, takes a snapshot, pins every claim verbatim with its source, and issues a fit verdict against your country, stack and hours
- **Plan** — one interview produces scope.md, prd.md, spec.md
- **Ship** — creates a private GitHub repo in your account and pushes the docs with a license, without you touching git
- **Judge** — scores the entry against the contest's real criteria and attaches a fix to every low score
- **Submit** — seeds a checklist against the deadline and emails a digest when items come due

Caddie never submits for you. The build, the demo and the pitch are yours.

## Structure

- `src/routes/` — TanStack Start pages and the `/api/chat` agent route
- `src/server/` — auth, D1 store, discovery, Parallel extract, GitHub, Resend, task runner, scout
- `src/components/` — The Card, chat, tasks lane, modals
- `migrations/` — D1 schema (applied automatically on `bun run dev`)
- `devpost/` — planning docs and build record
