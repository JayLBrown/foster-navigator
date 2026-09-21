import { Link } from "react-router";
import { SiteNav, SiteFooter, Skyline, Pillar } from "~/site/chrome";
import { CORPUS_FACTS, IMPACT_PILLAR, FOUNDER_CONNECTION, VERIFIED_STATS } from "~/lib/config";
import { RULES } from "~/lib/corpus";
import { byId } from "~/lib/demo";
import { pageMeta } from "~/lib/meta";

export const meta = () =>
  pageMeta({
    title: "Foster Parent Navigator — clear answers from Michigan's foster home rules",
    description:
      "Michigan foster parents follow 43 licensing rules. Navigator answers the question in plain language and shows the exact rule behind the answer.",
    path: "/",
  });

/* The hero card shows a real verified answer rather than a retyped one: it reads
   the same sample the demo serves, whose quotation demo.test.mjs matches against
   the loaded corpus. If the corpus changes under it, that test fails first. */
function heroAnswer() {
  const q = byId("heater");
  const cit = q?.answer.citations[0];
  if (!q || !cit) return null;
  return {
    question: q.prompt.replace(/'/g, "\u2019"),
    headline: q.answer.headline,
    statement: q.answer.statement,
    rule: cit.rule_number,
    quote: cit.verbatim_quote,
    heading: RULES.find((r) => r.rule_number === cit.rule_number)?.heading ?? "",
  };
}

export function loader() {
  return {
    facts: CORPUS_FACTS,
    pillar: IMPACT_PILLAR,
    founder: FOUNDER_CONNECTION,
    stats: VERIFIED_STATS,
    hero: heroAnswer(),
  };
}

export default function Home({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
  const { facts, pillar, founder, stats, hero } = loaderData;
  return (
    <div className="min-h-dvh bg-white">
      <SiteNav current="home" />

      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f3f8fc] via-[#dfeaf4] to-[#cfe0ee]">
        <Skyline className="absolute inset-x-0 bottom-0 h-40 w-full sm:h-56" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1fr_400px] lg:py-24">
          <div>
            <p className="font-script text-3xl text-brand -rotate-2">Detroit families, stronger together.</p>
            <h1 className="mt-2 text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              A foster parent shouldn&rsquo;t need a lawyer to read the rules.
            </h1>
            <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-slate-600">
              Michigan foster homes are governed by <strong className="text-ink">43 licensing rules</strong>.
              Get one wrong and a family can lose their license &mdash; and a child can lose their home.
              Navigator answers the question in plain language, then shows the exact rule behind the answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="rounded-full bg-flag px-8 py-4 text-base font-bold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Try the demo
              </Link>
              <Link
                to="/navigator"
                className="rounded-full border border-[#b9cfe2] bg-white px-8 py-4 text-base font-bold text-ink hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Product walkthrough
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">No sign-in needed to try the demo · Built in Detroit</p>
          </div>

          {hero && (
            <div className="rounded-3xl bg-white p-6 shadow-[0_18px_44px_rgba(13,59,94,.14)]">
              <div className="text-[10.5px] font-bold tracking-[0.13em] text-slate-500">A REAL ANSWER FROM THE LIVE APP</div>
              <div className="mt-4 rounded-xl bg-field px-4 py-3 text-[15px] text-ink">
                {hero.question}
              </div>
              <span className="mt-4 inline-block rounded-full bg-mint px-3 py-1.5 text-[10.5px] font-bold tracking-[0.12em] text-mint-ink">
                EXACT RULE MATCH
              </span>
              <div className="mt-3 text-[34px] font-extrabold leading-none text-brand">{hero.headline}</div>
              <div className="mt-2 text-[17px] font-bold leading-snug text-ink">
                {hero.statement}
              </div>
              <div className="mt-4 rounded-xl bg-field p-4">
                <div className="text-[14px] font-bold text-ink">{hero.rule}</div>
                <blockquote className="mt-2 text-[14.5px] leading-relaxed text-ink">&ldquo;{hero.quote}&rdquo;</blockquote>
                <dl className="mt-3 space-y-1 text-[11.5px] text-slate-500">
                  <div><dt className="inline font-semibold">Section: </dt><dd className="inline">{hero.heading}</dd></div>
                  <div><dt className="inline font-semibold">Effective: </dt><dd className="inline">{facts.effectiveDateLabel}</dd></div>
                  <div><dt className="inline font-semibold">Verified: </dt><dd className="inline">quotation matched against {facts.sourceName}</dd></div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* pillars */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <Pillar tone="mint" label="INFORM" title="The rule, word for word">
            Every answer quotes the actual regulation, with its number and effective date. A parent can take it straight to their worker.
          </Pillar>
          <Pillar tone="sky" label="CONNECT" title="Some questions need a human">
            When the rules don&rsquo;t settle it, the question goes to the parent&rsquo;s own licensing
            specialist &mdash; exactly the text they chose to send, and nothing else from their account.
            Enforced in the system, not promised in a policy.
          </Pillar>
          <Pillar tone="flag" label="ESCALATE" status="DEVELOPMENT" title="Urgency Detection">
            Automatic routing to Centralized Intake and emergency services when a question signals risk
            rather than a licensing rule.
          </Pillar>
        </div>
      </section>

      {/* problem */}
      <section id="problem" className="bg-ink px-6 py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-sky-300">THE PROBLEM</p>
            <h2 className="mt-4 text-[34px] font-extrabold leading-tight tracking-tight text-white sm:text-[42px]">
              The rules are public. Getting an answer is not.
            </h2>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-sky-100">
              The rules governing a Michigan foster home run to 43 sections of administrative code, substantially
              rewritten in 2023. A foster parent with a question at 9pm has one realistic option: call a licensing
              specialist already carrying dozens of families.
            </p>
            <p className="mt-4 max-w-xl text-[18px] leading-relaxed text-sky-100">
              So most questions never get asked &mdash; and a parent guesses.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-2xl bg-[#17486e] px-7 py-6">
                <div className="text-[32px] font-extrabold text-white">{st.value}</div>
                <div className="mt-1 text-[15.5px] text-sky-200">{st.label}</div>
                <div className="mt-2 text-[12px] text-sky-300">{st.source}</div>
              </div>
            ))}
            <div className="rounded-2xl bg-flag px-7 py-6">
              <div className="text-[32px] font-extrabold text-white">{facts.ruleCount} rules</div>
              <div className="mt-1 text-[15.5px] text-orange-50">every licensed home is held to</div>
            </div>
            <div className="rounded-2xl bg-[#17486e] px-7 py-6">
              <div className="text-[32px] font-extrabold text-white">{facts.sectionCount}</div>
              <div className="mt-1 text-[15.5px] text-sky-200">individually citable sections within them</div>
            </div>
          </div>
        </div>
      </section>

      {/* the gate */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-flag">WHAT MAKES IT DIFFERENT</p>
            <h2 className="mt-4 text-[34px] font-extrabold leading-tight tracking-tight text-ink sm:text-[42px]">
              It can&rsquo;t show you an answer it can&rsquo;t prove.
            </h2>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-slate-600">
              A chatbot that is confidently wrong about the law is worse than no tool at all. Before any answer
              reaches a foster parent, every quoted passage is checked character-for-character against the actual
              regulation.
            </p>
            <p className="mt-4 max-w-xl text-[18px] leading-relaxed text-slate-600">
              If it doesn&rsquo;t match, the answer is never shown. It becomes a request for a human specialist instead.
            </p>
            <div className="mt-7 rounded-xl border-l-[3px] border-flag bg-flag-soft px-6 py-5">
              <p className="text-base leading-relaxed text-ink">
                <strong>We found this in the wild.</strong> The rule on portable heaters changed in 2023 &mdash; and a
                widely circulated MDHHS handbook still carried the old wording. The system rejects the superseded text.
              </p>
            </div>
          </div>
          <ol className="flex flex-col justify-center gap-3">
            {[
              ["1", "Parent asks in plain language", "bg-field"],
              ["2", "Matched against the current rules only", "bg-field"],
              ["3", "Every quote verified against the real rule text", "bg-flag-soft ring-1 ring-flag/30 font-bold"],
              ["4", "Verified → shown. Not verified → sent to a specialist.", "bg-mint"],
            ].map(([n, text, cls]) => (
              <li key={n} className={`flex items-center gap-4 rounded-xl px-5 py-4 ${cls}`}>
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${n === "3" ? "bg-flag" : n === "4" ? "bg-mint-ink" : "bg-ink"}`}>{n}</span>
                <span className="text-[15.5px] text-ink">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* built */}
      <section className="bg-page px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-[30px] font-extrabold tracking-tight text-ink sm:text-[34px]">Working today, not a mockup</h2>
          <p className="mt-3 max-w-3xl text-[17.5px] leading-relaxed text-slate-600">
            The complete current rule set is loaded and verified line by line against the official state filing.
            The demo runs the same verification gate against the same corpus as the product itself.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [String(facts.ruleCount), "licensing rules loaded, all of them"],
              [String(facts.sectionCount), "individually citable sections within those rules"],
              ["2023", "current amendment, not a superseded handbook"],
              ["0", "unverified quotations shown: every one is matched first"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-2xl border border-line bg-white p-6">
                <div className="text-[38px] font-extrabold text-brand">{n}</div>
                <div className="mt-2 text-[15px] leading-snug text-slate-600">{label}</div>
              </div>
            ))}
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-2 rounded-2xl border border-line bg-white p-6 text-[14px] sm:grid-cols-2">
            <div className="flex gap-2"><dt className="font-semibold text-ink">Source</dt><dd className="text-slate-600">{facts.sourceName}</dd></div>
            <div className="flex gap-2"><dt className="font-semibold text-ink">Regulation effective</dt><dd className="text-slate-600">{facts.effectiveDateLabel}</dd></div>
            <div className="flex gap-2"><dt className="font-semibold text-ink">Source last checked</dt><dd className="text-slate-600">{facts.lastCheckedLabel}, by hand</dd></div>
            <div className="flex gap-2"><dt className="font-semibold text-ink">Verification</dt><dd className="text-slate-600">every quotation matched to the loaded text before display</dd></div>
          </dl>
          <p className="mt-4 max-w-3xl text-[14.5px] leading-relaxed text-slate-600">
            2023 is the date of the most recent amendment, not the date the corpus was built. The application
            does not re-check the state source automatically, so that date reflects a manual review.
          </p>
        </div>
      </section>

      {/* impact + market */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-brand">MARKET AND OPPORTUNITY</p>
            <h2 className="mt-4 text-[30px] font-extrabold tracking-tight text-ink sm:text-[34px]">Who this serves, and how it spreads</h2>
            <dl className="mt-6 space-y-5">
              {[
                ["Users", "Licensed foster parents, and the licensing specialists who support them."],
                ["Initial market", "Detroit and Wayne County first, then Michigan statewide."],
                ["Adoption path", "A pilot with a single child placing agency, then wider deployment through the agencies that license foster homes."],
                ["Expansion", "Licensing rules are written state by state. The verified-answer method ports to another state; the corpus has to be rebuilt for each."],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="text-[15px] font-bold text-ink">{term}</dt>
                  <dd className="mt-1 text-[15.5px] leading-relaxed text-slate-600">{def}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 rounded-xl border-l-[3px] border-brand bg-field px-5 py-4 text-[14.5px] leading-relaxed text-ink">
              <strong>Stated as a hypothesis, not a result.</strong> Who pays, how much, and which agencies
              adopt it are unvalidated. No pilot has been run and no agency has committed.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-flag">EXPECTED IMPACT</p>
            <h2 className="mt-4 text-[30px] font-extrabold tracking-tight text-ink sm:text-[34px]">What we will measure</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-600">
              None of these have been measured yet. They are the pilot targets we would hold ourselves to.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Time for a foster parent to get a sourced answer",
                "Licensing-specialist hours returned to casework",
                "Share of questions resolved without escalation",
                "Foster-parent confidence in licensing decisions",
                "Foster-parent retention past the first year",
                "Placement stability",
              ].map((m) => (
                <li key={m} className="flex items-start gap-3 rounded-xl bg-page px-4 py-3">
                  <span className="mt-0.5 rounded bg-flag-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-flag">PILOT TARGET</span>
                  <span className="text-[15px] leading-snug text-ink">{m}</span>
                </li>
              ))}
            </ul>
            {pillar && (
              <div className="mt-6 rounded-2xl bg-mint/40 p-5 ring-1 ring-mint">
                <h3 className="text-[11px] font-bold tracking-wider text-mint-ink">VENTURE 313 IMPACT PILLAR</h3>
                <p className="mt-2 text-[16px] font-bold text-ink">{pillar.name}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{pillar.fit}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* detroit */}
      <section id="about" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="font-script text-3xl text-brand -rotate-1">Built here, for here.</p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-ink sm:text-[36px]">Why Detroit first</h2>
            <p className="mt-5 max-w-xl text-[17.5px] leading-relaxed text-slate-600">
              Wayne County carries one of the largest foster care populations in Michigan. The families doing this
              work are disproportionately Black, disproportionately relatives taking in their own kin, and
              disproportionately navigating a licensing system that was not designed with them in mind.
            </p>
            {founder && <p className="mt-4 max-w-xl text-[17.5px] leading-relaxed text-slate-600">{founder}</p>}
          </div>
          <div className="rounded-2xl bg-page p-8">
            <div className="text-[11px] font-bold tracking-[0.14em] text-slate-500">WHAT&rsquo;S NEXT</div>
            <ul className="mt-4 space-y-3 text-base leading-snug text-ink">
              <li>— Pilot with a Detroit child placing agency</li>
              <li>— Add MDHHS policy guidance alongside the rules</li>
              <li>— Answers graded by a panel of licensing specialists</li>
              <li>— Alerts when a rule a family relied on changes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="bg-ink px-6 pt-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[30px] font-extrabold tracking-tight text-white">Try it with a real licensing question.</h2>
            <p className="mt-2 text-[17px] text-sky-200">No account needed. Ask anything a Michigan foster parent would ask.</p>
          </div>
          <div className="flex flex-col gap-3 sm:ml-auto sm:shrink-0">
            <Link to="/demo" className="rounded-full bg-flag px-10 py-4 text-center text-[17px] font-bold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Try the demo
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
