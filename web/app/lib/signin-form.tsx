import { Form, Link, useNavigation } from "react-router";
import { Shell, btnPrimary, field } from "./ui";
import { BackHome } from "~/site/chrome";

/* One form, two doors. Every input has a stable id so its <label> is a real
   label — a screen reader and a click on the word both reach the field. */
export function SignInForm({
  title,
  subtitle,
  note,
  accounts,
  error,
  footer,
}: {
  title: string;
  subtitle: string;
  note: string;
  accounts: { email: string; who: string }[] | null;
  error?: string;
  footer?: React.ReactNode;
}) {
  const nav = useNavigation();
  const busy = nav.state === "submitting";

  return (
    <Shell>
      <BackHome className="mb-5" />

      <h1 className="text-3xl font-extrabold leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">{subtitle}</p>

      <Form method="post" replace>
        <label
          htmlFor="signin-email"
          className="mt-6 block text-[11px] font-bold tracking-wider text-ink"
        >
          EMAIL
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@example.com"
          className={`${field} mt-2`}
        />

        <label
          htmlFor="signin-password"
          className="mt-4 block text-[11px] font-bold tracking-wider text-ink"
        >
          PASSWORD
        </label>
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={`${field} mt-2`}
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-flag-soft px-4 py-3 text-[13px] text-flag"
          >
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className={`${btnPrimary} mt-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60`}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-5 rounded-xl bg-field px-4 py-3 text-[13px] leading-snug text-muted">
          {note}
        </p>

        {accounts && accounts.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-3">
            <div className="text-[11px] font-bold tracking-wider text-muted">
              DEVELOPMENT ACCOUNTS
            </div>
            <ul className="mt-2 space-y-1">
              {accounts.map((a) => (
                <li key={a.email} className="flex justify-between gap-3 text-[12px]">
                  <span className="font-mono text-ink">{a.email}</span>
                  <span className="text-muted">{a.who}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {footer && <div className="mt-5 text-center text-[13px]">{footer}</div>}
      </Form>

      {/* No account? There is still something to look at. */}
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="text-[13px] text-muted">
          Don&rsquo;t have an account?{" "}
          <Link
            to="/demo"
            className="font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Try the demo
          </Link>{" "}
          — no sign-in required.
        </p>
      </div>
    </Shell>
  );
}
