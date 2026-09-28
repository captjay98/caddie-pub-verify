import { useEffect, useState } from "react";
import { getContestDetail } from "../../server/data";
import type { ContestDetail as ContestDetailData, ContestDigest } from "../../server/db";
const KIND_LABEL: Record<string, string> = {
  deadline: "Deadlines",
  eligibility: "Who can enter",
  must_do: "What you must do",
  other: "Other clauses",
};

export function ContestDetail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<ContestDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    getContestDetail().then((d) => {
      if (live) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [open]);

  if (!open) return null;

  const digest = (data?.digest ?? null) as ContestDigest | null;
  // Group verbatim claims by kind for the collapsed fine print.
  const groups = new Map<string, ContestDetailData["claims"]>();
  for (const claim of data?.claims ?? []) {
    const list = groups.get(claim.kind) ?? [];
    list.push(claim);
    groups.set(claim.kind, list);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-[560px] max-w-[94vw] overflow-y-auto border-l border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Contest detail · digest first, fine print one click away</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">
              {loading ? "Loading…" : data?.contest.title ?? "No contest on the bag yet"}
            </h2>
            {data && (
              <a
                href={data.contest.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-mono text-[11px] text-action hover:underline"
              >
                {data.contest.url}
              </a>
            )}
          </div>
          <button onClick={onClose} className="rounded-md border border-line-soft px-2.5 py-1 text-xs text-muted hover:text-bright">
            Close
          </button>
        </div>

        {loading && <div className="card-surface mt-5 h-24 animate-pulse" />}

        {/* Tier 1: the digest */}
        {digest && (
          <div
            className="card-surface mt-5 p-5"
            style={{ background: "linear-gradient(168deg, rgba(77,159,255,0.10), var(--color-panel) 58%)" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-action)" }}>
                The deal · digested
              </p>
              <span className="font-mono text-[10px] text-muted" title="Machine-written summary. The verbatim rules below remain the source of truth.">
                ai-read · verify below
              </span>
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-snug">{digest.headline}</p>
            <div className="mt-3 space-y-1.5">
              {(digest.bullets ?? []).map((b, i) => {
                const idx = b.indexOf(" → ");
                return (
                  <p key={i} className="flex gap-2 text-[13px] leading-relaxed">
                    <span className="font-mono text-[10px] text-action">{String(i + 1).padStart(2, "0")}</span>
                    {idx >= 0 ? (
                      <span>
                        <span className="text-muted">{b.slice(0, idx)}</span>
                        <span className="px-1 font-mono text-[10px] text-action">→</span>
                        <span className="font-medium">{b.slice(idx + 3)}</span>
                      </span>
                    ) : (
                      <span>{b}</span>
                    )}
                  </p>
                );
              })}
            </div>
            {digest.watch_out && (
              <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-3.5 py-2.5">
                <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-warn)" }}>
                  Watch out
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">{digest.watch_out}</p>
              </div>
            )}
          </div>
        )}

        {/* Tier 2: verbatim fine print, collapsed per kind */}
        {data && data.claims.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="kicker px-1">Fine print · verbatim with sources</p>
            {[...groups.entries()].map(([kind, claims]) => (
              <details key={kind} className="card-surface overflow-hidden">
                <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-semibold">
                  {KIND_LABEL[kind] ?? kind}
                  <span className="ml-2 font-mono text-[10.5px] text-muted">{claims.length}</span>
                </summary>
                <div className="space-y-2 px-4 pb-4">
                  {claims.map((claim) => (
                    <div key={claim.id} className="rounded-lg border border-line-soft p-3" style={{ background: "var(--color-raised)" }}>
                      <div className="flex items-center justify-end">
                        {claim.source_url && (
                          <a href={claim.source_url} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-action hover:underline">
                            source ↗
                          </a>
                        )}
                      </div>
                      <p className="-mt-3 text-[12.5px] leading-relaxed text-muted">{claim.text}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
        {data && data.claims.length === 0 && !loading && (
          <p className="mt-5 text-sm text-muted">No claims pinned yet — ask the caddie to read the rules.</p>
        )}
      </aside>
    </div>
  );
}
