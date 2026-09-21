import { Form, useNavigation, type RouterContextProvider } from "react-router";
import { answerQuestion, type Verified } from "~/lib/answer.server";
import { cloudflareContext } from "~/lib/context";
import { createQuestion, createEscalation, type Db } from "~/lib/db.server";
import { requireParent } from "~/lib/session.server";
import { Shell, btnPrimary, btnGhost, btnFlag, field } from "~/lib/ui";
import { Link } from "react-router";
import { CORPUS_META } from "~/lib/corpus";
import { RULES } from "~/lib/corpus";

type ActionResult =
  | ({ kind: "answered"; question: string; questionId: string } & Verified)
  | { kind: "escalating"; question: string; questionId: string; reason: string }
  | { kind: "sent"; reference: string; specialist: string }
  | { kind: "error"; message: string };

type LoaderData = { fullName: string; specialistName: string; sectionCount: number };

export async function loader({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}) {
  const { env } = context.get(cloudflareContext);
  const me = await requireParent(env.DB as unknown as Db, request);
  return {
    fullName: me.fullName,
    specialistName: me.specialistName,
    sectionCount: CORPUS_META.section_count,
  } satisfies LoaderData;
}

export async function action({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}): Promise<ActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "ask");
  const question = String(form.get("question") ?? "").trim();
  const questionId = String(form.get("questionId") ?? "");

  const { env } = context.get(cloudflareContext);
  const db = env.DB as unknown as Db;
  const me = await requireParent(db, request);

  if (intent === "reset") return { kind: "error", message: "" };

  /* The parent may have edited the text on the escalation screen. What is
     sent is what they see, and it is frozen on the escalation row. */
  if (intent === "send") {
    const { referenceCode } = await createEscalation(db, me, {
      questionId,
      sharedPayload: question,
      reason: String(form.get("reason") ?? "Specialist review requested."),
    });
    return { kind: "sent", reference: referenceCode, specialist: me.specialistName };
  }

  if (intent === "escalate") {
    return {
      kind: "escalating",
      question,
      questionId,
      reason: String(form.get("reason") ?? "You asked for a specialist to review this."),
    };
  }

  if (!question) return { kind: "error", message: "Enter a question first." };

  const result = await answerQuestion(question, env);

  /* An upstream failure is not an error page — it is a reason to escalate. */
  if ("error" in result) {
    const id = await createQuestion(db, me, { body: question, verdict: "insufficient" });
    return { kind: "escalating", question, questionId: id, reason: result.error };
  }

  const id = await createQuestion(db, me, {
    body: question,
    verdict: result.answer.verdict,
    matchTier: result.tier,
    headline: result.answer.headline,
    statement: result.answer.statement,
    citations: result.answer.citations,
    gateFailures: result.failures,
  });

  if (result.escalate) {
    return {
      kind: "escalating",
      question,
      questionId: id,
      reason:
        result.failures.length > 0
          ? "The answer could not be verified against the rule text."
          : "The rules do not provide one definite answer for this situation.",
    };
  }

  return { kind: "answered", question, questionId: id, ...result };
}

/* ---------- screen 2 ---------- */

