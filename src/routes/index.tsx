import { useEffect, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { getBootstrap, dismissCard, switchContest } from "../server/data";
import { TheCard } from "../components/TheCard";
import { TasksLane } from "../components/TasksLane";
import { Chat } from "../components/Chat";
import { ChatComposer } from "../components/ChatComposer";
import { OnboardingModal } from "../components/modals/OnboardingModal";
import { ContestDetail } from "../components/overlays/ContestDetail";
import { PlanViewer } from "../components/overlays/PlanViewer";
import { RepoSuccess } from "../components/modals/RepoSuccess";
import { JudgePanel } from "../components/overlays/JudgePanel";
import { SettingsPanel } from "../components/modals/SettingsPanel";
import { Landing } from "../components/Landing";
import { logout } from "../server/data";

export const Route = createFileRoute("/")({
  loader: () => getBootstrap(),
  pendingComponent: ShellSkeleton,
  component: Shell,
});

function Shell() {
  const boot = Route.useLoaderData();
  const router = useRouter();

  if (!boot.authed) {
    return <Landing onAuthed={() => router.invalidate()} />;
  }

  // Key by session user so every per-user state (chat history, open modals,
  // tabs) remounts fresh when the account changes. Without this, useChat keeps
  // the previous user's messages in its internal state and the next session
  // renders — and sends to the agent — another user's thread.
  return <AuthedShell key={boot.email ?? "anon"} boot={boot} router={router} />;
}

function AuthedShell({ boot, router }: { boot: ReturnType<typeof Route.useLoaderData>; router: ReturnType<typeof useRouter> }) {
  // Tablet+ keeps the two-pane split (Card|Tasks + Chat); below 768px the
  // shell becomes one pane with a bottom tab bar. matchMedia drives it so the
  // layout re-flows live on rotation/resize.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Desktop opens on The Card (the aside only hosts card/tasks); mobile opens
  // on Chat — the home surface there.
  const [tab, setTab] = useState<"card" | "tasks" | "chat">(isDesktop ? "card" : "chat");
  const [detailOpen, setDetailOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [judgeOpen, setJudgeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chat = useChat({
    messages: boot.messageStrings.map((s: string) => JSON.parse(s) as UIMessage),
    onFinish: () => router.invalidate(),
  });

  // Resizable split: 50/50 by default, draggable divider (learner checkpoint feedback).
  // Listens to both pointer and mouse families — some environments synthesize only mouse events.
  const panesRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(50);

  function beginDrag(fromPointer: boolean) {
    const moveFamily = fromPointer ? "pointermove" : "mousemove";
    const upFamily = fromPointer ? "pointerup" : "mouseup";
    const onMove = (ev: PointerEvent | MouseEvent) => {
      if (!panesRef.current) return;
      const rect = panesRef.current.getBoundingClientRect();
      const next = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(70, Math.max(28, next)));
    };
    const onUp = () => {
      window.removeEventListener(moveFamily, onMove);
      window.removeEventListener(upFamily, onUp);
    };
    window.addEventListener(moveFamily, onMove);
    window.addEventListener(upFamily, onUp);
  }

  function startFind() {
    chat.sendMessage({ text: "Find me hackathons worth my time." });
  }

  const cardPane = (
    <TheCard
      items={boot.cardItems}
      contests={boot.contests}
      deadlineAt={boot.deadlineAt}
      onSwitch={(contestId) => {
        switchContest({ data: { contestId } }).then(() => router.invalidate());
      }}
      onOpenDetail={() => setDetailOpen(true)}
      onOpenPlan={() => setPlanOpen(true)}
      onOpenRepo={() => setRepoOpen(true)}
      onOpenJudge={() => setJudgeOpen(true)}
      onStartFind={startFind}
      onSend={(text) => {
        if (!isDesktop) setTab("chat");
        chat.sendMessage({ text });
      }}
      onDismiss={async (id) => {
        await dismissCard({ data: { id } });
        router.invalidate();
      }}
    />
  );
  const tasksPane = <TasksLane tasks={boot.tasks} onRefresh={() => router.invalidate()} />;
  const chatPane = (
    <Chat
      messages={chat.messages}
      sendMessage={chat.sendMessage}
      status={chat.status}
      error={chat.error}
      composer={isDesktop ? "inline" : "external"}
    />
  );

  const dockSend = (opts: { text: string }) => {
    if (tab !== "chat") setTab("chat");
    chat.sendMessage(opts);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 sm:px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[12px] font-semibold tracking-[0.22em] text-bright">
            CADDIE<span className="text-action">▸</span>
          </span>
          <span className="kicker hidden sm:inline">it carries the bag · you swing</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="kicker hidden sm:inline">
            {boot.profile ? `${boot.profile.name} · ${boot.profile.hours_per_week ?? "?"}h/wk` : "unbriefed"}
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Profile and settings"
            className="grid h-7 w-7 place-items-center rounded-full border border-line-soft font-mono text-[11px] text-muted transition-colors hover:border-action hover:text-action"
          >
            {boot.profile?.name?.[0]?.toUpperCase() ?? "?"}
          </button>
          <button
            onClick={async () => {
              await logout();
              router.invalidate();
            }}
            className="kicker transition-colors hover:text-bright"
          >
            log out
          </button>
        </div>
      </header>

      {isDesktop ? (
        <div ref={panesRef} className="flex min-h-0 flex-1">
          <aside
            className="flex min-w-[300px] shrink-0 grow-0 flex-col border-r border-line-soft"
            style={{ width: `${leftPct}%` }}
          >
            <div className="flex gap-1 px-4 pt-3">
              <TabButton active={tab === "card"} onClick={() => setTab("card")}>
                The Card
              </TabButton>
              <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")}>
                Tasks
              </TabButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {tab === "card" ? cardPane : tasksPane}
            </div>
          </aside>

          <div
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
            onPointerDown={() => beginDrag(true)}
            onMouseDown={() => beginDrag(false)}
            className="w-1 shrink-0 cursor-col-resize bg-line-soft transition-colors hover:bg-action/50 active:bg-action/70"
          />

          {chatPane}
        </div>
      ) : (
        // Mobile: chat is the home surface; the composer + nav live in one
        // liquid-glass dock so input and tabs read as a single unit. Card/
        // Tasks are glance surfaces; Profile opens the settings slide-over.
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "chat" ? chatPane : tab === "card" ? cardPane : tasksPane}
          </div>
          <MobileDock
            tab={tab}
            onTab={setTab}
            onProfile={() => setSettingsOpen(true)}
            sendMessage={dockSend}
            status={chat.status}
          />
        </div>
      )}

      {!boot.profile && <OnboardingModal onSaved={() => router.invalidate()} />}
      <ContestDetail open={detailOpen} onClose={() => setDetailOpen(false)} />
      <PlanViewer docs={boot.planDocs} open={planOpen} onClose={() => setPlanOpen(false)} />
      <RepoSuccess open={repoOpen} onClose={() => setRepoOpen(false)} />
      <JudgePanel open={judgeOpen} onClose={() => setJudgeOpen(false)} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={boot.profile}
        onSaved={() => router.invalidate()}
      />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    // matchMedia's change event is the spec path; resize covers environments
    // (embedded webviews, some simulators) that only fire window resize.
    mq.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [query]);
  return matches;
}

function MobileDock({
  tab,
  onTab,
  onProfile,
  sendMessage,
  status,
}: {
  tab: "card" | "tasks" | "chat";
  onTab: (t: "card" | "tasks" | "chat") => void;
  onProfile: () => void;
  sendMessage: (opts: { text: string }) => void;
  status: "submitted" | "streaming" | "ready" | "error";
}) {
  const items: { key: "card" | "tasks" | "chat"; label: string; icon: React.ReactNode }[] = [
    { key: "chat", label: "Chat", icon: <IconChat /> },
    { key: "card", label: "Today", icon: <IconToday /> },
    { key: "tasks", label: "Tasks", icon: <IconTasks /> },
  ];
  const navBtn =
    "flex flex-col items-center gap-0.5 py-2 transition-colors " +
    "font-mono text-[9px] uppercase tracking-[0.16em]";
  const iconWrap = (active: boolean) =>
    "grid h-6 w-10 place-items-center rounded-full transition-colors " +
    (active ? "bg-action/12" : "text-muted group-hover:text-bright");
  return (
    // One floating glass capsule: composer on top, nav below — they read as a
    // single unit, not two separated bars. Backdrop blur needs a bit of
    // breathing room on the sides so the glass is visible.
    <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5">
      <div className="liquid-glass">
        <ChatComposer sendMessage={sendMessage} status={status} variant="dock" />
        <nav className="grid grid-cols-4 border-t border-line-soft/60 px-2 pb-1 pt-1">
          {items.map((it) => {
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                onClick={() => onTab(it.key)}
                className={"group " + navBtn + (active ? " text-action" : " text-muted hover:text-bright")}
              >
                <span className={iconWrap(active)} style={active ? { color: "var(--color-action)" } : undefined}>
                  {it.icon}
                </span>
                {it.label}
              </button>
            );
          })}
          <button
            onClick={onProfile}
            className={"group " + navBtn + " text-muted hover:text-bright"}
          >
            <span className={iconWrap(false)}>
              <IconProfile />
            </span>
            Profile
          </button>
        </nav>
      </div>
    </div>
  );
}

const navIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconChat() {
  return (
    <svg {...navIconProps}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconToday() {
  return (
    <svg {...navIconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg {...navIconProps}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg {...navIconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-t-lg border-x border-t border-line-soft bg-panel px-4 py-1.5 text-[13px] font-semibold text-bright"
          : "px-4 py-1.5 text-[13px] font-medium text-muted transition hover:text-bright"
      }
    >
      {children}
    </button>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line-soft px-5 py-2.5">
        <span className="kicker">CADDIE</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-1/2 shrink-0 space-y-2.5 border-r border-line-soft p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-surface h-28 animate-pulse" />
          ))}
        </aside>
        <div className="flex flex-1 flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-surface h-12 w-2/3 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
