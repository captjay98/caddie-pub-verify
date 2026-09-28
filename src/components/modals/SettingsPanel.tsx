import { useState } from "react";
import { saveProfile, clearBag } from "../../server/data";
import { formatTimeAgo } from "../../lib/format";
import { COUNTRIES, EXPERIENCE_LEVELS, countryName } from "../../lib/countries";
import { StackPicker } from "../StackPicker";
import type { ProfileRow } from "../../server/db";

// Profile/settings surface (final-review revision): view + edit the builder
// profile and theme choice. Lives in a slide-over from the header.
export function SettingsPanel({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [stack, setStack] = useState(profile?.stack ?? "");
  const [hours, setHours] = useState(String(profile?.hours_per_week ?? 15));
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [experience, setExperience] = useState(profile?.experience_level ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(
    typeof document !== "undefined" ? document.documentElement.dataset.theme || "dark" : "dark",
  );

  if (!open) return null;

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("caddie-theme", next);
    } catch {
      /* private mode — theme just won't persist */
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !stack.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        data: {
          name: name.trim(),
          stack: stack.trim(),
          hoursPerWeek: Number(hours) || 0,
          goals: goals.trim(),
          country,
          experienceLevel: experience,
        },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-[440px] max-w-[92vw] overflow-y-auto border-l border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Settings</p>
            <h2 className="mt-1 text-lg font-semibold">Profile, preferences, and app info</h2>
          </div>
          <button onClick={onClose} className="rounded-md border border-line-soft px-2.5 py-1 text-xs text-muted hover:text-bright">
            Close
          </button>
        </div>

        {/* Profile header card (today.ai pattern) */}
        <div
          className="mt-5 flex items-center gap-4 rounded-2xl border border-line-soft p-5"
          style={{ background: "linear-gradient(168deg, rgba(77,159,255,0.10), var(--color-panel) 58%)" }}
        >
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
            style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
          >
            {profile?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">{profile?.name ?? "Unbriefed"}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              {profile ? `${profile.hours_per_week ?? "?"}h/week on the bag · updated ${formatTimeAgo(profile.updated_at)}` : "no profile saved yet"}
            </p>
          </div>
        </div>
        {profile && (
          <div className="mt-2.5 space-y-1.5 rounded-xl border border-line-soft px-4 py-3 text-[12.5px] leading-snug" style={{ background: "var(--color-panel)" }}>
            <p>
              <span className="text-muted">Stack → </span>
              <span className="font-medium">{profile.stack ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted">Goals → </span>
              <span className="font-medium">{profile.goals || "—"}</span>
            </p>
          </div>
        )}

        <form onSubmit={save} className="mt-5 space-y-4">
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Stack">
            <StackPicker value={stack} onChange={setStack} />
          </Field>
          <Field label="Hours per week">
            <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
          </Field>
          <Field label="Country">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              <option value="">Choose…</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Experience level">
            <select value={experience} onChange={(e) => setExperience(e.target.value)} className="input">
              <option value="">Choose…</option>
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Goals">
            <textarea value={goals} onChange={(e) => setGoals(e.target.value)} className="input h-20 resize-none" />
          </Field>
          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
          )}
          <button
            type="submit"
            disabled={!name.trim() || !stack.trim() || saving}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
          >
            {saving ? "Saving…" : "Update the bag"}
          </button>
        </form>

        <div className="mt-6 border-t border-line-soft pt-5">
          <p className="kicker">Appearance</p>
          <button
            onClick={toggleTheme}
            className="mt-2 flex w-full items-center justify-between rounded-lg border border-line-soft px-3.5 py-2.5 text-sm"
          >
            <span>{theme === "dark" ? "Halo Ops dark" : "Halo Ops light"}</span>
            <span className="font-mono text-[11px] text-action">switch →</span>
          </button>
        </div>

        <div className="mt-6 border-t border-line-soft pt-5">
          <p className="kicker">Danger zone</p>
          <button
            onClick={async () => {
              await clearBag();
              onSaved();
              onClose();
            }}
            className="mt-2 w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors"
            style={{ borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)", color: "var(--color-danger)" }}
          >
            Clear the bag — removes every card (claims, snapshots, and plan docs are kept)
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="kicker block pb-1.5">{label}</span>
      {children}
    </label>
  );
}
