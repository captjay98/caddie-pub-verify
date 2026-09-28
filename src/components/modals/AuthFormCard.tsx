import { useState } from "react";
import { forgotPassword, login, register } from "../../server/data";

// Compact auth form card — embedded in the landing page for logged-out visitors.
export function AuthFormCard({ onAuthed }: { onAuthed: () => void }) {
  const [view, setView] = useState<"auth" | "forgot" | "forgot-sent">("auth");
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

  if (view === "forgot" || view === "forgot-sent") {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || !email.trim()) return;
          setBusy(true);
          setError(null);
          const result = await forgotPassword({ data: { email } });
          setBusy(false);
          if (result.ok) setView("forgot-sent");
          else setError(result.error ?? "Reset failed — try again.");
        }}
        className="card-surface w-full max-w-md p-6"
        style={{ background: "var(--color-raised)" }}
      >
        <h2 className="text-lg font-semibold tracking-tight">Reset your password</h2>
        {view === "forgot" ? (
          <>
            <p className="mt-1 text-[13px] text-muted">Enter your email — we'll send a temporary password.</p>
            <label className="mt-4 block">
              <span className="kicker block pb-1.5">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </label>
            {error && <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}
            <button
              type="submit"
              disabled={!email.trim() || busy}
              className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
            >
              {busy ? "Sending…" : "Email me a temporary password"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Sent. Check your inbox for the temporary password, then log in with it.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setView("auth");
            setError(null);
          }}
          className="mt-4 text-[12.5px] font-semibold"
          style={{ color: "var(--color-action)" }}
        >
          ← Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface w-full max-w-md p-6" style={{ background: "var(--color-raised)" }}>
      <h2 className="text-lg font-semibold tracking-tight">
        {mode === "register" ? "Claim your bag" : "Back on the bag"}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {mode === "register"
          ? "Register in 20 seconds — your contests, plan, and tasks stay yours."
          : "Log in to pick up where the last session left off."}
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="kicker block pb-1.5">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
        className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
      >
        {busy ? "Working…" : mode === "register" ? "Claim your bag" : "Log in"}
      </button>

      <div className="mt-3 flex items-center justify-between text-[12.5px] text-muted">
        <span>
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
        </span>
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setView("forgot");
              setError(null);
            }}
            className="hover:text-bright"
          >
            Forgot password?
          </button>
        )}
      </div>
    </form>
  );
}
