// Auth (slice 9): email + password with PBKDF2 via Web Crypto (no native bcrypt
// on Workers) and an HMAC-signed cookie session. Strategy recorded in checklist.

import { env } from "cloudflare:workers";

const ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
}

function sessionSecret(): string {
  // Session-signing secret: derived from an existing server secret so no new
  // vendor config is needed. Reset via CLI = change any secret and re-login.
  return env.LLM_API_KEY + "::caddie-session";
}

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export type SessionPayload = { userId: number; issuedAt: number };

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(sessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = toHex((await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))).slice(0, 16));
  return `${body}.${sig}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(sessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex((await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))).slice(0, 16));
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(atob(body)) as SessionPayload;
    // 30-day sessions
    if (Date.now() - payload.issuedAt > 30 * 24 * 3600 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
