/* The public demo: synthetic, credential-free, isolated from production.
 *
 * ISOLATION. Nothing here touches D1. No question is stored, no escalation
 * row is created, no specialist is notified. Demo state lives in one
 * short-lived cookie holding question ids the visitor has opened, so the
 * confirmation screen can show that asking is not the same as sharing.
 * Production sessions use a different cookie and a different code path; a
 * demo visitor is never signed in.
 *
 * ANSWERS. The three samples below are pre-written: they are free, instant,
 * and every quotation in them is real text from the loaded corpus, checked
 * against it by demo.test.mjs — so a sample cannot drift from the law. They
 * are a cache, not a limit. Anything else a visitor types runs the real
 * pipeline: the model, then the same verification gate the signed-in product
 * uses. An unverifiable answer is discarded and escalates, here as there.
 *
 * COST. This route is public and unauthenticated, so live inference is an
 * open bill. LIVE_BUDGET caps it per browser via the demo cookie. That is a
 * speed bump, not a control — the cookie is the visitor's to clear. Real
 * protection is a rate limit in front of /demo; see DEPLOY.md.
 */
import type { Answer, Condition } from "./gate";

export const DEMO_COOKIE = "fpn_demo";
export const DEMO_NOTICE =
  "Demo mode uses sample information. Nothing is saved or sent to a real licensing specialist.";

/* Shown on the confirmation screen as a sample of the notification the live
   product sends. The demo sends no email and creates no escalation row. */
export const DEMO_SPECIALIST = "Erica Adams";

export type DemoQuestion = {
  id: string;
  prompt: string;
  chip: string;
  answer: Answer;
  /* set when the rules genuinely do not reach the question */
  escalates?: { reason: string };
};

const c = (text: string, rule_number: string, verbatim_quote: string): Condition => ({
  text,
  rule_number,
  verbatim_quote,
});

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "heater",
    chip: "Portable heater",
    prompt: "Can I use a portable heater in a foster child's bedroom?",
    answer: {
      verdict: "no",
      headline: "No.",
      statement: "Portable heating devices are not allowed in bedrooms.",
      citations: [
        {
          rule_number: "R 400.9303(2)",
          verbatim_quote: "Portable heating devices may not be used in bedrooms.",
        },
      ],
      conditions: [],
    },
  },
  {
    id: "overnight",
    chip: "Overnight stay",
    prompt: "Can my foster child stay overnight at a friend's house?",
    answer: {
      verdict: "yes_if",
      headline: "Yes, with conditions.",
      statement:
        "Nothing in the licensing rules prohibits an overnight stay, but three requirements apply.",
      citations: [
        {
          rule_number: "R 400.9413(2)",
          verbatim_quote:
            "A foster parent shall identify at least 1 adult who would care for the foster child for an extended overnight period. The identified adult must have both a central registry and a criminal history background check.",
        },
      ],
      conditions: [
        c(
          "The adult caring for your child needs a central registry check and a criminal history background check.",
          "R 400.9413(2)",
          "The identified adult must have both a central registry and a criminal history background check."
        ),
        c(
          "Supervision has to suit your child's age and level of functioning.",
          "R 400.9413(1)",
          "A foster parent shall always ensure an appropriate level of care and supervision for the foster child, consistent with a child"
        ),
        c(
          "Tell your agency if the stay will run longer than three days.",
          "R 400.9413(3)",
          "A foster parent must notify the agency of any extended, overnight period when a foster child will be out of the home for a period exceeding 3 days."
        ),
      ],
    },
  },
  {
    id: "piercing",
    chip: "Ear piercing",
    prompt: "My foster daughter wants her ears pierced. Can I take her?",
    answer: {
      verdict: "insufficient",
      headline: "",
      statement: "",
      citations: [],
      conditions: [],
    },
    escalates: {
      reason:
        "The licensing rules do not address body piercing, so there is no rule text to answer from.",
    },
  },
];

export const byId = (id: string) => DEMO_QUESTIONS.find((q) => q.id === id);

/* ---------------- triage ----------------------------------------------
 *
 * Three different things used to produce the same escalation screen: input
 * that is not a licensing question at all ("hi"), a real licensing question
 * this demo does not carry, and a question the rules genuinely do not reach.
 * Only the last is the product's thesis, and only the last is worth a
 * specialist's attention — a queue with "hi" in it is how an agency stops
 * trusting the tool. Triage separates them before anything can be sent.
 */

export type Triage =
  | { kind: "empty" }
  | { kind: "junk" }
  /* one of the cached samples — answered instantly, no model call */
  | { kind: "match"; q: DemoQuestion }
  /* a real licensing question: run the model and the gate */
  | { kind: "live" };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'?\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* A sample is matched on its meaning-bearing terms rather than on the whole
   prompt, so "can I use portable heater" reaches the cached heater answer
   instead of falling through to review. */
