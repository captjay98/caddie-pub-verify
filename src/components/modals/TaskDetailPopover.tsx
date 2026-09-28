import type { TaskRowLite } from "../../server/db";
import { formatTimeUntil, formatTimeAgo } from "../../lib/format";
import { retryAgentTask, setTaskStatus, toggleChecklist } from "../../server/data";

// Task detail popover (PRD surfaces inventory): title, type, status, due,
// retry if failed — plus done/reopen. Clicking a row is never dead.

const TYPE_LABEL: Record<string, string> = {
  checklist: "Checklist item",
  scheduled: "Scheduled job",
  agent: "Agent job",
};

const STATUS_COLOR: Record<string, string> = {
  open: "var(--color-action)",
  running: "var(--color-action)",
  done: "var(--color-ok)",
  failed: "var(--color-danger)",
};

export function TaskDetailPopover({
  task,
  onClose,
  onRefresh,
}: {
  task: TaskRowLite;
  onClose: () => void;
  onRefresh: () => void;
}) {
  async function run(fn: () => Promise<unknown>) {
    await fn();
    onRefresh();
    onClose();
  }

  const color = STATUS_COLOR[task.status] ?? "var(--color-muted)";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-start bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="card-surface w-[420px] max-w-[92vw] p-5"
        style={{ background: "var(--color-raised)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="pill border border-line-soft" style={{ background: "var(--color-panel)" }}>
              {TYPE_LABEL[task.type] ?? task.type}
            </span>
            <span className="pill" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
              {task.status}
            </span>
          </div>
          <button onClick={onClose} className="rounded-md border border-line-soft px-2 py-0.5 text-xs text-muted hover:text-bright">
            ✕
          </button>
        </div>

        <h3 className="mt-3 text-[15px] font-bold leading-snug tracking-tight">{task.title}</h3>
        {task.body && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{task.body}</p>}

        <div className="mt-4 space-y-1 rounded-xl border border-line-soft p-3.5" style={{ background: "var(--color-panel)" }}>
          {task.due_at && (
            <p className="flex justify-between text-[12.5px]">
              <span className="text-muted">Due</span>
              <span className="font-mono">T-{formatTimeUntil(task.due_at)}</span>
            </p>
          )}
          {task.next_run_at && (
            <p className="flex justify-between text-[12.5px]">
              <span className="text-muted">Next run</span>
              <span className="font-mono">T-{formatTimeUntil(task.next_run_at)}</span>
            </p>
          )}
          {task.last_run_at && (
            <p className="flex justify-between text-[12.5px]">
              <span className="text-muted">Last run</span>
              <span className="font-mono">{formatTimeAgo(task.last_run_at)}</span>
            </p>
          )}
          {task.error && (
            <p className="flex justify-between gap-3 text-[12.5px]">
              <span className="shrink-0 text-muted">Error</span>
              <span className="text-right text-danger">{task.error}</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {task.type === "checklist" && (
            <button
              onClick={() => run(() => toggleChecklist({ data: { id: task.id, done: task.status !== "done" } }))}
              className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--color-action)" }}
            >
              {task.status === "done" ? "Reopen" : "Mark done"}
            </button>
          )}
          {task.type === "agent" && (task.status === "failed" || task.status === "done") && (
            <button
              onClick={() => run(() => retryAgentTask({ data: { id: task.id } }))}
              className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
              style={{ background: "var(--color-warn)" }}
            >
              Run again
            </button>
          )}
          {task.status !== "done" && (
            <button
              onClick={() => run(() => setTaskStatus({ data: { id: task.id, status: "done" } }))}
              className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-semibold text-muted transition-opacity hover:opacity-80"
              style={{ background: "color-mix(in srgb, currentColor 8%, transparent)" }}
            >
              Force done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
