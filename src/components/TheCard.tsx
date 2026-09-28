import type { CardItemRow } from "../server/db";
import { formatTimeUntil, formatTimeAgo } from "../lib/format";
import { dismissCard } from "../server/data";

// The Card v3 — today.ai's verified card grammar (29-card study) mapped onto
// Halo Ops compact geometry:
//   status never touches the shell; it lives in 4 inner layers:
//   1) kicker icon + channel hue  2) ghost pills (hue @ 12% fill)
//   3) tinted nested panels       4) the CTA filled with the channel hue
//   Low-stakes cards deliberately mute: gray kicker, ghost button, no pill.

type Channel = "blue" | "amber" | "green" | "red" | "info";

const CHANNEL: Record<Channel, string> = {
  blue: "var(--color-action)",
  amber: "var(--color-warn)",
  green: "var(--color-ok)",
  red: "var(--color-danger)",
  info: "var(--color-muted)",
};

function GhostPill({ channel, children }: { channel: Channel; children: React.ReactNode }) {
  return (
    <span
      className="pill font-bold"
      style={{
        background: `color-mix(in srgb, ${CHANNEL[channel]} 12%, transparent)`,
        color: CHANNEL[channel],
      }}
    >
      {children}
    </span>
  );
}

function Kicker({ channel, icon, children, right, fresh }: { channel: Channel; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; fresh?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p
        className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]"
        style={{ color: CHANNEL[channel] }}
      >
        {icon}
        {children}
        {fresh}
      </p>
      {right}
    </div>
  );
}

function FillCTA({ channel, label, onClick }: { channel: Channel; label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="mt-3 inline-flex items-center rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
      style={{ background: CHANNEL[channel] }}
    >
      {label}
    </button>
  );
}

function GhostCTA({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="mt-3 inline-flex items-center rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:opacity-80"
      style={{ background: "color-mix(in srgb, currentColor 8%, transparent)", color: "var(--color-muted)" }}
    >
      {label}
    </button>
  );
}

function MetaRows({ body, channel }: { body?: string | null; channel?: Channel }) {
  if (!body) return null;
  const lines = body.split("\n").filter(Boolean);
  const notes = lines.filter((l) => l.startsWith("Note → "));
  const meta = lines.filter((l) => l.includes(" → ") && !l.startsWith("Note → "));
  const prose = lines.filter((l) => !l.includes(" → ") && !l.startsWith("Note → "));
  return (
    <>
      {prose.length > 0 && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{prose.join(" ")}</p>}
      {meta.length > 0 && (
        <div className="mt-2 space-y-1">
          {meta.map((line, i) => {
            const idx = line.indexOf(" → ");
            return (
              <p key={i} className="text-[12.5px] leading-snug">
                <span className="text-muted">{line.slice(0, idx)}</span>
                <span className="px-1 font-mono text-[10px]" style={channel ? { color: CHANNEL[channel] } : { color: "var(--color-action)" }}>
                  →
                </span>
                <span className="font-medium">{line.slice(idx + 3)}</span>
              </p>
            );
          })}
        </div>
      )}
      {/* The caddie's closing point of view — the voice layer, not data */}
      {notes.length > 0 && (
        <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-bright/90">
          <span className="mr-1.5 font-mono text-[10px]" style={channel ? { color: CHANNEL[channel] } : { color: "var(--color-action)" }}>
            ▸
          </span>
          {notes[0].slice(7)}
        </p>
      )}
    </>
  );
}

/* small inline icon set (14px, stroke = currentColor) */
const icons = {
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  scale: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 3v18M5 7l7-2 7 2M5 7l-2 6a3.5 3.5 0 0 0 7 0L7 7M17 7l-2 6a3.5 3.5 0 0 0 7 0l-2-6" />
    </svg>
  ),
  file: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  repo: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M4 4h7a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM13 20h5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-7" />
    </svg>
  ),
  alert: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17.5v.5" />
    </svg>
  ),
  globe: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  ),
  eye: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  spark: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  ),
};

type CardProps = {
  item: CardItemRow;
  deadlineAt: string | null;
  onOpen: (tool: string) => void;
  onSend: (text: string) => void;
  onDismiss: (id: number) => void;
};

/* Freshness stamp: quiet age indicator in the kicker row (honesty rule). */
function Fresh({ item }: { item: CardItemRow }) {
  return <span className="shrink-0 font-mono text-[9.5px] text-muted opacity-70">· {formatTimeAgo(item.updated_at)}</span>;
}

