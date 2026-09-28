import { useState } from "react";
import type { PlanDocRow } from "../../server/db";
import { Markdown } from "../Markdown";

export function PlanViewer({
  docs,
  open,
  onClose,
}: {
  docs: PlanDocRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  if (!open || docs.length === 0) return null;
  const doc = docs[Math.min(active, docs.length - 1)];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-[640px] max-w-[94vw] flex-col border-l border-line bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-3">
          <div>
            <p className="kicker">The plan · carries forward</p>
            <h2 className="mt-0.5 text-sm font-semibold">scope.md · prd.md · spec.md</h2>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              generated {docs[0] ? new Date(docs[0].created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""} · regenerating rewrites all three
            </p>
          </div>
          <button onClick={onClose} className="rounded-md border border-line-soft px-2.5 py-1 text-xs text-muted hover:text-bright">
            Close
          </button>
        </div>
        <div className="flex gap-1 border-b border-line-soft px-4 py-2">
          {docs.map((d, i) => (
            <button
              key={d.kind}
              onClick={() => setActive(i)}
              className={
                i === active
                  ? "rounded-md border border-line-soft bg-raised px-3 py-1 font-mono text-[11px] text-bright"
                  : "rounded-md px-3 py-1 font-mono text-[11px] text-muted hover:text-bright"
              }
            >
              {d.kind}.md
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Markdown text={doc.body} />
        </div>
      </aside>
    </div>
  );
}
