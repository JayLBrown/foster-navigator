import { TAGLINE } from "~/site/chrome";

/* Pure, client-safe. Must NOT live in a *.server module: React Router
   refuses to bundle server code into the browser, and importing one from a
   component fails the build even when the function itself is harmless. */
export const initialsOf = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const btn = "w-full rounded-2xl px-5 py-4 text-center text-[15px] font-semibold transition";
export const btnPrimary = `${btn} bg-brand text-white hover:bg-brand-dark`;
export const btnGhost = `${btn} bg-white text-ink ring-1 ring-line hover:bg-field`;
export const btnFlag = `${btn} bg-flag text-white hover:brightness-95`;
export const field =
  "w-full rounded-2xl bg-field px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted/70 focus:ring-2 focus:ring-brand";

export function Shell({
  children,
  user,
  wide = false,
}: {
  children: React.ReactNode;
  user?: { fullName: string } | null;
  wide?: boolean;
}) {
  return (
    <main className="min-h-dvh bg-page px-4 py-6 sm:py-10">
      <div className={`mx-auto w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-line`}>
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-ink">
            <span className="text-lg font-bold text-white">✦</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-ink">Foster Parent</div>
            <div className="text-sm font-semibold text-brand">Navigator</div>
          </div>
          {user && (
            <span
              title={user.fullName}
              className="ml-auto grid size-8 place-items-center rounded-full bg-mint text-xs font-bold text-mint-ink"
            >
              {initialsOf(user.fullName)}
            </span>
          )}
        </header>
        <div className="px-5 py-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-[11px] font-semibold tracking-widest text-muted">
        {TAGLINE}
      </p>
    </main>
  );
}
