// Email via Resend (slice 12): transactional only — password reset and
// rules-change alerts. If the key is missing, sending no-ops (local dev).

import { env } from "cloudflare:workers";

export type SendResult = { sent: boolean; skipped?: string; error?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const key = env.RESEND_API_KEY;
  if (!key) return { sent: false, skipped: "RESEND_API_KEY not configured" };
  const from = env.RESEND_FROM || "Caddie <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) return { sent: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#e6e9ef;background:#090b10;border:1px solid rgba(255,255,255,0.08);border-radius:12px">
  <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#4d9fff;margin:0 0 4px">CADDIE</p>
  <h1 style="font-size:20px;margin:0 0 16px;color:#e6e9ef">${title}</h1>
  <div style="font-size:14px;line-height:1.6;color:#c8cdd8">${bodyHtml}</div>
  <p style="font-size:11px;color:#8b93a3;margin-top:24px">It carries the bag · you swing — caddie.jamalibrahim.dev</p>
</div>`;
}