function AskScreen({ sectionCount }: { sectionCount: number }) {
  const nav = useNavigation();
  const busy = nav.state === "submitting";

  return (
    <Form method="post" replace>
      <input type="hidden" name="intent" value="ask" />
      <h1 className="text-3xl font-extrabold leading-tight text-ink">
        Ask a licensing question
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        We will answer from Michigan&rsquo;s foster home rules.
      </p>

      <label className="mt-6 block text-[11px] font-bold tracking-wider text-ink">
        YOUR QUESTION
      </label>
      <textarea
        name="question"
        rows={5}
        required
        placeholder="Can I use a portable heater in a foster child's bedroom?"
        className={`${field} mt-2 resize-none`}
      />

      <button type="submit" disabled={busy} className={`${btnPrimary} mt-5 disabled:opacity-60`}>
        {busy ? "Checking the rules…" : "Get answer"}
      </button>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-field p-3">
        <span aria-hidden className="text-mint-ink">⬤</span>
        <p className="text-[13px] leading-snug text-muted">
          Do not enter a child&rsquo;s name, case number, or private health information.
        </p>
      </div>

      <p className="mt-4 text-center text-[13px]">
        <Link to="/requests" className="font-semibold text-brand hover:underline">
          Your requests
        </Link>
      </p>

      <p className="mt-3 text-center text-[11px] text-muted">
        {sectionCount} rule sections · current as of{" "}
        {new Date(CORPUS_META.effective_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </Form>
  );
}

/* ---------- screen 3 ---------- */

function AnswerScreen({ r }: { r: Extract<ActionResult, { kind: "answered" }> }) {
  const v = r.answer.verdict;
  const conditional = v === "yes_if" || v === "no_unless";
  const positive = v === "yes" || v === "yes_if";

  const badge = conditional
    ? { text: positive ? "ALLOWED WITH CONDITIONS" : "LIMITED EXCEPTIONS", cls: "bg-flag-soft text-flag" }
    : r.tier === "exact"
      ? { text: "EXACT RULE MATCH", cls: "bg-mint text-mint-ink" }
      : { text: "RELATED RULES", cls: "bg-flag-soft text-flag" };

  /* A conditional answer still commits to a direction, so it keeps the brand
     colour. Only the conditions themselves are flagged. */
  return (
    <div>
      <span className={`inline-block rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider ${badge.cls}`}>
        {badge.text}
      </span>

      <h1 className="mt-4 text-[42px] font-extrabold leading-none text-brand">
        {r.answer.headline}
      </h1>
      <p className="mt-3 text-[19px] font-bold leading-snug text-ink">
        {r.answer.statement}
      </p>

      {conditional && r.answer.conditions.length > 0 && (
        <div className="mt-5 rounded-2xl bg-flag-soft p-4">
          <div className="text-[11px] font-bold tracking-wider text-ink">
            {positive ? "AS LONG AS" : "UNLESS"}
          </div>
          <ul className="mt-3 space-y-3">
            {r.answer.conditions.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-flag text-[11px] font-bold text-white"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] leading-snug text-ink">{c.text}</p>
                  <p className="mt-1 text-[12px] text-muted">{c.rule_number}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-flag/25 pt-3 text-[12px] leading-snug text-muted">
            Each condition comes from the rule text below. If your situation
            doesn&rsquo;t fit one of them, send this to your specialist.
          </p>
        </div>
      )}

      {r.answer.citations.map((c) => {
        const rule = RULES.find((x) => x.rule_number === c.rule_number);
        return (
          <div key={c.rule_number} className="mt-5 rounded-2xl bg-field p-4">
            <div className="text-[15px] font-bold text-ink">{c.rule_number}</div>
            <blockquote className="mt-2 text-[15px] leading-relaxed text-ink">
              &ldquo;{c.verbatim_quote}&rdquo;
            </blockquote>
            <div className="mt-3 space-y-0.5 text-[12px] text-muted">
              <div>{rule?.heading}</div>
              <div>
                Effective{" "}
                {new Date(rule?.effective_date ?? CORPUS_META.effective_date).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )}
              </div>
              <div>{CORPUS_META.publisher}</div>
            </div>
          </div>
        );
      })}

      <div className="mt-6 space-y-3">
        <Form method="post" replace>
          <input type="hidden" name="intent" value="reset" />
          <button className={btnPrimary}>Ask another question</button>
        </Form>
        <Form method="post" replace>
          <input type="hidden" name="intent" value="escalate" />
          <input type="hidden" name="question" value={r.question} />
          <input type="hidden" name="questionId" value={r.questionId} />
          <input type="hidden" name="reason" value="You asked for a specialist to review this." />
          <button className={btnGhost}>Ask my specialist about this</button>
        </Form>
      </div>
    </div>
  );
}

/* ---------- screen 4 ---------- */

function EscalateScreen({ r, specialistName }: { r: Extract<ActionResult, { kind: "escalating" }>; specialistName: string }) {
  const nav = useNavigation();
  const busy = nav.state === "submitting";

  return (
    <Form method="post" replace>
      <input type="hidden" name="intent" value="send" />
      <input type="hidden" name="questionId" value={r.questionId} />
      <input type="hidden" name="reason" value={r.reason} />
      <div className="grid size-12 place-items-center rounded-2xl bg-flag-soft text-2xl text-flag">
        !
      </div>
      <h1 className="mt-5 text-3xl font-extrabold leading-tight text-ink">
        Specialist review needed
      </h1>
      <p className="mt-2 text-[15px] text-muted">{r.reason}</p>

      <div className="mt-5 rounded-2xl bg-field p-4">
        <div className="text-[11px] font-bold tracking-wider text-ink">
          WHAT WILL BE SHARED
        </div>
        <p className="mt-2 text-[13px] text-muted">
          Exactly this text, plus your name, goes to {specialistName}, your
          licensing specialist. Edit it before sending if you want to.
        </p>
        <textarea
          name="question"
          rows={4}
          defaultValue={r.question}
          className="mt-3 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
        />
        <p className="mt-2 text-[12px] text-muted">
          Nothing else from your account is shared. Your other questions are not visible
          to your specialist.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button type="submit" disabled={busy} className={`${btnFlag} disabled:opacity-60`}>
          {busy ? "Sending…" : `Send to ${specialistName.split(" ")[0]}`}
        </button>
        <button type="submit" name="intent" value="reset" className={btnGhost}>
          Back
        </button>
      </div>
    </Form>
  );
}

/* ---------- sent ---------- */

function SentScreen({ r }: { r: Extract<ActionResult, { kind: "sent" }> }) {
  return (
    <div>
      <div className="grid size-12 place-items-center rounded-2xl bg-mint text-2xl text-mint-ink">
        ✓
      </div>
      <h1 className="mt-5 text-3xl font-extrabold leading-tight text-ink">Sent</h1>
      <p className="mt-2 text-[15px] text-muted">
        {r.specialist} has your question. Typical response is two business days.
      </p>
      <div className="mt-5 rounded-2xl bg-field p-4">
        <div className="text-[11px] font-bold tracking-wider text-ink">REFERENCE</div>
        <div className="mt-1 text-2xl font-extrabold tracking-wide text-ink">
          {r.reference}
        </div>
      </div>
      <Form method="post" replace className="mt-6">
        <input type="hidden" name="intent" value="reset" />
        <button className={btnPrimary}>Ask another question</button>
      </Form>
    </div>
  );
}

/* ---------- route ---------- */

export default function Ask({
  loaderData,
  actionData,
}: {
  loaderData: LoaderData;
  actionData?: ActionResult;
}) {
  const { fullName, specialistName, sectionCount } = loaderData;
  return (
    <Shell user={{ fullName }}>
      {actionData?.kind === "answered" ? (
        <AnswerScreen r={actionData} />
      ) : actionData?.kind === "escalating" ? (
        <EscalateScreen r={actionData} specialistName={specialistName} />
      ) : actionData?.kind === "sent" ? (
        <SentScreen r={actionData} />
      ) : (
        <>
          {actionData?.kind === "error" && actionData.message && (
            <p className="mb-4 rounded-xl bg-flag-soft px-4 py-3 text-[13px] text-flag">
              {actionData.message}
            </p>
          )}
          <AskScreen sectionCount={sectionCount} />
        </>
      )}
    </Shell>
  );
}
