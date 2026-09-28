import { useState } from "react";
import { saveProfile } from "../../server/data";
import { COUNTRIES, EXPERIENCE_LEVELS, countryName } from "../../lib/countries";
import { StackPicker } from "../StackPicker";

// Onboarding v2 (slice 11): country + experience level + auto-detected timezone.
// Country feeds the eligibility cross-check; timezone feeds local-time deadlines.

export function OnboardingModal({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [hours, setHours] = useState("15");
  const [goals, setGoals] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [experience, setExperience] = useState("");
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && stack.trim().length > 0 && (country !== "" || resolveCountry(countryQuery) !== null) && experience !== "" && !saving;
  const matches = countryQuery
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(countryQuery.toLowerCase()) || c.code.toLowerCase() === countryQuery.toLowerCase()).slice(0, 6)
    : [];
  const showCountryHint = country === "" && countryQuery.trim().length > 0 && resolveCountry(countryQuery) === null;

  function resolveCountry(query: string): string | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const hit = COUNTRIES.find((c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q);
    return hit?.code ?? null;
  }

  function pickCountry(code: string) {
    setCountry(code);
    setCountryQuery(COUNTRIES.find((c) => c.code === code)?.name ?? code);
    setCountryOpen(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Typing alone never sets country state — resolve the query on submit so
    // "type Nigeria, hit On the bag" works without clicking a chip.
    const resolved = country !== "" ? country : resolveCountry(countryQuery);
    if (!resolved) return;
    if (country === "") setCountry(resolved);
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        data: {
          name: name.trim(),
          stack: stack.trim(),
          hoursPerWeek: Number(hours) || 0,
          goals: goals.trim(),
          country: resolved,
          experienceLevel: experience,
          timezone,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed — try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4">
      <form onSubmit={save} className="card-surface w-full max-w-md p-6" style={{ background: "var(--color-raised)" }}>
        <p className="kicker">First use</p>
        <h1 className="mt-1 text-lg font-semibold">Tell the caddie who's swinging</h1>
        <p className="mt-1 text-[13px] text-muted">
          Country and experience drive eligibility flags and how the caddie talks to you.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamal" autoFocus className="input" />
          </Field>

          <Field label="Country">
            <div className="relative">
              <input
                value={countryOpen ? countryQuery : countryName(country) === "—" ? countryQuery : countryName(country)}
                onChange={(e) => {
                  setCountryQuery(e.target.value);
                  setCountry("");
                  setCountryOpen(true);
                }}
                onFocus={() => setCountryOpen(true)}
                onBlur={() => setTimeout(() => setCountryOpen(false), 300)}
                placeholder="Type to search…"
                className="input"
              />
              {showCountryHint && (
                <p className="mt-1 font-mono text-[10.5px]" style={{ color: "var(--color-warn)" }}>
                  Pick your country from the list
                </p>
              )}
              {countryOpen && matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-panel">
                  {matches.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickCountry(c.code);
                      }}
                      onClick={() => pickCountry(c.code)}
                      className="block w-full px-3 py-2 text-left text-[13px] hover:bg-lift"
                    >
                      <span className="font-mono text-[10px] text-muted">{c.code}</span> {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Experience level">
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setExperience(lvl.value)}
                  title={lvl.hint}
                  className={
                    "rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors " +
                    (experience === lvl.value
                      ? "border-action bg-action/10 text-bright"
                      : "border-line-soft text-muted hover:text-bright")
                  }
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Stack">
            <StackPicker value={stack} onChange={setStack} />
          </Field>

          <Field label="Hours per week">
            <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
          </Field>

          <Field label="Goals">
            <textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="What a win looks like — a shipped POC, a track prize, a new stack…" className="input h-20 resize-none" />
          </Field>
        </div>

        <p className="mt-3 font-mono text-[10.5px] text-muted">Timezone: {timezone} (auto-detected)</p>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
        >
          {saving ? "Saving…" : "On the bag"}
        </button>
      </form>
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
