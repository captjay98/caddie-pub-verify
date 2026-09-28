import type { ToolUIPart, UIMessage } from "ai";

const TOOL_LABELS: Record<string, string> = {
  search_devpost: "Searching Devpost",
  fetch_rules: "Fetching rules",
  save_claims: "Pinning claims",
  save_fit: "Scoring fit",
};

type ToolOutput = Record<string, unknown>;

function outputOf(part: ToolUIPart): ToolOutput | null {
  return part.state === "output-available" && part.output ? (part.output as ToolOutput) : null;
}

function MatchCards({ output }: { output: ToolOutput }) {
  const matches = (output.matches as { title: string; url: string; excerpt: string }[]) ?? [];
  if (matches.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {matches.slice(0, 5).map((m) => (
        <a
          key={m.url}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="card-surface block px-3 py-2 transition-colors hover:border-line"
          style={{ background: "var(--color-raised)" }}
        >
          <p className="text-[13px] font-semibold leading-snug text-bright">{m.title}</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-action">{m.url}</p>
          {m.excerpt && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{m.excerpt}</p>}
        </a>
      ))}
    </div>
  );
}

function RulesReceipt({ output }: { output: ToolOutput }) {
  if (output.failed) {
    const firstLine = String(output.detail ?? "unknown error").split("\n")[0];
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
        Couldn't read that page — {firstLine}
      </div>
    );
  }
  return (
    <div className="card-surface flex items-center justify-between px-3 py-2" style={{ background: "var(--color-raised)" }}>
      <span className="font-mono text-[11px] text-muted">
        rules read · {(output.chars as number)?.toLocaleString()} chars
      </span>
      <a href={String(output.url)} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-action hover:underline">
        source pinned ↗
      </a>
    </div>
  );
}

function ClaimsReceipt({ output }: { output: ToolOutput }) {
  const saved = output.saved as number;
  return (
    <div className="card-surface px-3 py-2 font-mono text-[11px] text-muted" style={{ background: "var(--color-raised)" }}>
      <span className="text-ok">✓</span> {saved} claim{saved === 1 ? "" : "s"} pinned with sources
    </div>
  );
}

function FitCard({ output }: { output: ToolOutput }) {
  const verdict = String(output.verdict ?? "");
  const color = verdict === "worth_it" ? "var(--color-ok)" : verdict === "stretch" ? "var(--color-warn)" : "var(--color-danger)";
  return (
    <div
      className="card-surface px-3 py-2 text-[12.5px]"
      style={{ background: "var(--color-raised)", borderLeft: `3px solid ${color}` }}
    >
      <span className="kicker">Fit verdict</span>
      <p className="mt-0.5 font-semibold" style={{ color }}>
        {verdict.replace("_", " ")}
      </p>
    </div>
  );
}

function ToolBody({ part }: { part: ToolUIPart }) {
  const output = outputOf(part);
  if (!output) return null;
  const name = part.type.replace("tool-", "");
  if (name === "search_devpost") return <MatchCards output={output} />;
  if (name === "fetch_rules") return <RulesReceipt output={output} />;
  if (name === "save_claims") return <ClaimsReceipt output={output} />;
  if (name === "save_fit") return <FitCard output={output} />;
  return null;
}

export function ToolBanners({ parts }: { parts: UIMessage["parts"] }) {
  const tools = parts.filter((p): p is ToolUIPart => typeof p.type === "string" && p.type.startsWith("tool-"));
  if (tools.length === 0) return null;
  return (
    <div className="mb-1.5 space-y-1.5">
      {tools.map((part) => {
        const base = part.type.replace("tool-", "");
        const label = TOOL_LABELS[base] ?? base;
        const running = part.state === "input-streaming" || part.state === "input-available";
        if (running) {
          return (
            <div
              key={part.toolCallId}
              className="flex items-center gap-2 rounded-md border border-line-soft bg-panel px-2.5 py-1.5 font-mono text-[11px] text-muted"
            >
              <span className="text-action">▸</span>
              <span>{label}…</span>
            </div>
          );
        }
        if (part.state === "output-error") {
          return (
            <div key={part.toolCallId} className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-[11px] text-danger">
              ✗ {label} failed
            </div>
          );
        }
        return <ToolBody key={part.toolCallId} part={part} />;
      })}
    </div>
  );
}
