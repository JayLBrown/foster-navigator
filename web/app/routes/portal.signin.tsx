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
  return { accounts: await devAccounts(request, env, "specialist") };
}

export const meta = () =>
  pageMeta({
    title: "Licensing Specialist Sign In — Foster Parent Navigator",
    description:
      "Sign in as a licensing specialist to review the questions foster parents on your caseload have sent you.",
    path: "/portal/signin",
    robots: "noindex",
  });

export async function action({
  request, context,
}: { request: Request; context: RouterContextProvider }) {
  return handleSignIn(request, context.get(cloudflareContext).env);
}

export default function PortalSignIn({
  loaderData, actionData,
}: {
  loaderData: { accounts: { email: string; who: string }[] | null };
  actionData?: SignInResult;
}) {
  return (
    <SignInForm
      title="Licensing Specialist Sign In"
      subtitle="Review questions sent to you by the families on your caseload."
      note="You see only the questions a foster parent explicitly sends you for review. Their other questions are not visible here."
      accounts={loaderData.accounts}
      error={actionData?.error}
      footer={
        <Link to="/signin" className="font-semibold text-brand hover:underline">
          Foster parent? Sign in here
        </Link>
      }
    />
  );
}
