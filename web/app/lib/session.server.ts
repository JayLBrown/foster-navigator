/* Route-level guards. Every route asks here for its caller; none assume one. */
import { redirect } from "react-router";
import { callerFromToken, readSessionCookie, type SignedIn } from "./auth.server";
import type { Db } from "./db.server";

export async function getSignedIn(db: Db, request: Request): Promise<SignedIn | null> {
  return callerFromToken(db, readSessionCookie(request));
}

/* Sends a signed-in user to their own side of the app rather than showing a
   403 — a specialist landing on /ask is lost, not malicious. */
export const homeFor = (role: SignedIn["role"]) => (role === "specialist" ? "/portal" : "/ask");

export async function requireParent(db: Db, request: Request) {
  const me = await getSignedIn(db, request);
  if (!me) throw redirect("/signin");
  if (me.role !== "parent") throw redirect(homeFor(me.role));
  const row = await db
    .prepare(
      `SELECT s.full_name AS specialist_name
         FROM parent_profiles pp JOIN profiles s ON s.user_id = pp.specialist_user_id
        WHERE pp.user_id = ?`
    )
    .bind(me.userId)
    .first<{ specialist_name: string }>();
  return { ...me, specialistName: row?.specialist_name ?? "your licensing specialist" };
}

export async function requireSpecialist(db: Db, request: Request) {
  const me = await getSignedIn(db, request);
  if (!me) throw redirect("/portal/signin");
  if (me.role !== "specialist") throw redirect(homeFor(me.role));
  const row = await db
    .prepare(`SELECT agency_name FROM specialists WHERE user_id = ?`)
    .bind(me.userId)
    .first<{ agency_name: string }>();
  return { ...me, agencyName: row?.agency_name ?? "" };
}
