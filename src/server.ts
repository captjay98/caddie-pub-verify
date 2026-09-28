// Custom server entry (TanStack Start convention: src/server.ts) so the worker
// can carry the Cloudflare `scheduled` handler alongside the app's fetch.

import handler from "@tanstack/react-start/server-entry";
import { runDueScheduledTasks } from "./server/taskRunner";
import { env } from "cloudflare:workers";

type ScheduledEvent = { cron: string; scheduledTime: number };
type ExecutionContext = { waitUntil: (p: Promise<unknown>) => void };

export default {
  async fetch(request: Request, ctx?: { waitUntil?: (p: Promise<unknown>) => void }) {
    return handler.fetch(request, ctx as never);
  },

  async scheduled(event: ScheduledEvent, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        // Touch env so the binding is read in this invocation context.
        void env.DB;
        const ran = await runDueScheduledTasks();
        console.log(`[caddie cron] ran ${ran} due scheduled task(s) for ${event.cron}`);
      })(),
    );
  },
};
