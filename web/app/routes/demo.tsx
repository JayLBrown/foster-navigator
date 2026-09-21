import { Form, Link, useNavigation, redirect, type RouterContextProvider } from "react-router";
import { RULES } from "~/lib/corpus";
import { answerQuestion } from "~/lib/answer.server";
import { cloudflareContext } from "~/lib/context";
import type { Answer } from "~/lib/gate";
import {
  DEMO_QUESTIONS, byId, readDemo, writeDemo, clearDemo, demoRef, triage, LIVE_BUDGET,
  DEMO_NOTICE, DEMO_SPECIALIST, EMPTY_HINT, NOT_A_QUESTION_HINT,
  INSUFFICIENT_REASON, UNVERIFIED_REASON, BUDGET_REASON,
  type DemoState, type Triage,
} from "~/lib/demo";
import { CORPUS_FACTS } from "~/lib/config";
import { pageMeta } from "~/lib/meta";

export const meta = () =>
  pageMeta({
    title: "Try the demo — Foster Parent Navigator",
    description:
      "A credential-free demo of Foster Parent Navigator. Ask any Michigan foster licensing question; sample information only, and nothing is saved or sent to a real licensing specialist.",
    path: "/demo",
    robots: "noindex",
  });

type Sample = { id: string; chip: string; prompt: string };

type Screen =
  | { kind: "ask"; hint?: string }
  | { kind: "answer"; answer: Answer }
  | { kind: "escalating"; question: string; reason: string }
  /* live answers for this browser are spent; the samples still work */
  | { kind: "budget" }
  | { kind: "sent"; ref: string };

const isDev = (request: Request) => {
  const u = new URL(request.url);
  return u.protocol === "http:" || ["localhost", "127.0.0.1"].includes(u.hostname);
};

export async function loader({ request }: { request: Request }) {
  return { state: readDemo(request), samples: DEMO_QUESTIONS.map(({ id, chip, prompt }) => ({ id, chip, prompt })) };
}

