/* Shared sign-in handling for both doors.
 *
 * One auth backbone, two entrances: foster parents at /signin, licensing
 * specialists at /portal/signin. The credential check is identical; only the
 * framing differs. Signing in at the wrong door still works and redirects to
 * the right side — a specialist who lands on the parent form is lost, not
 * hostile, and rejecting them would leak which role an address holds.
 */
import { redirect } from "react-router";
import { signInWithPassword, setSessionCookie, configurePasswordHashing } from "./auth.server";
import { homeFor } from "./session.server";
import type { Db } from "./db.server";
import type { CloudflareEnv } from "./context";

export type SignInResult = { error: string };

export const isDevRequest = (request: Request) => {
  const url = new URL(request.url);
  return url.protocol === "http:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
};

export async function handleSignIn(
  request: Request,
  env: CloudflareEnv
): Promise<SignInResult> {
  configurePasswordHashing(env);
  const db = env.DB as unknown as Db;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const result = await signInWithPassword(db, email, password);

  /* One message for wrong-password and unknown-account alike, so the form
     cannot be used to discover whether someone has an account here. */
  if (!result.ok) return { error: "That email and password do not match." };

  throw redirect(homeFor(result.caller.role), {
    headers: { "Set-Cookie": setSessionCookie(result.token, !isDevRequest(request)) },
  });
}

/* Development only: there is no self-registration, so show which accounts
   exist. Filtered by role so each door lists only its own. */
export async function devAccounts(request: Request, env: CloudflareEnv, role: string) {
  if (!isDevRequest(request)) return null;
  const db = env.DB as unknown as Db;
  const { results } = await db
    .prepare(`SELECT email, full_name FROM profiles WHERE role = ? ORDER BY email`)
    .bind(role)
    .all<{ email: string; full_name: string }>();
  return results.map((r) => ({ email: r.email, who: r.full_name }));
}
