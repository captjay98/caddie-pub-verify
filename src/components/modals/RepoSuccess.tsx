import { useEffect, useState } from "react";
import { getLatestRepo } from "../../server/data";

export function RepoSuccess({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [repo, setRepo] = useState<{ full_name: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    getLatestRepo().then((r) => {
      if (live) {
        setRepo(r);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="card-surface w-full max-w-md p-6"
        style={{ background: "var(--color-raised)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="kicker">Start · repo created</p>
        <h2 className="mt-1 text-lg font-semibold">
          {loading ? "Loading…" : repo ? "The plan is on GitHub" : "No repo yet"}
        </h2>
        {repo && (
          <>
            <div className="mt-4 space-y-1.5 rounded-xl border border-line-soft p-3.5" style={{ background: "var(--color-panel)" }}>
              <p className="flex justify-between text-[12.5px]"><span className="text-muted">Repo</span><span className="font-mono text-bright">{repo.full_name}</span></p>
              <p className="flex justify-between text-[12.5px]"><span className="text-muted">Visibility</span><span className="font-medium" style={{ color: "var(--color-warn)" }}>private — ask the caddie to flip</span></p>
              <p className="flex justify-between text-[12.5px]"><span className="text-muted">Pushed</span><span className="font-medium">scope.md · prd.md · spec.md</span></p>
            </div>
            <div className="mt-5 flex gap-2">
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold text-white"
                style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
              >
                Open repo
              </a>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-line-soft px-4 py-2 text-sm text-muted hover:text-bright"
              >
                Keep building
              </button>
            </div>
          </>
        )}
        {!loading && !repo && (
          <p className="mt-2 text-[13px] text-muted">Ask the caddie to put the plan on GitHub first.</p>
        )}
      </div>
    </div>
  );
}
