import { useState } from "react";
import { register, login } from "../../server/data";

// Auth gate (slice 9): register or log in before the shell renders.
// New accounts continue straight into the onboarding modal (profile empty).
export function AuthPanel({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = mode === "register" ? await register({ data: { email, password } }) : await login({ data: { email, password } });
      if (result.ok) onAuthed();
      else setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center p-4">
      <form onSubmit={submit} className="card-surface w-full max-w-md p-6" style={{ background: "var(--color-raised)" }}>
        <p className="font-mono text-[12px] font-medium tracking-[0.22em] text-bright">CADDIE</p>
        <p className="kicker mt-1">it carries the bag · you swing</p>

        <h1 className="mt-4 text-lg font-semibold">
          {mode === "register" ? "Claim your bag" : "Back on the bag"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {mode === "register"
            ? "Create an account — your contests, plan, and tasks stay yours."
            : "Log in to pick up where the last session left off."}
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="kicker block pb-1.5">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="input"
            />
          </label>
          <label className="block">
            <span className="kicker block pb-1.5">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
              className="input"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || !password || busy}
          className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
        >
          {busy ? "Working…" : mode === "register" ? "On the bag" : "Log in"}
        </button>

        <p className="mt-3 text-center text-[12.5px] text-muted">
          {mode === "register" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              setError(null);
            }}
            className="font-semibold"
            style={{ color: "var(--color-action)" }}
          >
            {mode === "register" ? "Log in" : "Create one"}
          </button>
        </p>
      </form>
    </div>
  );
}
