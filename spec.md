# Spec: Caddie

### Stack
- **Runtime & Edge:** Cloudflare Workers (TypeScript / Hono).
- **Frontend:** React + Tailwind CSS (hosted on Cloudflare Pages).
- **Storage & State:** Cloudflare D1 for snapshot cache, claims, and card items.
- **Integrations:** Devpost rules extraction API, GitHub REST API.

### Data Models
```typescript
interface ContestClaim {
  kind: 'deadline' | 'eligibility' | 'must_do' | 'other';
  text: string;
}

interface IdeaKernel {
  kernel: string;
  scope_line: string;
}

interface PlanDocs {
  scope_md: string;
  prd_md: string;
  spec_md: string;
}

interface JudgeReview {
  scored: string[];
  top_risks: string[];
}
```

### Components
- `rules_engine`: Fetches rules DOM, snapshots text, computes diffs on re-check, asserts verbatim text.
- `planner`: Assembles standardized scope/PRD/spec templates based on user interview.
- `git_worker`: Manages authenticated GitHub repo creation and pushes initial planning tree.
- `judge_evaluator`: Strict rubric engine that penalizes missing demos, unverified claims, and scope mismatches.

### Failure Modes & Edge Cases
- **Upstream rules DOM change:** Normalized markdown snapshots isolate content changes from layout noise.
- **GitHub Auth failure:** Gracefully fail repo creation while keeping local plan docs intact.
- **LLM Hallucination:** Verbatim substrings verified against raw rule snapshot before persistence.