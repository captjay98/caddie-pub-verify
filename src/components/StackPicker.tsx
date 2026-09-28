import { useMemo, useRef, useState } from "react";

// Curated quick-picks — the technologies hackathon builders actually reach for.
// Custom entries are allowed; the curated list just makes the common case fast
// and keeps strings consistent for the agent briefing and scout queries.
const SUGGESTIONS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Vue", "Svelte",
  "Node.js", "Hono", "Python", "FastAPI", "Rust", "Go",
  "Cloudflare Workers", "Cloudflare D1", "Supabase", "Firebase",
  "PostgreSQL", "Prisma", "Tailwind", "React Native", "Flutter",
  "Swift", "Kotlin", "Gemini API", "OpenAI API",
];

// Profile.stack is a comma-separated TEXT column — chips join back into the
// same format, so the agent briefing and scout queries keep working unchanged.
export function parseStack(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function StackPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => parseStack(value), [value]);

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const exists = selected.some((s) => s.toLowerCase() === t.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...selected, t].join(", "));
    setDraft("");
    inputRef.current?.focus();
  };

  const remove = (target: string) => {
    onChange(selected.filter((s) => s !== target).join(", "));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  };

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return SUGGESTIONS.filter(
      (s) => !selected.some((sel) => sel.toLowerCase() === s.toLowerCase()) && (!q || s.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [draft, selected]);

  return (
    <div className="space-y-2">
      <div
        className="input flex min-h-11 flex-wrap items-center gap-1.5 py-1.5"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((s) => (
          <span
            key={s}
            className="pill border border-line-soft font-semibold"
            style={{ background: "var(--color-panel)", color: "var(--color-bright)" }}
          >
            {s}
            <button
              type="button"
              aria-label={`Remove ${s}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(s);
              }}
              className="text-muted transition-colors hover:text-danger"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? "Type a technology, Enter to add…" : "Add another…"}
          className="min-w-32 flex-1 bg-transparent text-[13.5px] text-bright outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="pill border border-line-soft text-muted transition-colors hover:border-action hover:text-action"
              style={{ background: "var(--color-panel)" }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}