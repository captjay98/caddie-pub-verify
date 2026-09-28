import { useState } from "react";

// Composer shared by both layouts.
// - "standalone": desktop — own card surface, border-t, padded form.
// - "dock": mobile — translucent field with no chrome, sits inside the
//   liquid-glass dock above the nav so input and tabs read as one unit.
export function ChatComposer({
  sendMessage,
  status,
  variant = "standalone",
}: {
  sendMessage: (opts: { text: string }) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  variant?: "standalone" | "dock";
}) {
  const [input, setInput] = useState("");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    sendMessage({ text });
    setInput("");
  }

  const field = (
    <div
      className={
        "flex items-end gap-2 " +
        (variant === "dock" ? "rounded-2xl px-2.5 py-1.5" : "card-surface p-2")
      }
      style={
        variant === "dock"
          ? { background: "color-mix(in srgb, var(--color-ink) 12%, transparent)", border: "1px solid var(--color-line-soft)" }
          : { background: "var(--color-panel)" }
      }
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        enterKeyHint="send"
        placeholder="Ask the caddie…"
        rows={1}
        className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none sm:text-sm"
      />
      <button
        type="submit"
        disabled={!input.trim() || status === "submitted" || status === "streaming"}
        className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
        style={{ background: "linear-gradient(180deg, var(--color-action), var(--color-action-deep))" }}
      >
        Send
      </button>
    </div>
  );

  if (variant === "dock") {
    return <form onSubmit={submit} className="px-2 pt-2">{field}</form>;
  }
  return (
    <form
      onSubmit={submit}
      className="border-t border-line-soft p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
    >
      {field}
    </form>
  );
}