export async function action({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const state = readDemo(request);
  const secure = !isDev(request);

  if (intent === "reset") {
    return redirect("/demo", { headers: { "Set-Cookie": clearDemo(secure) } });
  }

  if (intent === "ask") {
    const id = String(form.get("sample") ?? "");
    const typed = String(form.get("question") ?? "").trim().slice(0, 300);
    const picked = byId(id);
    const t: Triage = picked ? { kind: "match", q: picked } : triage(typed);

    /* Nothing below a real question spends a model call, changes state, or
       reaches the send flow. */
    if (t.kind === "empty" || t.kind === "junk") {
      return {
        screen: { kind: "ask", hint: t.kind === "empty" ? EMPTY_HINT : NOT_A_QUESTION_HINT } as Screen,
        state,
      };
    }

    /* A cached sample: instant, free, already gate-verified. */
    if (t.kind === "match") {
      const q = t.q;
      const next: DemoState = { ...state, asked: [...new Set([...state.asked, q.id])] };
      const screen: Screen = q.escalates
        ? { kind: "escalating", question: q.prompt, reason: q.escalates.reason }
        : { kind: "answer", answer: q.answer };
      return Response.json({ screen, state: next }, { headers: { "Set-Cookie": writeDemo(next, secure) } });
    }

    /* Anything else runs the real pipeline — the same model call and the same
       verification gate a signed-in parent gets. */
    if (state.used >= LIVE_BUDGET) {
      return { screen: { kind: "budget" } as Screen, state };
    }

    const { env } = context.get(cloudflareContext);
    const result = await answerQuestion(typed, env);
    const next: DemoState = { ...state, used: state.used + 1 };

    /* An unverifiable answer is discarded, not shown. That is the product. */
    const screen: Screen =
      "error" in result
        ? { kind: "escalating", question: typed, reason: result.error }
        : result.escalate
          ? {
              kind: "escalating",
              question: typed,
              reason: result.failures.length ? UNVERIFIED_REASON : INSUFFICIENT_REASON,
            }
          : { kind: "answer", answer: result.answer };

    return Response.json({ screen, state: next }, { headers: { "Set-Cookie": writeDemo(next, secure) } });
  }

  if (intent === "send") {
    const question = String(form.get("question") ?? "").trim().slice(0, 300);
    const reason = String(form.get("reason") ?? "").trim().slice(0, 300);
    const ref = demoRef();
    const next: DemoState = { ...state, sent: { question, reason, ref } };
    return Response.json(
      { screen: { kind: "sent", ref } as Screen, state: next },
      { headers: { "Set-Cookie": writeDemo(next, secure) } }
    );
  }

  return { screen: { kind: "ask" } as Screen, state };
}

/* ---------------- chrome ---------------- */

function DemoBar() {
  return (
    <div className="sticky top-0 z-10 border-b border-flag/30 bg-flag-soft">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="rounded-full bg-flag px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-white">
          DEMO MODE
        </span>
        <p className="text-[13px] leading-snug text-ink">{DEMO_NOTICE}</p>
        <div className="ml-auto flex items-center gap-2">
          <Form method="post">
            <input type="hidden" name="intent" value="reset" />
            <button className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Reset demo
            </button>
          </Form>
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Exit demo
          </Link>
        </div>
      </div>
    </div>
  );
}

const card = "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line";
const primary =
  "w-full rounded-2xl bg-brand px-5 py-4 text-[15px] font-semibold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60";
const ghost =
  "w-full rounded-2xl bg-white px-5 py-4 text-[15px] font-semibold text-ink ring-1 ring-line transition hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const flagBtn =
  "w-full rounded-2xl bg-flag px-5 py-4 text-[15px] font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/* ---------------- parent view ---------------- */

function Chips({ samples }: { samples: Sample[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {samples.map((s) => (
        <Form method="post" key={s.id}>
          <input type="hidden" name="intent" value="ask" />
          <input type="hidden" name="sample" value={s.id} />
          <button className="rounded-full bg-field px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-line transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {s.chip}
          </button>
        </Form>
      ))}
    </div>
  );
}

function Ask({ samples, hint }: { samples: Sample[]; hint?: string }) {
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  return (
    <div className={card}>
      <h2 className="text-[28px] font-extrabold leading-tight text-ink">Ask a licensing question</h2>
      <p className="mt-2 text-[15px] text-muted">We will answer from Michigan&rsquo;s foster home rules.</p>

      {hint && (
        <p role="status" className="mt-5 rounded-xl bg-flag-soft px-4 py-3 text-[14px] leading-snug text-ink">
          {hint}
        </p>
      )}

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-[11px] font-bold tracking-wider text-ink">TRY ONE OF THESE</legend>
        <Chips samples={samples} />
      </fieldset>

      <Form method="post" className="mt-6">
        <input type="hidden" name="intent" value="ask" />
        <label htmlFor="demo-question" className="block text-[11px] font-bold tracking-wider text-ink">
          OR WRITE YOUR OWN
        </label>
        <textarea
          id="demo-question"
          name="question"
          rows={4}
          maxLength={300}
          placeholder="Can I use a portable heater in a foster child's bedroom?"
          className="mt-2 w-full resize-none rounded-2xl bg-field px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted/70 focus:ring-2 focus:ring-brand"
        />
        <button disabled={busy} className={`${primary} mt-4`}>
          {busy ? "Checking the rules…" : "Get answer"}
        </button>
      </Form>

      <p className="mt-5 rounded-xl bg-field px-4 py-3 text-[13px] leading-snug text-muted">
        Please don&rsquo;t enter a child&rsquo;s name, case number, or private health information. Your
        question is checked against the rules and is not stored, shown to anyone, or used to train
        anything.
      </p>
      <p className="mt-4 text-center text-[12px] text-muted">
        {CORPUS_FACTS.phrase} · effective {CORPUS_FACTS.effectiveDateLabel}
      </p>
    </div>
  );
}

function AnswerView({ a }: { a: Answer }) {
  const conditional = a.verdict === "yes_if" || a.verdict === "no_unless";
  const positive = a.verdict === "yes" || a.verdict === "yes_if";
  const badge = conditional
    ? { text: positive ? "ALLOWED WITH CONDITIONS" : "LIMITED EXCEPTIONS", cls: "bg-flag-soft text-flag" }
    : { text: "EXACT RULE MATCH", cls: "bg-mint text-mint-ink" };

  return (
    <div className={card}>
      <span className={`inline-block rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider ${badge.cls}`}>
        {badge.text}
      </span>
      <h2 className="mt-4 text-[40px] font-extrabold leading-none text-brand">{a.headline}</h2>
      <p className="mt-3 text-[19px] font-bold leading-snug text-ink">{a.statement}</p>

      {conditional && (
        <div className="mt-5 rounded-2xl bg-flag-soft p-4">
          <h3 className="text-[11px] font-bold tracking-wider text-ink">{positive ? "AS LONG AS" : "UNLESS"}</h3>
          <ol className="mt-3 space-y-3">
            {a.conditions.map((c, i) => (
              <li key={c.rule_number + i} className="flex gap-3">
                <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-flag text-[11px] font-bold text-white">{i + 1}</span>
                <div>
                  <p className="text-[15px] leading-snug text-ink">{c.text}</p>
                  <p className="mt-1 text-[12px] text-muted">{c.rule_number}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {a.citations.map((cit) => {
        const rule = RULES.find((r) => r.rule_number === cit.rule_number);
        return (
          <div key={cit.rule_number} className="mt-5 rounded-2xl bg-field p-4">
            <div className="text-[15px] font-bold text-ink">{cit.rule_number}</div>
            <blockquote className="mt-2 text-[15px] leading-relaxed text-ink">&ldquo;{cit.verbatim_quote}&rdquo;</blockquote>
            <dl className="mt-3 space-y-1 text-[12px] text-muted">
              <div><dt className="inline font-semibold">Section: </dt><dd className="inline">{rule?.heading}</dd></div>
              <div><dt className="inline font-semibold">Effective: </dt><dd className="inline">{CORPUS_FACTS.effectiveDateLabel}</dd></div>
              <div><dt className="inline font-semibold">Verified: </dt><dd className="inline">quotation matched against {CORPUS_FACTS.sourceName}</dd></div>
            </dl>
          </div>
        );
      })}

      <div className="mt-6 space-y-3">
        <Form method="post"><input type="hidden" name="intent" value="back" /><button className={primary}>Ask another question</button></Form>
        <Form method="post">
          <input type="hidden" name="intent" value="ask" />
          <input type="hidden" name="sample" value="piercing" />
          <button className={ghost}>Now try one the rules don&rsquo;t cover</button>
        </Form>
      </div>
    </div>
  );
}

/* The live-answer budget for this browser is spent. Not a refusal and not an
   escalation — the samples still work, and a reset starts over. */
function Budget({ samples }: { samples: Sample[] }) {
  return (
    <div className={card}>
      <div className="grid size-12 place-items-center rounded-2xl bg-field text-2xl font-bold text-muted" aria-hidden>&middot;&middot;&middot;</div>
      <h2 className="mt-5 text-[30px] font-extrabold leading-tight text-ink">
        That&rsquo;s the live-question limit for this browser
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{BUDGET_REASON}</p>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-[11px] font-bold tracking-wider text-ink">THE SAMPLES STILL WORK</legend>
        <Chips samples={samples} />
      </fieldset>

      <div className="mt-6 space-y-3">
        <Form method="post"><input type="hidden" name="intent" value="reset" /><button className={primary}>Reset the demo</button></Form>
        <Form method="post"><input type="hidden" name="intent" value="back" /><button className={ghost}>Back</button></Form>
      </div>
    </div>
  );
}

function Escalating({ question, reason }: { question: string; reason: string }) {
  const nav = useNavigation();
  return (
    <div className={card}>
      <div className="grid size-12 place-items-center rounded-2xl bg-flag-soft text-2xl font-bold text-flag" aria-hidden>!</div>
      <h2 className="mt-5 text-[30px] font-extrabold leading-tight text-ink">Specialist review needed</h2>
      <p className="mt-2 text-[15px] text-muted">{reason}</p>

      <Form method="post" className="mt-5">
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="reason" value={reason} />
        <div className="rounded-2xl bg-field p-4">
          <h3 className="text-[11px] font-bold tracking-wider text-ink">WHAT WILL BE SHARED</h3>
          <p className="mt-2 text-[13px] text-muted">
            Exactly this text, plus your name, goes to your licensing specialist. Edit it before sending if you want to.
          </p>
          <label htmlFor="demo-share" className="sr-only">Question to send for review</label>
          <textarea
            id="demo-share"
            name="question"
            rows={3}
            maxLength={300}
            defaultValue={question}
            className="mt-3 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
          <p className="mt-2 text-[12px] text-muted">
            Nothing else from your account is shared. Your other questions are not visible to your specialist.
          </p>
        </div>
        <button disabled={nav.state === "submitting"} className={`${flagBtn} mt-5`}>
          Send to specialist
        </button>
      </Form>
      <Form method="post" className="mt-3"><input type="hidden" name="intent" value="back" /><button className={ghost}>Back</button></Form>
    </div>
  );
}

function Sent({ ref, state }: { ref: string; state: DemoState }) {
  const looked = state.asked.length + state.used;
  return (
    <div className={card}>
      <div className="grid size-12 place-items-center rounded-2xl bg-mint text-2xl text-mint-ink" aria-hidden>✓</div>
      <h2 className="mt-5 text-[30px] font-extrabold leading-tight text-ink">Sent for review</h2>
      <p className="mt-2 text-[15px] text-muted">
        In the live product this reaches your assigned licensing specialist. In the demo it goes no further than this browser.
      </p>

      <div className="mt-5 rounded-2xl bg-field p-4">
        <div className="text-[11px] font-bold tracking-wider text-ink">REFERENCE</div>
        <div className="mt-1 text-2xl font-extrabold tracking-wide text-ink">{ref}</div>
      </div>

      {/* A sample of the confirmation the live product sends. The demo sends nothing. */}
      <div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-flag-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-flag">
            SAMPLE NOTIFICATION
          </span>
          <span className="text-[12px] text-muted">no email is actually sent in the demo</span>
        </div>
        <p className="mt-3 text-[16px] font-bold leading-snug text-ink">
          Your licensing specialist {DEMO_SPECIALIST} has received your question.
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
          You can expect a response within 24&ndash;48 hours. The answer arrives by email and appears
          here under {ref}.
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-mint/40 p-5 ring-1 ring-mint">
        <h3 className="text-[11px] font-bold tracking-wider text-mint-ink">THE PRIVACY BOUNDARY</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
          {looked > 1 ? (
            <>
              You have looked up <strong>{looked} questions</strong> in this demo. Your specialist
              receives <strong>only the one you just sent</strong> &mdash; asking is not the same as
              sharing.
            </>
          ) : (
            <>
              A specialist can only ever reach a question you explicitly send. There is no view of
              your question history, by design.
            </>
          )}
        </p>
        <p className="mt-2 text-[13px] text-muted">
          In the live product this boundary is enforced in the data layer and covered by automated
          tests, not left to policy.
        </p>
      </div>

      <Form method="post" className="mt-6"><input type="hidden" name="intent" value="back" /><button className={primary}>Ask another question</button></Form>
    </div>
  );
}

/* ---------------- route ---------------- */

export default function Demo({
  loaderData,
  actionData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
  actionData?: { screen: Screen; state: DemoState };
}) {
  const state = actionData?.state ?? loaderData.state;
  const screen: Screen = actionData?.screen ?? { kind: "ask" };

  return (
    <div className="min-h-dvh bg-page">
      <DemoBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="sr-only">Foster Parent Navigator demo</h1>
        <div className="mx-auto w-full max-w-lg">
          {screen.kind === "answer" ? (
            <AnswerView a={screen.answer} />
          ) : screen.kind === "budget" ? (
            <Budget samples={loaderData.samples} />
          ) : screen.kind === "escalating" ? (
            <Escalating question={screen.question} reason={screen.reason} />
          ) : screen.kind === "sent" ? (
            <Sent ref={screen.ref} state={state} />
          ) : (
            <Ask samples={loaderData.samples} hint={screen.hint} />
          )}
        </div>
      </main>
    </div>
  );
}
