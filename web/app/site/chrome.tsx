import { Link } from "react-router";

/* Public marketing chrome, shared by every public page so navigation behaves
   the same everywhere. The logo is always a link home. */

export const TAGLINE = "GUIDANCE TODAY. BRIGHTER TOMORROWS.";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-md";

export function Mark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${dark ? "bg-white" : "bg-ink"}`}>
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none"
          stroke={dark ? "#0d3b5e" : "#ffffff"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2.2 5.1-5.1 2.2 2.2-5.1z" />
        </svg>
      </span>
      <span className="leading-[1.12]">
        <span className={`block text-sm font-bold ${dark ? "text-white" : "text-ink"}`}>Foster Parent</span>
        <span className={`block text-sm font-semibold ${dark ? "text-sky-200" : "text-brand"}`}>Navigator</span>
      </span>
    </span>
  );
}

/* The logo, always linking home. Used on marketing pages, sign-in and errors. */
export function HomeMark({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" aria-label="Foster Parent Navigator — home" className={`inline-block ${focus}`}>
      <Mark dark={dark} />
    </Link>
  );
}

/* A visible route home for every page that is not the homepage. */
export function BackHome({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline ${focus} ${className}`}
    >
      <span aria-hidden>&larr;</span> Back to home
    </Link>
  );
}

type Current = "home" | "walkthrough" | "none";

const NAV = [
  { to: "/", label: "Home", key: "home" },
  { to: "/navigator", label: "Product walkthrough", key: "walkthrough" },
  { to: "/#problem", label: "The problem", key: "none" },
] as const;

export function SiteNav({ current }: { current: Current }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
        <HomeMark />

        {/* Desktop navigation */}
        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 text-[15px] font-semibold lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={current === item.key ? "page" : undefined}
              className={`${focus} ${current === item.key ? "border-b-2 border-flag pb-1 text-ink" : "text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/demo"
          className={`ml-auto shrink-0 rounded-full bg-flag px-5 py-3 text-[15px] font-bold text-white hover:brightness-95 lg:ml-6 ${focus}`}
        >
          Try the demo
        </Link>
      </div>

      {/* Compact navigation. A details/summary disclosure works with keyboard
          and without JavaScript, so nothing essential is hidden on small screens. */}
      <details className="border-t border-line lg:hidden">
        <summary className={`mx-auto flex w-full max-w-6xl cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold text-ink sm:px-6 ${focus}`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
          Menu
        </summary>
        <nav aria-label="Main, compact" className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
          <ul className="flex flex-col gap-1 text-[15px] font-semibold">
            {[...NAV, { to: "/demo", label: "Try the demo", key: "none" as const }].map((item) => (
              <li key={item.to + item.label}>
                <Link to={item.to} className={`block rounded-lg px-3 py-3 text-ink hover:bg-field ${focus}`}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl border-t border-white/15 pt-6">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold text-sky-200">
          <Link to="/" className={`hover:text-white ${focus}`}>Home</Link>
          <Link to="/navigator" className={`hover:text-white ${focus}`}>Product walkthrough</Link>
          <Link to="/demo" className={`hover:text-white ${focus}`}>Try the demo</Link>
        </nav>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-[13.5px] text-sky-200">© 2026 Foster Parent Navigator · Detroit, Michigan</p>
          <p className="text-[12px] font-bold tracking-[0.14em] text-flag sm:ml-auto">{TAGLINE}</p>
        </div>
      </div>
    </footer>
  );
}

export function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 230" className={className} preserveAspectRatio="none" aria-hidden="true">
      <g fill="#0d3b5e" opacity="0.13">
        <rect x="60" y="120" width="54" height="110" /><rect x="126" y="86" width="40" height="144" />
        <rect x="180" y="140" width="66" height="90" /><rect x="262" y="104" width="46" height="126" />
        <rect x="322" y="150" width="58" height="80" /><rect x="398" y="72" width="34" height="158" />
        <rect x="446" y="126" width="62" height="104" /><rect x="524" y="96" width="42" height="134" />
        <rect x="806" y="110" width="48" height="120" /><rect x="866" y="40" width="58" height="190" />
        <rect x="936" y="14" width="72" height="216" /><rect x="1020" y="44" width="56" height="186" />
        <rect x="1088" y="96" width="46" height="134" /><rect x="1146" y="130" width="64" height="100" />
        <rect x="1224" y="80" width="38" height="150" /><rect x="1274" y="136" width="70" height="94" />
        <circle cx="895" cy="34" r="14" /><circle cx="972" cy="8" r="17" /><circle cx="1048" cy="38" r="14" />
      </g>
    </svg>
  );
}

/* `status` marks a pillar as not yet shipped. Muted, but it must stay legible
   — a roadmap item presented as a capability is the one thing an agency will
   not forgive. */
export function Pillar({
  tone, label, status, title, children,
}: {
  tone: "mint" | "sky" | "flag";
  label: string;
  status?: string;
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    mint: { bg: "bg-mint", stroke: "#12513c", text: "text-mint-ink" },
    sky: { bg: "bg-sky-100", stroke: "#15597f", text: "text-brand-dark" },
    flag: { bg: "bg-flag-soft", stroke: "#9c4d13", text: "text-flag" },
  }[tone];
  const icon = {
    mint: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
    sky: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    flag: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5v.5" /></>,
  }[tone];
  return (
    <div className="flex gap-4">
      <span className={`grid size-14 shrink-0 place-items-center rounded-full ${tones.bg}`}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke={tones.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-[13px] font-bold tracking-[0.12em] ${tones.text}`}>{label}</h3>
          {status && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-slate-500 ring-1 ring-slate-300">
              {status}
            </span>
          )}
        </div>
        <p className="mt-2 text-[19px] font-bold leading-snug text-ink">{title}</p>
        <p className="mt-2 text-[15.5px] leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  );
}
