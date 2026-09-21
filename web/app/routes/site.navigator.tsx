import { Link } from "react-router";
import { SiteNav, SiteFooter, BackHome } from "~/site/chrome";
import { CORPUS_FACTS } from "~/lib/config";
import { pageMeta } from "~/lib/meta";
import { DEMO_SPECIALIST } from "~/lib/demo";

export const meta = () =>
  pageMeta({
    title: "Product walkthrough — Foster Parent Navigator",
    description:
      "A screen-by-screen walkthrough of how Foster Parent Navigator answers a licensing question, cites the rule, and routes ambiguity to a specialist.",
    path: "/navigator",
  });

export function loader() {
  return { facts: CORPUS_FACTS };
}

function Card({ step, label, children }: { step: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.13em] text-slate-500">{step} · {label}</div>
      <div className="mt-4 rounded-3xl border border-line bg-page p-6">{children}</div>
    </div>
  );
}

export default function NavigatorPage({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  const { facts } = loaderData;
  return (
    <div className="min-h-dvh bg-white">
      <SiteNav current="walkthrough" />

      <section className="bg-gradient-to-b from-[#f3f8fc] to-[#e4eef6] px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-6xl">
          <BackHome />
          <span className="mt-5 inline-block rounded-full bg-field px-4 py-1.5 text-[11px] font-bold tracking-[0.12em] text-muted ring-1 ring-line">
            STATIC WALKTHROUGH
          </span>
          <h1 className="mt-4 text-[40px] font-extrabold leading-none tracking-tight text-ink sm:text-[52px]">
            Product walkthrough
          </h1>
          <p className="mt-4 max-w-3xl text-[19px] leading-relaxed text-slate-600">
            The screens below are annotated images of the product, not a working copy. They show how a licensing
            question becomes an answer, a citation, or a request for a human.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/demo" className="rounded-full bg-flag px-7 py-3.5 text-base font-bold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Try the interactive demo
            </Link>
            <span className="text-[14.5px] text-slate-600">No account needed.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-7 lg:grid-cols-3">
          <Card step="01" label="ASK">
            <h3 className="text-[24px] font-extrabold leading-tight text-ink">Ask a licensing question</h3>
            <p className="mt-2 text-[14.5px] text-slate-500">We will answer from Michigan&rsquo;s foster home rules.</p>
            <div className="mt-5 text-[10.5px] font-bold tracking-[0.1em] text-muted">YOUR QUESTION</div>
            <p className="mt-2 min-h-[104px] rounded-xl border border-dashed border-line bg-white/70 p-4 text-[15px] italic text-slate-600">
              &ldquo;Can my foster child stay overnight at a friend&rsquo;s house?&rdquo;
            </p>
            <p className="mt-4 rounded-xl bg-brand/25 py-3.5 text-center text-[15px] font-bold text-brand-dark ring-1 ring-brand/30">
              Get answer
            </p>
            <p className="mt-4 rounded-lg bg-[#eaf1f7] px-4 py-3 text-[13px] leading-snug text-slate-500">
              Do not enter a child&rsquo;s name, case number, or private health information.
            </p>
            <p className="mt-4 text-center text-xs text-slate-500">{facts.phrase} · effective {facts.effectiveDateLabel}</p>
          </Card>

          <Card step="02" label="ANSWER">
            <span className="inline-block rounded-full bg-flag-soft px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] text-flag">ALLOWED WITH CONDITIONS</span>
            <div className="mt-3 text-[30px] font-extrabold leading-none text-brand">Yes, with conditions.</div>
            <div className="mt-2.5 text-[16px] font-bold leading-snug text-ink">
              Nothing prohibits an overnight stay, but three requirements apply.
            </div>
            <div className="mt-4 rounded-xl bg-flag-soft p-4">
              <div className="text-[10.5px] font-bold tracking-[0.1em] text-ink">AS LONG AS</div>
              <ul className="mt-3 space-y-2.5">
                {[
                  ["The adult caring for her has background checks", "R 400.9413(2)"],
                  ["Supervision fits her age and functioning", "R 400.9413(1)"],
                  ["You tell the agency past 3 days", "R 400.9413(3)"],
                ].map(([t, r], i) => (
                  <li key={r} className="flex gap-2.5">
                    <span aria-hidden className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-flag text-[10px] font-bold text-white">{i + 1}</span>
                    <div>
                      <p className="text-[13.5px] leading-snug text-ink">{t}</p>
                      <p className="text-[11px] text-slate-500">{r}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-xl bg-white p-4">
              <div className="text-[13.5px] font-bold text-ink">R 400.9413(2)</div>
              <p className="mt-1.5 text-[13px] italic leading-snug text-ink">
                &ldquo;A foster parent shall identify at least 1 adult who would care for the foster child for an
                extended overnight period.&rdquo;
              </p>
            </div>
          </Card>

          <Card step="03" label="ESCALATE">
            <div className="grid size-11 place-items-center rounded-xl bg-flag-soft">
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="#e07b39" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5v.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-[23px] font-extrabold leading-tight text-ink">Specialist review needed</h3>
            <p className="mt-2 text-[14.5px] leading-snug text-slate-500">
              A different question. The licensing rules do not address body piercing, so there is no rule text
              to answer from.
            </p>
            <div className="mt-4 rounded-xl bg-white p-4">
              <div className="text-[10.5px] font-bold tracking-[0.1em] text-ink">WHAT WILL BE SHARED</div>
              <p className="mt-2 text-[13px] leading-snug text-slate-500">
                Exactly this text, plus your name, goes to your licensing specialist. Edit it before sending if you want to.
              </p>
              <p className="mt-2.5 rounded-lg bg-page p-3 text-[13.5px] italic text-slate-600">
                &ldquo;My foster daughter wants her ears pierced. Can I take her?&rdquo;
              </p>
              <p className="mt-2.5 text-[12px] leading-snug text-slate-500">
                Nothing else from your account is shared. Your other questions are not visible to your specialist.
              </p>
            </div>
            <p className="mt-4 rounded-xl bg-flag/25 py-3.5 text-center text-[15px] font-bold text-flag ring-1 ring-flag/40">
              Send to specialist
            </p>
          </Card>
        </div>
      </section>

      {/* specialist side */}
      <section className="bg-ink px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-sky-300">THE OTHER SIDE</p>
            <h2 className="mt-4 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-[38px]">
              A specialist sees the question &mdash; and nothing else.
            </h2>
            <p className="mt-6 max-w-xl text-[17.5px] leading-relaxed text-sky-100">
              Licensing specialists hold real authority over the families they serve. If a foster parent believes
              their whole question history is visible, they will only ask safe questions &mdash; and the tool
              becomes useless to the person who needs it most.
            </p>
            <p className="mt-4 max-w-xl text-[17.5px] leading-relaxed text-sky-100">
              So the boundary is built into the system, not written into a policy. A specialist can reach exactly
              the questions sent to them, and no others.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6">
            <div className="text-[10.5px] font-bold tracking-[0.13em] text-slate-500">WHAT THE PARENT SEES AFTER SENDING</div>
            <div className="mt-4 rounded-2xl bg-page p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-flag-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-flag">SENT FOR REVIEW</span>
                <span className="text-[12px] text-slate-500">reference FPN-4820</span>
              </div>
              <p className="mt-3 text-[16px] font-bold leading-snug text-ink">
                Your licensing specialist {DEMO_SPECIALIST} has received your question.
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                You can expect a response within 24&ndash;48 hours. The answer arrives by email.
              </p>
            </div>
            <dl className="mt-4 space-y-3 text-[13.5px]">
              <div className="rounded-lg bg-[#eaf1f7] px-4 py-3">
                <dt className="font-bold text-ink">Sent</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">
                  The question text, exactly as written, and the parent&rsquo;s name.
                </dd>
              </div>
              <div className="rounded-lg bg-[#eaf1f7] px-4 py-3">
                <dt className="font-bold text-ink">Never sent</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">
                  Every other question the family has asked. There is no view of a question history for a
                  specialist to open.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* limits — reframed per Erica */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-[30px] font-extrabold tracking-tight text-ink sm:text-[34px]">Where a human still decides</h2>
        <p className="mt-3 max-w-3xl text-[17.5px] leading-relaxed text-slate-600">
          This is an MVP, and some of what follows will never be automated &mdash; by design. Being clear about the
          edges is part of being trustworthy about the middle.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Some questions are genuinely ambiguous", "A family's circumstances often sit between the rules rather than inside one. Those scenarios call for professional judgment, and Navigator routes them to a licensing specialist rather than forcing an answer."],
            ["Not yet graded by a panel of specialists", "Answers are verified against the rule text, and a licensing specialist has reviewed the product in development. A broader panel of specialists has not yet graded a full question set — that is the next milestone."],
            ["Michigan only", "Every state writes its own licensing rules. The approach ports; the corpus does not. Michigan is the proof."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-page p-6">
              <div className="text-[16.5px] font-bold leading-snug text-ink">{title}</div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-8">
          <p className="text-[17px] text-slate-600">Now try it yourself, with no account.</p>
          <Link to="/demo" className="rounded-full bg-flag px-8 py-3.5 text-base font-bold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            Try the demo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
