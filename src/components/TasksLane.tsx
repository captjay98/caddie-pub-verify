import { useState } from "react";
import type { TaskRowLite } from "../server/db";
import { formatTimeUntil, formatTimeAgo } from "../lib/format";
import { createChecklistTask, toggleChecklist } from "../server/data";
import { TaskDetailPopover } from "./modals/TaskDetailPopover";

// Task rows ported from today.ai (final-review revision): generous rounded rows,
// grouped sections, status carried by dimming + a status word.
// Every row opens the detail popover (PRD surfaces inventory); a composer
// creates checklist items in place.

export function TasksLane({ tasks, onRefresh }: { tasks: TaskRowLite[]; onRefresh: () => void }) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<TaskRowLite | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  async function onToggle(task: TaskRowLite) {
    setPendingId(task.id);
    try {
      await toggleChecklist({ data: { id: task.id, done: task.status !== "done" } });
      onRefresh();
    } finally {
      setPendingId(null);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await createChecklistTask({ data: { title } });
      setDraft("");
      onRefresh();
    } finally {
      setAdding(false);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="card-surface mx-4 mt-4 p-5">
        <p className="kicker" style={{ color: "var(--color-action)" }}>
          TASKS · NOTHING YET
        </p>
        <h2 className="mt-2 text-[17px] font-bold leading-snug tracking-tight">
          No checklist, no schedule, no agent jobs on the card
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          They land here the moment a contest is on the bag.
        </p>
      </div>
    );
  }

  const checklist = tasks.filter((t) => t.type === "checklist");
  const scheduled = tasks.filter((t) => t.type === "scheduled");
  const agent = tasks.filter((t) => t.type === "agent");

  return (
    <div className="px-4 py-2">
      <form onSubmit={onAdd} className="mb-3 flex gap-2 px-1 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ Add a task to the checklist…"
          className="input h-8 flex-1 py-1 text-[12.5px]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || adding}
          className="rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
        >
          Add
        </button>
      </form>

      {checklist.length > 0 && (
        <Group title="Checklist" count={`${checklist.filter((t) => t.status === "done").length}/${checklist.length} done`}>
          {checklist.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              dimmed={t.status === "done"}
              pending={pendingId === t.id}
              onSelect={setSelected}
              leading={
                <input
                  type="checkbox"
                  checked={t.status === "done"}
                  disabled={pendingId === t.id}
                  onChange={() => onToggle(t)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-[3px] h-3.5 w-3.5 shrink-0 accent-[#4d9fff]"
                />
              }
              trailing={
                <span
                  className="shrink-0 font-mono text-[10.5px]"
                  style={{
                    color:
                      t.status !== "done" && t.due_at && new Date(t.due_at).getTime() < Date.now()
                        ? "var(--color-danger)"
                        : t.status === "done"
                          ? "var(--color-ok)"
                          : "var(--color-muted)",
                  }}
                >
                  {t.status === "done"
                    ? "done"
                    : t.due_at && new Date(t.due_at).getTime() < Date.now()
                      ? "overdue"
                      : t.due_at
                        ? `T-${formatTimeUntil(t.due_at)}`
                        : ""}
                </span>
              }
            />
          ))}
        </Group>
      )}

      {scheduled.length > 0 && (
        <Group title="Scheduled" count={`${scheduled.length}`}>
          {scheduled.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              dimmed={false}
              pending={false}
              onSelect={setSelected}
              leading={<span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--color-action)" }} />}
              trailing={
                <span className="shrink-0 font-mono text-[10.5px] text-muted">
                  next T-{formatTimeUntil(t.next_run_at)}
                  {t.last_run_at ? ` · ran ${formatTimeAgo(t.last_run_at)}` : ""}
                </span>
              }
            />
          ))}
        </Group>
      )}

      {agent.length > 0 && (
        <Group title="Agent jobs" count={`${agent.filter((t) => t.status === "running").length} running`}>
          {agent.map((t) => {
            const color =
              t.status === "done" ? "var(--color-ok)" : t.status === "failed" ? "var(--color-danger)" : "var(--color-action)";
            return (
              <TaskRow
                key={t.id}
                task={t}
                dimmed={t.status === "done"}
                pending={false}
                onSelect={setSelected}
                leading={
                  <span
                    className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color, opacity: t.status === "running" ? 1 : 0.7 }}
                  />
                }
                trailing={
                  <span className="shrink-0 font-mono text-[10.5px]" style={{ color }}>
                    {t.status}
                  </span>
                }
              />
            );
          })}
        </Group>
      )}

      {selected && <TaskDetailPopover task={selected} onClose={() => setSelected(null)} onRefresh={onRefresh} />}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return (
    <section className="pb-4 pt-2">
      <div className="flex items-baseline justify-between px-1 pb-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <span className="font-mono text-[10.5px] text-muted">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function TaskRow({
  task,
  dimmed,
  pending,
  onSelect,
  leading,
  trailing,
}: {
  task: TaskRowLite;
  dimmed: boolean;
  pending: boolean;
  onSelect: (t: TaskRowLite) => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      onClick={() => onSelect(task)}
      title="Open task detail"
      className={
        "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-line-soft px-4 py-3 transition-all hover:border-line " +
        "bg-panel shadow-[var(--lift-shadow)] " +
        (dimmed ? "opacity-55 " : "") +
        (pending ? "opacity-40 " : "")
      }
    >
      {leading}
      <span className={"min-w-0 flex-1 truncate text-[13px] " + (dimmed ? "line-through" : "")}>{task.title}</span>
      {trailing}
    </div>
  );
}
