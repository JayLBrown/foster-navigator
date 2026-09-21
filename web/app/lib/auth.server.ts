/* Passwordless sign-in: email -> 6-digit code -> session cookie.
 *
 * Hand-rolled rather than library-backed, because the surface is narrow (no
 * passwords, no federation) and every piece here is covered by auth.test.mjs.
 * If requirements grow to SSO or MFA, replace this file with Better Auth.
 *
 * Properties the tests assert:
 *   - codes and session tokens are stored hashed, never in plaintext
 *   - codes expire, are single-use, and are capped at 5 attempts
 *   - requesting a new code invalidates outstanding ones
 *   - an unknown email produces no code but is indistinguishable in the UI
 *   - signing out deletes the session server-side, not just the cookie
 */
import type { Db, Caller } from "./db.server";

const CODE_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const MAX_ATTEMPTS = 5;

export const SESSION_COOKIE = "fpn_session";

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/* Comparison that does not leak position of the first difference. */
const sameHash = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const sixDigits = () => {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
};

const normalizeEmail = (e: string) => e.trim().toLowerCase();
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

/* ---------------- passwords ---------------- */

/* PBKDF2 via Web Crypto: bcrypt and argon2 are not available on Workers.
 *
 * The iteration count is a CPU-time tradeoff. 100k takes roughly 50-100ms of
 * CPU, which exceeds the Workers FREE tier limit of 10ms per request — sign-in
 * will fail there. The Workers Paid plan allows 30s and is the right answer;
 * lowering this is a real reduction in resistance to offline cracking, not a
 * free win.
 *
 * Stored hashes record the count they were made with, so changing this does
 * not invalidate existing passwords. Override with PBKDF2_ITERATIONS. */
const DEFAULT_ITERATIONS = 100_000;

let configuredIterations = DEFAULT_ITERATIONS;
export function configurePasswordHashing(env: { PBKDF2_ITERATIONS?: string }) {
  const n = Number(env.PBKDF2_ITERATIONS);
  if (Number.isFinite(n) && n >= 1_000) configuredIterations = Math.floor(n);
}

const toHex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function derive(password: string, saltHex: string, iterations: number) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const saltHex = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await derive(password, saltHex, configuredIterations);
  return `pbkdf2$${configuredIterations}$${saltHex}$${hash}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltHex, expected] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const actual = await derive(password, saltHex, Number(iterations));
  return sameHash(actual, expected);
}

export type SignInResult =
  | { ok: true; token: string; caller: Caller }
  | { ok: false };

export async function signInWithPassword(
  db: Db,
  rawEmail: string,
  password: string
): Promise<SignInResult> {
  const email = normalizeEmail(rawEmail);
  const row = await db
    .prepare(`SELECT user_id, role, password_hash FROM profiles WHERE email = ?`)
    .bind(email)
    .first<{ user_id: string; role: Caller["role"]; password_hash: string | null }>();

  /* Same failure shape whether the address is unknown or the password is
     wrong, so the form cannot be used to enumerate accounts. */
  if (!row?.password_hash) {
    await derive(password, "00".repeat(16), configuredIterations); // equalize timing
    return { ok: false };
  }
  if (!(await checkPassword(password, row.password_hash))) return { ok: false };

  const token = await issueSession(db, row.user_id);
  return { ok: true, token, caller: { userId: row.user_id, role: row.role } };
}

async function issueSession(db: Db, userId: string) {
  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  await db
    .prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(await sha256(token), userId, daysFromNow(SESSION_TTL_DAYS))
    .run();
  return token;
}

/* ---------------- one-time codes ----------------
   Retained and tested, unused while sign-in is password-based. This is what
   you want once email is wired: codes rather than magic links, because a
   magic link opens the system browser instead of an installed PWA and the
   session lands in the wrong place. */

export type CodeRequest = { sent: true; devCode?: string; known: boolean };

/* Always reports success. Whether an address has an account is not something
   an unauthenticated caller should be able to probe. */
export async function requestCode(
  db: Db,
  rawEmail: string,
  opts: { exposeCodeForDev?: boolean } = {}
): Promise<CodeRequest> {
  const email = normalizeEmail(rawEmail);

  const profile = await db
    .prepare(`SELECT user_id FROM profiles WHERE email = ?`)
    .bind(email)
    .first<{ user_id: string }>();
  if (!profile) return { sent: true, known: false };

  /* a new code supersedes any outstanding one */
  await db
    .prepare(`UPDATE otp_codes SET consumed_at = datetime('now') WHERE email = ? AND consumed_at IS NULL`)
    .bind(email)
    .run();

  const code = sixDigits();
  await db
    .prepare(`INSERT INTO otp_codes (id, email, code_hash, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), email, await sha256(code), minutesFromNow(CODE_TTL_MINUTES))
    .run();

  return { sent: true, known: true, devCode: opts.exposeCodeForDev ? code : undefined };
}

/* ---------------- verifying a code ---------------- */

export type VerifyResult =
  | { ok: true; token: string; caller: Caller }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

export async function verifyCode(db: Db, rawEmail: string, code: string): Promise<VerifyResult> {
  const email = normalizeEmail(rawEmail);

  const row = await db
    .prepare(
      `SELECT id, code_hash, expires_at, attempts FROM otp_codes
        WHERE email = ? AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1`
    )
    .bind(email)
    .first<{ id: string; code_hash: string; expires_at: string; attempts: number }>();

  if (!row) return { ok: false, reason: "invalid" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  if (!sameHash(row.code_hash, await sha256(code.trim()))) {
    await db.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run();
    const attempts = row.attempts + 1;
    return { ok: false, reason: attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid" };
  }

  /* single use */
  await db.prepare(`UPDATE otp_codes SET consumed_at = datetime('now') WHERE id = ?`).bind(row.id).run();

  const profile = await db
    .prepare(`SELECT user_id, role FROM profiles WHERE email = ?`)
    .bind(email)
    .first<{ user_id: string; role: Caller["role"] }>();
  if (!profile) return { ok: false, reason: "invalid" };

  const token = await issueSession(db, profile.user_id);
  return { ok: true, token, caller: { userId: profile.user_id, role: profile.role } };
}

/* ---------------- sessions ---------------- */

export type SignedIn = Caller & { fullName: string; email: string };

export async function callerFromToken(db: Db, token: string | null): Promise<SignedIn | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT s.expires_at, p.user_id, p.role, p.full_name, p.email
         FROM sessions s JOIN profiles p ON p.user_id = s.user_id
        WHERE s.token_hash = ?`
    )
    .bind(await sha256(token))
    .first<{ expires_at: string; user_id: string; role: Caller["role"]; full_name: string; email: string }>();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(db, token);
    return null;
  }
  return { userId: row.user_id, role: row.role, fullName: row.full_name, email: row.email };
}

export async function destroySession(db: Db, token: string | null) {
  if (!token) return;
  await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256(token)).run();
}

/* ---------------- cookie ---------------- */

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export const setSessionCookie = (token: string, secure: boolean) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 86400}` +
  (secure ? "; Secure" : "");

export const clearSessionCookie = (secure: boolean) =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` + (secure ? "; Secure" : "");
