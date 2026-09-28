import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { ToolBanners } from "./ToolBanners";
import { Markdown } from "./Markdown";
import { ChatComposer } from "./ChatComposer";

type ChatProps = {
  messages: UIMessage[];
  sendMessage: (opts: { text: string }) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined | null;
  /** Desktop embeds the composer in the pane; mobile docks it above the nav. */
  composer: "inline" | "external";
};

export function Chat({ messages, sendMessage, status, error, composer }: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          <p className="kicker text-action">Caddie</p>
          <h1 className="font-mono text-[13px] font-semibold tracking-wide">CHANNEL</h1>
        </div>
        <p className="kicker">
          {status === "streaming" || status === "submitted" ? "working…" : "ready"}
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-sm text-muted">Type to the caddie — briefs, alerts, and tools show up here.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-xl rounded-br-sm border border-action/30 bg-action/10 px-3.5 py-2.5"
                  : "max-w-[85%] rounded-xl rounded-bl-sm border border-line-soft bg-panel px-3.5 py-2.5"
              }
            >
              {m.role === "assistant" && <ToolBanners parts={m.parts} />}
              {m.parts.map((part, i) =>
                part.type === "text" && part.text.trim() ? (
                  m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
                      {part.text}
                    </p>
                  ) : (
                    <Markdown key={i} text={part.text} />
                  )
                ) : null,
              )}
            </div>
          </div>
        ))}
        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error.message || "The caddie hit an error. Try again."}
          </p>
        )}
      </div>

      {composer === "inline" && <ChatComposer sendMessage={sendMessage} status={status} />}
    </section>
  );
}