const TRIGGERS: { id: string; terms: RegExp[] }[] = [
  { id: "heater", terms: [/\bheater/, /\bheating\b/, /\bspace heat/, /\bportable heat/] },
  {
    id: "overnight",
    terms: [/\bovernight\b/, /\bsleep ?over/, /\bspend the night\b/, /\bstay the night\b/, /\bfriend'?s house\b/],
  },
  { id: "piercing", terms: [/\bpierc/, /\bearring/, /\btattoo\b/] },
];

/* Vocabulary that marks something as a foster-licensing question even when
   this demo cannot answer it. Deliberately broad and prefix-matched: treating
   a real question as junk costs more than the reverse. */
const DOMAIN =
  /\b(foster|child|kid|daughter|son|teen|baby|bedroom|room|home|house|licen|agency|worker|caseworker|specialist|placement|respite|babysit|sitter|supervis|disciplin|punish|spank|medicat|medicine|prescription|doctor|dentist|therap|school|daycare|travel|vacation|car|seat ?belt|firearm|gun|weapon|ammunition|pool|trampoline|pet|dog|cat|smoke|alarm|fire|drill|extinguisher|water|temperature|crib|bunk|bed|sleep|overnight|curfew|phone|social media|internet|haircut|hair|pierc|tattoo|allowance|chore|visit|sibling|adopt|court|background|heat)/;

const QUESTION_SHAPE =
  /(\?|^(can|could|may|might|do|does|did|is|are|am|should|must|would|will|what|when|where|who|why|how)\b)/;

export function triage(input: string): Triage {
  const text = normalize(input);
  if (text.length < 2) return { kind: "empty" };
  if (!/[a-z]/.test(text)) return { kind: "junk" };

  for (const t of TRIGGERS) {
    if (t.terms.some((re) => re.test(text))) {
      const q = byId(t.id);
      if (q) return { kind: "match", q };
    }
  }
  const exact = DEMO_QUESTIONS.find((q) => normalize(q.prompt) === text);
  if (exact) return { kind: "match", q: exact };

  /* A real licensing question. It goes to the model and the gate, exactly as
     it would for a signed-in parent. */
  if (DOMAIN.test(text) && (QUESTION_SHAPE.test(text) || text.split(" ").length >= 4)) {
    return { kind: "live" };
  }
  return { kind: "junk" };
}

/* Copy for the two outcomes that stop short of a specialist. */
export const EMPTY_HINT = "Type a question, or pick one of the samples below.";

export const NOT_A_QUESTION_HINT =
  "That does not look like a licensing question. Try one of the samples below, or ask about something in a foster home — bedrooms, supervision, travel, medication.";

/* Reasons a live answer ends at a person rather than on screen. The second is
   the gate doing its job, and the demo says so rather than hiding it. */
export const INSUFFICIENT_REASON =
  "The licensing rules do not settle this question, so there is no rule text to answer from.";

export const UNVERIFIED_REASON =
  "An answer was drafted, but its quotations could not be matched to the rule text, so it was discarded rather than shown to you.";

export const BUDGET_REASON =
  "This public demo answers a limited number of live questions per visitor so it cannot run up an open bill. The three samples below still work, and reset the demo to start over.";

/* ---------------- demo state (cookie only, never the database) ---------- */

export type DemoState = {
  /* sample ids the visitor has looked at, so the confirmation screen can show
     that asking is not the same as sharing */
  asked: string[];
  /* live model answers served to this browser, against LIVE_BUDGET */
  used: number;
  /* the one question explicitly sent for review */
  sent: { question: string; reason: string; ref: string } | null;
};

export const EMPTY: DemoState = { asked: [], used: 0, sent: null };

/* Live answers per browser before the demo falls back to the samples. */
export const LIVE_BUDGET = 6;

const clamp = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export function readDemo(request: Request): DemoState {
  const header = request.headers.get("Cookie");
  if (!header) return EMPTY;
  const raw = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(DEMO_COOKIE + "="))
    ?.slice(DEMO_COOKIE.length + 1);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as DemoState;
    return {
      asked: Array.isArray(parsed.asked)
        ? parsed.asked.filter((x) => typeof x === "string").slice(0, 12)
        : [],
      used: Number.isFinite(parsed.used) ? Math.min(Math.max(Math.trunc(parsed.used), 0), 99) : 0,
      sent: parsed.sent
        ? {
            question: clamp(String(parsed.sent.question ?? ""), 300),
            reason: clamp(String(parsed.sent.reason ?? ""), 300),
            ref: clamp(String(parsed.sent.ref ?? ""), 20),
          }
        : null,
    };
  } catch {
    return EMPTY;
  }
}

export const writeDemo = (state: DemoState, secure: boolean) =>
  `${DEMO_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; Path=/demo; SameSite=Lax; Max-Age=7200` +
  (secure ? "; Secure" : "");

export const clearDemo = (secure: boolean) =>
  `${DEMO_COOKIE}=; Path=/demo; SameSite=Lax; Max-Age=0` + (secure ? "; Secure" : "");

export const demoRef = () => "DEMO-" + Math.floor(1000 + Math.random() * 9000);