/* Dismiss affordance: hover ✕; hidden until the type is rewritten with new truth. */
function Dismiss({ id, onDismiss }: { id: number; onDismiss: (id: number) => void }) {
  return (
    <button
      title="Dismiss this card until it updates"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss(id);
      }}
      className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-md text-[11px] text-muted opacity-0 transition-opacity hover:bg-lift hover:text-bright focus:opacity-100 group-hover/card:opacity-100"
      aria-label="Dismiss card"
    >
      ✕
    </button>
  );
}

/* ---- Deadline: amber channel, giant countdown panel ---- */
function DeadlineCard({ deadlineAt, item, onOpen, onSend }: CardProps) {
  const days = deadlineAt ? Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 86_400_000)) : null;
  return (
    <article className="card-surface group/card relative px-4 py-3.5" onClick={() => onOpen("open_detail")}>
      <Kicker channel="amber" fresh={<Fresh item={item} />} icon={icons.clock} right={<GhostPill channel="amber">{deadlineAt ? "locked" : "unknown"}</GhostPill>}>
        Clock · Deadline
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">
        {deadlineAt ? "Submission closes — the clock is the boss" : "No deadline parsed from the rules yet"}
      </h3>
      {days !== null && deadlineAt && (
        <div
          className="mt-3 flex items-center gap-4 rounded-xl px-4 py-3"
          style={{ background: "color-mix(in srgb, var(--color-warn) 7%, transparent)" }}
        >
          <div className="text-center">
            <div className="font-mono text-[28px] font-bold leading-none" style={{ color: "var(--color-warn)" }}>
              {days}
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-muted">days</div>
          </div>
          <div className="min-w-0 border-l pl-3 text-[12.5px] leading-relaxed text-muted" style={{ borderColor: "color-mix(in srgb, var(--color-warn) 25%, transparent)" }}>
            <MetaRows body={item.body} channel="amber" />
            <p className="mt-1.5">
              <span className="text-muted">Your time → </span>
              <span className="font-medium">
                {new Date(deadlineAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </p>
          </div>
        </div>
      )}
      {days === null && <MetaRows body={item.body} channel="amber" />}
      <div className="mt-3 flex flex-wrap gap-2">
        <FillCTA channel="amber" label="Open detail" onClick={() => onOpen("open_detail")} />
        <GhostCTA label="Re-check rules" onClick={() => onSend("Re-check the rules for the contest on the bag.")} />
      </div>
    </article>
  );
}

/* ---- Fit: green channel, verdict hero + 2-col block grid (today.ai composite pattern) ---- */
function FitCard({ item, onOpen, onDismiss }: CardProps) {
  const verdictWord = item.title.split("—")[0].trim();
  const rest = item.title.includes("—") ? item.title.split("—").slice(1).join("—").trim() : null;
  const channel: Channel = item.severity === "warn" ? "amber" : item.severity === "danger" ? "red" : "green";
  const lines = (item.body ?? "").split("\n").filter(Boolean);
  const notes = lines.filter((l) => l.startsWith("Note → "));
  const meta = lines.filter((l) => l.includes(" → ") && !l.startsWith("Note → "));
  const risks = meta.filter((l) => l.startsWith("Risk → "));
  const rows = meta.filter((l) => !l.startsWith("Risk → "));

  return (
    <article className="card-surface group/card relative px-4 py-3.5" onClick={() => onOpen("open_detail")}>
      <Dismiss id={item.id} onDismiss={onDismiss} />
      <Kicker channel="green" fresh={<Fresh item={item} />} icon={icons.check} right={<GhostPill channel={channel}>{verdictWord.toLowerCase()}</GhostPill>}>
        Verdict · Fit
      </Kicker>
      <h3 className="mt-1.5 text-[16px] font-bold leading-snug tracking-tight">{verdictWord}</h3>
      {rest && <p className="text-[12.5px] font-medium text-muted">{rest}</p>}

      {(rows.length > 0 || risks.length > 0) && (
        <div className={"mt-3 grid gap-2.5 " + (rows.length > 0 && risks.length > 0 ? "sm:grid-cols-2" : "")}>
          {rows.length > 0 && (
            <div className="rounded-xl px-3.5 py-3" style={{ background: "color-mix(in srgb, var(--color-ok) 6%, transparent)" }}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-ok)" }}>
                Why it fits
              </p>
              <div className="mt-1.5 space-y-1">
                {rows.map((l, i) => {
                  const idx = l.indexOf(" → ");
                  return (
                    <p key={i} className="text-[12.5px] leading-snug">
                      <span className="text-muted">{l.slice(0, idx)}</span>
                      <span className="px-1 font-mono text-[10px]" style={{ color: "var(--color-ok)" }}>→</span>
                      <span className="font-medium">{l.slice(idx + 3)}</span>
                    </p>
                  );
                })}
              </div>
            </div>
          )}
          {risks.length > 0 && (
            <div className="rounded-xl px-3.5 py-3" style={{ background: "color-mix(in srgb, var(--color-warn) 6%, transparent)" }}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-warn)" }}>
                Watch out
              </p>
              <div className="mt-1.5 space-y-1">
                {risks.map((l, i) => (
                  <p key={i} className="text-[12.5px] leading-snug text-muted">{l.slice(7)}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {rows.length === 0 && risks.length === 0 && <MetaRows body={item.body} channel="green" />}
      {notes.length > 0 && (
        <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-bright/90">
          <span className="mr-1.5 font-mono text-[10px]" style={{ color: "var(--color-ok)" }}>▸</span>
          {notes[0].slice(7)}
        </p>
      )}
      <FillCTA channel="green" label="Open detail" onClick={() => onOpen("open_detail")} />
    </article>
  );
}

/* ---- Judge: amber channel, score bars with the why ---- */
function JudgeCard({ item, onOpen }: CardProps) {
  const lines = (item.body ?? "").split("\n").filter(Boolean);
  const notes = lines.filter((l) => l.startsWith("Note → "));
  const rows = lines.filter((l) => l.includes(" → ") && !l.startsWith("Note → "));
  const scores = rows
    .map((l) => {
      const idx = l.indexOf(" → ");
      const name = l.slice(0, idx);
      const rest = l.slice(idx + 3);
      const m = rest.match(/^(\d+(?:\.\d+)?)\s*\/\s*10(?:\s*[·—-]\s*(.*))?$/);
      return m ? { name, score: Number(m[1]), note: m[2] ?? "" } : null;
    })
    .filter((s): s is { name: string; score: number; note: string } => s !== null);
  const rest = rows.filter((l) => !/^.*\s→\s*\d+(?:\.\d+)?\s*\/\s*10/.test(l));
  const prose = lines.filter((l) => !l.includes(" → ") && !l.startsWith("Note → "));
  return (
    <article className="card-surface group/card relative px-4 py-3.5" onClick={() => onOpen("open_judgment")}>
      <Kicker channel="amber" fresh={<Fresh item={item} />} icon={icons.scale} right={<GhostPill channel="amber">attention</GhostPill>}>
        Judge · Watch
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      {scores.length > 0 && (
        <div className="mt-3 space-y-2.5 rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, currentColor 3%, transparent)" }}>
          {scores.map((s) => {
            const color = s.score >= 7 ? "var(--color-ok)" : s.score >= 5 ? "var(--color-warn)" : "var(--color-danger)";
            return (
              <div key={s.name}>
                <div className="flex items-center gap-2.5">
                  <span className="w-[86px] shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted">{s.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-lift)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(s.score, 4)}%`, background: color }} />
                  </div>
                  <span className="w-7 shrink-0 text-right font-mono text-[11px] font-bold" style={{ color }}>
                    {s.score}
                  </span>
                </div>
                {s.note && <p className="mt-0.5 pl-[96px] text-[11px] leading-snug text-muted">{s.note}</p>}
              </div>
            );
          })}
        </div>
      )}
      {rest.length > 0 && <MetaRows body={rest.join("\n")} channel="amber" />}
      {prose.length > 0 && <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{prose.join(" ")}</p>}
      {notes.length > 0 && (
        <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-bright/90">
          <span className="mr-1.5 font-mono text-[10px]" style={{ color: "var(--color-warn)" }}>▸</span>
          {notes[0].slice(7)}
        </p>
      )}
      <FillCTA channel="amber" label="Open scorecard" onClick={() => onOpen("open_judgment")} />
    </article>
  );
}

/* ---- Plan: green channel, doc chips ---- */
function PlanCard({ item, onOpen }: CardProps) {
  const docs = ["scope.md", "prd.md", "spec.md"];
  return (
    <article className="card-surface group/card relative px-4 py-3.5" onClick={() => onOpen("open_plan")}>
      <Kicker channel="green" fresh={<Fresh item={item} />} icon={icons.file} right={<GhostPill channel="green">ready</GhostPill>}>
        Plan · Docs
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {docs.map((d) => (
          <span key={d} className="pill border border-line-soft" style={{ background: "var(--color-raised)" }}>
            <span style={{ color: "var(--color-ok)" }}>✓</span> {d}
          </span>
        ))}
      </div>
      <FillCTA channel="green" label="Read the plan" onClick={() => onOpen("open_plan")} />
    </article>
  );
}

/* ---- Repo: green channel ---- */
function ActionCard({ item, onOpen, onSend }: CardProps) {
  const fullName = (item.body ?? "").split("\n").find((l) => l.startsWith("Repo → "))?.slice(7);
  return (
    <article className="card-surface group/card relative px-4 py-3.5" onClick={() => onOpen("open_repo")}>
      <Kicker channel="green" fresh={<Fresh item={item} />} icon={icons.repo} right={<GhostPill channel="green">ready</GhostPill>}>
        Start · GitHub
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      <MetaRows body={item.body} channel="green" />
      <div className="mt-3 flex flex-wrap gap-2">
        <FillCTA channel="green" label="Open repo" onClick={() => onOpen("open_repo")} />
        <GhostCTA
          label="Make it public"
          onClick={() => onSend(fullName ? `Make ${fullName} public on GitHub — I confirm this repo is meant to be open.` : "Make the repo on the bag public.")}
        />
      </div>
    </article>
  );
}

/* ---- Rules fault: red channel, CTA feeds the chat channel ---- */
function ErrorCard({ item, onSend, onDismiss }: CardProps) {
  const url = (item.body ?? "").split("\n").find((l) => l.startsWith("Page → "))?.slice(7);
  return (
    <article className="card-surface group/card relative px-4 py-3.5">
      <Dismiss id={item.id} onDismiss={onDismiss} />
      <Kicker channel="red" fresh={<Fresh item={item} />} icon={icons.alert} right={<GhostPill channel="red">blocked</GhostPill>}>
        Fault · Rules
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      <MetaRows body={item.body} channel="red" />
      <FillCTA
        channel="red"
        label="Retry in chat"
        onClick={() => {
          onSend(url ? `Retry reading the rules at ${url} — fetch it again and pin the claims.` : "Retry reading the contest rules.");
        }}
      />
    </article>
  );
}

/* ---- Kernel/scope: informational, muted (low-stakes muting) ---- */
function InfoCard({ item, label, onDismiss }: { item: CardItemRow; label: string; onDismiss: (id: number) => void }) {
  void onDismiss;
  return (
    <article className="card-surface group/card relative px-4 py-3.5">
      <Dismiss id={item.id} onDismiss={onDismiss} />
      <Kicker channel="info">{label}</Kicker>
      {item.type === "idea-kernel" ? (
        <blockquote className="mt-2 border-l-2 pl-3 text-[14px] font-semibold leading-relaxed tracking-tight" style={{ borderColor: "var(--color-action)" }}>
          {item.title}
        </blockquote>
      ) : (
        <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      )}
      {item.body && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{item.body}</p>}
    </article>
  );
}

/* ---- Scout: this week's picks ---- */
function ScoutCard({ item, onDismiss }: { item: CardItemRow; onDismiss: (id: number) => void }) {
  const rows: { title: string; url: string; verdict: string; why: string }[] = [];
  if (item.body) {
    for (const block of item.body.split("\n\n")) {
      const lines = block.split("\n").filter(Boolean);
      const head = lines[0] ?? "";
      const idx = head.indexOf(" → ");
      if (idx < 0) continue;
      const title = head.slice(0, idx);
      const url = head.slice(idx + 3).trim();
      const rest = lines.slice(1).join(" ");
      const vMatch = rest.match(/^(Worth it|Stretch|Skip):\s*/);
      const verdict = vMatch ? vMatch[1] : "Pick";
      const why = vMatch ? rest.slice(vMatch[0].length) : rest;
      rows.push({ title, url, verdict, why });
    }
  }
  const verdictChannel: Record<string, Channel> = { "Worth it": "green", Stretch: "amber", Skip: "red", Pick: "blue" };
  return (
    <article className="card-surface group/card relative px-4 py-3.5">
      <Dismiss id={item.id} onDismiss={onDismiss} />
      <Kicker channel="green" fresh={<Fresh item={item} />} icon={icons.spark} right={<GhostPill channel="green">weekly</GhostPill>}>
        Scout · This week
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      {rows.length > 0 && (
        <div className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-line-soft px-3 py-2 transition-colors hover:border-line"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold leading-snug">{r.title}</span>
                <span
                  className="pill shrink-0 font-bold"
                  style={{
                    background: `color-mix(in srgb, ${CHANNEL[verdictChannel[r.verdict] ?? "blue"]} 12%, transparent)`,
                    color: CHANNEL[verdictChannel[r.verdict] ?? "blue"],
                  }}
                >
                  {r.verdict}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{r.why}</p>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/* ---- Generic: header / what-changed ---- */
function SimpleCard({ item, deadlineAt, onOpen }: CardProps) {
  const isHeader = item.type === "header";
  const changed = item.severity === "warn";
  const channel: Channel = isHeader ? "blue" : "amber";
  return (
    <article
      className={"card-surface group/card relative px-4 py-3.5" + (item.action_tool ? " cursor-pointer transition-all hover:border-line" : "")}
      onClick={item.action_tool ? () => onOpen(item.action_tool!) : undefined}
    >
      <Kicker
        fresh={<Fresh item={item} />}
        channel={channel}
        icon={isHeader ? icons.globe : icons.eye}
        right={
          !isHeader && !changed ? undefined : (
            <GhostPill channel={changed ? "amber" : channel}>{changed ? "moved" : isHeader ? undefined : "quiet"}</GhostPill>
          )
        }
      >
        {isHeader ? "On the bag · Devpost" : "Watch · Rules"}
      </Kicker>
      <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{item.title}</h3>
      <MetaRows body={item.body} channel={channel} />
      {item.action_label && item.action_tool && (
        changed || isHeader ? (
          <FillCTA channel={channel} label={item.action_label} onClick={() => onOpen(item.action_tool!)} />
        ) : (
          <GhostCTA label={item.action_label} onClick={() => onOpen(item.action_tool!)} />
        )
      )}
    </article>
  );
}

export function TheCard({
  items,
  contests,
  deadlineAt,
  onSwitch,
  onOpenDetail,
  onOpenPlan,
  onOpenRepo,
  onOpenJudge,
  onStartFind,
  onSend,
  onDismiss,
}: {
  items: CardItemRow[];
  contests: { id: number; title: string; active: number }[];
  deadlineAt: string | null;
  onSwitch: (contestId: number) => void;
  onOpenDetail: () => void;
  onOpenPlan: () => void;
  onOpenRepo: () => void;
  onOpenJudge: () => void;
  onStartFind: () => void;
  onSend: (text: string) => void;
  onDismiss: (id: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card-surface mx-4 mt-4 p-5">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-action)" }}>
          ON THE BAG · NOTHING YET
        </p>
        <h2 className="mt-2 text-[17px] font-bold leading-snug tracking-tight">
          No contest is carrying your deadlines, fine print, or plan
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Find one and the caddie carries the bag.</p>
        <button
          onClick={onStartFind}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
        >
          Find a hackathon
        </button>
      </div>
    );
  }

  const openBy = (tool: string) => {
    if (tool === "open_plan") onOpenPlan();
    else if (tool === "open_repo") onOpenRepo();
    else if (tool === "open_judgment") onOpenJudge();
    else onOpenDetail();
  };

  const propsFor = (item: CardItemRow): CardProps => ({ item, deadlineAt, onOpen: openBy, onSend, onDismiss });

  return (
    <div className="space-y-2.5 p-4">
      {contests.length > 1 && (
        <label className="mb-1 block px-1">
          <span className="kicker block pb-1">On the bag · switch contest</span>
          <select
            value={contests.find((c) => c.active)?.id ?? ""}
            onChange={(e) => onSwitch(Number(e.target.value))}
            className="input h-8 py-1 text-[12px]"
          >
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.active ? "● " : ""}
                {c.title.slice(0, 60)}
              </option>
            ))}
          </select>
        </label>
      )}
      {items
        .filter((item) => item.type !== "judge-watch-data" && item.type !== "contest-digest-data")
        .map((item) => {
          switch (item.type) {
            case "deadline":
              return <DeadlineCard key={item.id} {...propsFor(item)} />;
            case "fit":
              return <FitCard key={item.id} {...propsFor(item)} />;
            case "judge-watch":
              return <JudgeCard key={item.id} {...propsFor(item)} />;
            case "plan":
              return <PlanCard key={item.id} {...propsFor(item)} />;
            case "action":
              return <ActionCard key={item.id} {...propsFor(item)} />;
            case "rules-error":
              return <ErrorCard key={item.id} {...propsFor(item)} />;
            case "scout":
              return <ScoutCard key={item.id} item={item} onDismiss={onDismiss} />;
            case "idea-kernel":
              return <InfoCard key={item.id} item={item} label="Ideate · Kernel" onDismiss={onDismiss} />;
            case "scope-line":
              return <InfoCard key={item.id} item={item} label="Ideate · Scope" onDismiss={onDismiss} />;
            default:
              return <SimpleCard key={item.id} {...propsFor(item)} />;
          }
        })}
    </div>
  );
}
