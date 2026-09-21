import { Link, redirect, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context";
import type { Db } from "~/lib/db.server";
import { getSignedIn, homeFor } from "~/lib/session.server";
import { handleSignIn, devAccounts, type SignInResult } from "~/lib/signin.server";
import { SignInForm } from "~/lib/signin-form";
import { pageMeta } from "~/lib/meta";

export async function loader({
  request, context,
}: { request: Request; context: RouterContextProvider }) {
  const { env } = context.get(cloudflareContext);
  const me = await getSignedIn(env.DB as unknown as Db, request);
  if (me) throw redirect(homeFor(me.role));
  return { accounts: await devAccounts(request, env, "parent") };
}

export const meta = () =>
  pageMeta({
    title: "Foster Parent Sign In — Foster Parent Navigator",
    description:
      "Sign in as a licensed Michigan foster parent to ask licensing questions and get the rule behind the answer.",
    path: "/signin",
    robots: "noindex",
  });

export async function action({
  request, context,
}: { request: Request; context: RouterContextProvider }) {
  return handleSignIn(request, context.get(cloudflareContext).env);
}

export default function SignIn({
  loaderData, actionData,
}: {
  loaderData: { accounts: { email: string; who: string }[] | null };
  actionData?: SignInResult;
}) {
  return (
    <SignInForm
      title="Foster Parent Sign In"
      subtitle="Clear guidance for Michigan foster parents."
      note="Your questions are private. Your licensing specialist sees only what you explicitly send them for review."
      accounts={loaderData.accounts}
      error={actionData?.error}
      footer={
        <Link to="/portal/signin" className="font-semibold text-brand hover:underline">
          Licensing specialist? Sign in here
        </Link>
      }
    />
  );
}
