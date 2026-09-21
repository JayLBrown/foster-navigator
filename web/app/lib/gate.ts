/* The verification gate. Pure functions, no network.
   An answer whose quotes are not literally present in the corpus must never
   reach a foster parent. This is the load-bearing safety mechanism. */

export type Rule = {
  rule_number: string;
  heading: string;
  body: string;
  doc_id: string;
  effective_date: string;
  source_status: string;
};

export type Citation = { rule_number: string; verbatim_quote: string };

/* A condition attached to a yes_if / no_unless answer. Plain-language text
   the foster parent can act on, plus the rule it comes from — verified by the
   same gate as any other quote, so a condition can never be invented. */
export type Condition = {
  text: string;
  rule_number: string;
  verbatim_quote: string;
};

/* Five outcomes, not four. A single "conditional" bucket collapsed three
 * genuinely different situations and surfaced all of them as "It depends",
 * which reads as a shrug:
 *
 *   yes_if      permitted, subject to conditions   (an overnight stay)
 *   no_unless   prohibited, narrow exceptions      (sharing a room with an adult)
 *   insufficient the rules do not settle it        (escalate)
 *
 * Splitting them is what turns an accurate-but-unhelpful answer into an
 * actionable one. */
export type Verdict = "yes" | "yes_if" | "no" | "no_unless" | "insufficient";

export type Answer = {
  verdict: Verdict;
  headline: string;
  statement: string;
  citations: Citation[];
  conditions: Condition[];
};

export type MatchTier = "exact" | "related" | "conditions" | "none";

export const norm = (s: string) =>
  s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* The corpus is keyed at subsection level ("R 400.9404(3)"), but a correct
 * citation may sit at a different granularity:
 *
 *   less specific  "R 400.9404"        -> the whole rule, any subsection
 *   more specific  "R 400.9306(1)(g)"  -> a nested item inside a subsection
 *
 * Exact-string matching rejected both as "not in the corpus", which turned
 * good answers into escalations and sent specialists work they did not need.
 * Resolve to candidate sections instead and let the verbatim check decide. */
export function resolveRule(cited: string, rules: Rule[]): Rule[] {
  const exact = rules.find((r) => r.rule_number === cited);
  if (exact) return [exact];

  let trimmed = cited.trim();
  while (/\([^)]*\)\s*$/.test(trimmed)) {
    trimmed = trimmed.replace(/\([^)]*\)\s*$/, "").trim();
    const parent = rules.find((r) => r.rule_number === trimmed);
    if (parent) return [parent];
  }

  return rules.filter(
    (r) => r.doc_id === cited.trim() || r.rule_number.startsWith(cited.trim() + "(")
  );
}

export function verify(answer: Answer, rules: Rule[]): string[] {
  const failures: string[] = [];

  /* Conditions are quoted rule text shown to a foster parent as things they
     must do. They get the same verification as citations. */
  for (const c of [...answer.citations, ...(answer.conditions ?? [])]) {
    const candidates = resolveRule(c.rule_number, rules);
    if (candidates.length === 0) {
      failures.push(`cited ${c.rule_number}, which is not in the corpus`);
      continue;
    }
    const quote = norm(c.verbatim_quote);
    if (!candidates.some((r) => norm(r.body).includes(quote))) {
      failures.push(`quote not found verbatim in ${c.rule_number}`);
    }
  }
  if (answer.verdict !== "insufficient" && answer.citations.length === 0) {
    failures.push("gave a verdict with no citation");
  }

  /* A conditional verdict with no conditions is the "It depends" shrug the
     taxonomy exists to prevent. */
  if (
    (answer.verdict === "yes_if" || answer.verdict === "no_unless") &&
    (answer.conditions ?? []).length === 0
  ) {
    failures.push(`verdict ${answer.verdict} with no conditions listed`);
  }

  return failures;
}

export const tierOf = (answer: Answer, failures: string[]): MatchTier => {
  if (failures.length || answer.verdict === "insufficient") return "none";
  if (answer.verdict === "yes_if" || answer.verdict === "no_unless") return "conditions";
  return answer.citations.length === 1 ? "exact" : "related";
};

/* What the foster parent reads at the top of the answer. The model proposes a
   headline; these are the fallbacks and the badge wording, which the model
   does not control. */
export const HEADLINE: Record<Verdict, string> = {
  yes: "Yes.",
  yes_if: "Yes, with conditions.",
  no: "No.",
  no_unless: "No, with narrow exceptions.",
  insufficient: "",
};
