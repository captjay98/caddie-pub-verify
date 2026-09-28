import { useEffect, useState } from "react";
import { getLatestJudgment } from "../../server/data";
import type { Judgment } from "../../server/db";

function scoreColor(score: string): string {
  const n = parseInt(score, 10);
  if (Number.isNaN(n)) return "var(--color-warn)";
  return n >= 7 ? "var(--color-ok)" : n >= 5 ? "var(--color-warn)" : "var(--color-danger)";
}

export function JudgePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    getLatestJudgment().then((j) => {
      if (live) {
        setJudgment(j);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-[520px] max-w-[92vw] overflow-y-auto border-l border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Judge watch · unsparing</p>
            <h2 className="mt-1 text-lg font-semibold">How the judges will hit you</h2>
          </div>
          <button onClick={onClose} className="rounded-md border border-line-soft px-2.5 py-1 text-xs text-muted hover:text-bright">
            Close
          </button>
        </div>

        {loading && <div className="card-surface mt-5 h-24 animate-pulse" />}

        {judgment && (
          <>
            <div className="mt-5 space-y-2">
              {judgment.criteria.map((c) => (
                <div key={c.name} className="card-surface p-3.5" style={{ background: "var(--color-raised)" }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="kicker">{c.name}</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: scoreColor(c.score) }}>
                      {c.score}/10
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.notes}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="kicker">Top risks</p>
              <ol className="mt-2 space-y-2">
                {judgment.top_risks.map((risk, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                    <span className="font-mono text-[11px] text-danger">{i + 1}.</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {!loading && !judgment && (
          <p className="mt-5 text-sm text-muted">
            No judgment yet — tell the caddie you're done and give it your build notes.
          </p>
        )}
      </aside>
    </div>
  );
}
