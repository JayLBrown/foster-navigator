/* The public demo answers any licensing question with the real pipeline, and
 * short-circuits three sample questions to pre-written answers so the common
 * path costs nothing. That cache is only honest if every quotation in it is
 * real, so these tests push each cached answer through the SAME verification
 * gate the live product uses, against the SAME corpus. They also pin the
 * triage that decides what never reaches the model at all.
 */
import fs from "node:fs";
import { verify, tierOf } from "./web/app/lib/gate.ts";
import { DEMO_QUESTIONS, triage, readDemo, writeDemo, clearDemo, EMPTY, DEMO_COOKIE, LIVE_BUDGET } from "./web/app/lib/demo.ts";

const RULES = JSON.parse(fs.readFileSync("web/app/corpus/rules.json", "utf8")).rules;
let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

console.log("\n--- every demo answer passes the real gate ---");
for (const q of DEMO_QUESTIONS) {
  const failures = verify(q.answer, RULES);
  check(`${q.id}: quotations verify against the corpus`, failures, []);
}

console.log("\n--- the demo covers all three outcomes ---");
const verdicts = DEMO_QUESTIONS.map((q) => q.answer.verdict);
check("a definitive answer is present", verdicts.includes("no") || verdicts.includes("yes"), true);
check("a conditional answer is present", verdicts.some((v) => v === "yes_if" || v === "no_unless"), true);
check("an escalation is present", verdicts.includes("insufficient"), true);

console.log("\n--- the escalation example is genuinely unanswerable ---");
const esc = DEMO_QUESTIONS.find((q) => q.escalates);
check("it has no citations", esc.answer.citations.length, 0);
check("it is flagged insufficient", esc.answer.verdict, "insufficient");
check("its subject really is absent from the corpus",
  RULES.some((r) => /pierc|tattoo/i.test(r.body)), false);

console.log("\n--- the same question is never used for two outcomes ---");
const prompts = DEMO_QUESTIONS.map((q) => q.prompt.toLowerCase());
check("all sample prompts are distinct", new Set(prompts).size, prompts.length);
const overnight = DEMO_QUESTIONS.find((q) => q.id === "overnight");
check("the overnight question answers rather than escalates", Boolean(overnight.escalates), false);
check("the overnight answer carries conditions", overnight.answer.conditions.length > 0, true);
check("the overnight answer is tier 'conditions'", tierOf(overnight.answer, []), "conditions");

console.log("\n--- triage keeps junk away from a specialist ---");
/* A specialist's attention is the scarcest thing in the system. Input that is
   not a licensing question must never reach the send flow, and a question the
   demo simply does not carry must not be dressed up as the product refusing. */
const kind = (input) => {
  const t = triage(input);
  return t.kind === "match" ? t.q.id : t.kind;
};
check("empty input", kind(""), "empty");
check("a greeting is not a question", kind("hi"), "junk");
check("keyboard mash is not a question", kind("asdfgh"), "junk");
check("off-topic is not a licensing question", kind("what is the weather tomorrow"), "junk");
check("junk never reaches the send flow",
  ["", "hi", "asdf", "ok thanks", "!!!"].every((x) => ["empty", "junk"].includes(kind(x))), true);

console.log("\n--- near-miss phrasings reach the cached answer ---");
check("abbreviated heater question", kind("can I use portable heater"), "heater");
check("reworded heater question", kind("space heater in her room?"), "heater");
check("the exact sample prompt still matches", kind(DEMO_QUESTIONS[0].prompt), "heater");
check("reworded overnight question", kind("can she sleep over at a friends house"), "overnight");
check("shorthand overnight question", kind("overnight at grandmas"), "overnight");
check("reworded piercing question", kind("she wants her ears pierced"), "piercing");
check("adjacent piercing question", kind("can I let him get a tattoo"), "piercing");

console.log("\n--- anything else is a real question for the model ---");
check("a licensing question outside the sample set goes live", kind("can my foster child have a pet dog"), "live");
check("another one", kind("how hot can the bath water be"), "live");
check("a long unprompted scenario goes live",
  kind("I want my foster children to pay for their own snacks out of their allowance. Is that ok?"), "live");
check("only a genuine corpus gap is cached as an escalation",
  DEMO_QUESTIONS.filter((q) => q.escalates).map((q) => q.id), ["piercing"]);
check("a live budget is set", LIVE_BUDGET > 0, true);

console.log("\n--- demo state is cookie-only and defensive ---");
const req = (cookie) => new Request("https://x/demo", cookie ? { headers: { Cookie: cookie } } : undefined);
check("no cookie yields empty state", readDemo(req()), EMPTY);
check("garbage cookie yields empty state", readDemo(req(`${DEMO_COOKIE}=not-json`)), EMPTY);
const good = { asked: ["heater"], used: 2, sent: { question: "q", reason: "r", ref: "DEMO-1234" } };
check("round-trips", readDemo(req(`${DEMO_COOKIE}=${encodeURIComponent(JSON.stringify(good))}`)), good);
const huge = { asked: Array(50).fill("x"), used: 9999, sent: { question: "z".repeat(5000), reason: "r", ref: "DEMO-1" } };
const read = readDemo(req(`${DEMO_COOKIE}=${encodeURIComponent(JSON.stringify(huge))}`));
check("asked list is capped", read.asked.length, 12);
check("stored question is capped", read.sent.question.length, 300);
check("the live counter is clamped", read.used, 99);
check("a forged live counter cannot go negative",
  readDemo(req(`${DEMO_COOKIE}=${encodeURIComponent(JSON.stringify({ used: -5 }))}`)).used, 0);

console.log("\n--- the demo cookie is scoped away from the app ---");
check("cookie is limited to /demo", writeDemo(EMPTY, true).includes("Path=/demo"), true);
check("cookie is not the session cookie", writeDemo(EMPTY, true).includes("fpn_session"), false);
check("reset expires it", clearDemo(false).includes("Max-Age=0"), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
