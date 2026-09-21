import { redirect, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context";
import type { Db } from "~/lib/db.server";
import { destroySession, readSessionCookie, clearSessionCookie } from "~/lib/auth.server";
import { getSignedIn } from "~/lib/session.server";

export async function action({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}) {
  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await getSignedIn(db, request);
  await destroySession(db, readSessionCookie(request));
  const url = new URL(request.url);
  const isDev = url.protocol === "http:" || ["localhost", "127.0.0.1"].includes(url.hostname);
  const door = me?.role === "specialist" ? "/portal/signin" : "/signin";
  throw redirect(door, { headers: { "Set-Cookie": clearSessionCookie(!isDev) } });
}

export const loader = () => redirect("/signin");
