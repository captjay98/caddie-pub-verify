---
doc: scope
status: approved
---

# Caddie

One line: An agent caddie for hackathons — finds the fit, sharpens the idea, writes the plan, creates the repo, and reviews you like a judge before you submit. It carries the bag; you swing.

## The Unique Kernel

Not another summarizer and not a dashboard. **An agent-shaped steward** that takes a busy builder from “which hackathon?” to “planned repo on GitHub,” then later from “I think I’m done” to “here’s how the judges will hit you.”

It uses the same discipline as the Devpost Learn skill pack — interview, plan, then act — as a **product for other builders**. The distinctive move is the last mile: **create the GitHub repo and push `scope.md` / `prd.md` / `spec.md`**, then **score the work against those docs and the contest’s judging criteria**.

If you delete the plan→repo and judge-review actions, this is just chat with search. That’s the kernel.

## Who It's For

Busy builders who enter hackathons with a full-time job and a side gig — starting with the founder themselves. They can ship products. They lose to: fine print, scope creep, and bad presentation. Today they juggle Devpost tabs, a half-kept plan, and a demo rehearsed the night before.

Audience beyond the founder: the same person at every contest — people who “have a winning product” and still don’t place.

## The Core Loop

In one chat session (or a few):

1. **Discover** — “find me hackathons” → Devpost results ranked against the builder profile  
2. **Decide** — rules extract with citations + fit verdict  
3. **Ideate** — sharpen to one kernel they can actually demo  
4. **Plan** — skill-pack-style interview → `scope.md`, `prd.md`, `spec.md`  
5. **Start** — create a GitHub repo and push those three docs  
6. **Review** (when they think they’re done) — score against the plan and the contest judging criteria; call the presentation risks

Why they come back: the contest is a month-long fight with rules that move; and nobody else will tell them the truth before the judges do.

## Inspiration & Identity

- **today.ai** — “knows you, acts before you ask”: living memory of the builder + a proactive Today surface.  
  https://today.ai  
- **Devpost Learn Skill Pack** — interview-driven planning; we ship that *as a feature*.  
  https://github.com/challengepost/learn-ai-basics  
- Energy: calm, slightly sharp chief-of-staff. Concise. Will cut scope. Will not flatter the demo.

## Why This Matters to the Learner

They lost a large hackathon with a strong product and a weak presentation. They want something working without scope creep — for themselves and for people like them. This product is the steward they wish they’d had.

## What "Working" Looks Like

A screen recording, under three minutes, that shows this chain **end to end**:

1. Builder profile exists (stack, hours/week, goals).  
2. Chat: “find me a hackathon” → Devpost matches with fit reasons.  
3. Rules come back cited (deadline, eligibility, must-dos).  
4. Idea is sharpened to one kernel.  
5. Agent produces `scope` / `prd` / `spec` from a short interview.  
6. **GitHub repo is created and the three docs are in it.**  
7. *(fast-forward beat)* Agent reviews a described/built project against those docs **and the judging criteria**, with specific risks.

The “oh, that’s cool” beat: **the repo appears with the plan already inside** — and the judge-review is unsparing.

## The POC Boundary

**In:**

- Builder profile (local)  
- Chat as the primary interaction (agent-shaped)  
- Devpost discovery + rules extraction + citations + fit verdict  
- Ideate / sharpen to a kernel  
- Generate `scope.md`, `prd.md`, `spec.md` (guided)  
- **Create GitHub repo + push those docs** (GitHub MCP or API — agent tool path)  
- Today’s Brief / what-changed surface (acts before you ask)  
- **Final review** vs plan + contest judging criteria  

**Shape of “done” for the video:** the chain above runs on real Devpost data for at least one contest (this one is a perfect demo subject).

## Later

- Background scheduler / cloud monitor  
- Push, email, Slack notifications  
- GitHub OAuth accounts and multi-device sync  
- Multi-source discovery (MLH, etc.)  
- Long-term memory product (full today.ai “Memories”)  
- Full free-form multi-hour brainstorming product  
- Multi-user / teams  
- Mobile app  
- Submission form filler / auto-submit  
- Deploying the user’s app  

## Explicitly Cut

- **Social / community / matchmaking** — different product.  
- **Marketplace, sponsors, ads** — not a steward.  
- **Full calendar/todo replacement** — stay in the hackathon lane.  
- **Submitting or posting on the user’s behalf** — the human submits; we only prepare and review.  
- **Claiming this POC is a hosted SaaS** — local/single-user agent experience is the proof; infrastructure is Season 2.
