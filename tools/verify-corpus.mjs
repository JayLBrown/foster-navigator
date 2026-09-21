/* Independent check on rules.json: every parsed section must appear in the
 * extracted source text. Guards against invented, reordered or mangled text
 * — the one failure mode the runtime verification gate cannot catch, because
 * the gate checks the model against the corpus, not the corpus against the law.
 *
 * The parser performs exactly one normalization: it inserts a single space
 * after a subsection marker, so the source's "(e)\"Foster care\"" becomes
 * "(e) \"Foster care\"". Whitespace only, no change of meaning. This check
 * is therefore whitespace-insensitive and nothing else.
 */
import fs from "node:fs";

const corpus = JSON.parse(fs.readFileSync("web/app/corpus/rules.json", "utf8"));
const index = JSON.parse(fs.readFileSync("web/app/corpus/rule-index.json", "utf8")).rules;

const norm = (s) =>
  s.replace(/\(([a-z0-9]+)\)\s*/gi, "($1) ").replace(/\s+/g, " ").trim().toLowerCase();

const source = norm(
  fs
    .readFileSync("source/mi-foster-rules.txt", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !/^Page \d+$/.test(l))
    .join(" ")
    .replace(/([a-z])-\s+([a-z])/g, "$1-$2")
);

let bad = 0;
for (const r of corpus.rules) {
  if (!source.includes(norm(r.body))) {
    console.error(`NOT IN SOURCE  ${r.rule_number}: ${r.body.slice(0, 80)}`);
    bad++;
  }
}

const active = index.filter((r) => r.status === "active").map((r) => r.n);
const got = [...new Set(corpus.rules.map((r) => r.doc_id))];
const missing = active.filter((n) => !got.includes(n));
if (missing.length) { console.error(`MISSING RULES: ${missing.join(", ")}`); bad++; }

const spot = [
  ["R 400.9303(2)", "Portable heating devices may not be used in bedrooms."],
  ["R 400.9310(1)", "An individual may not smoke any substance inside the foster home while foster children are placed in the home."],
];
for (const [num, expected] of spot) {
  const got = corpus.rules.find((r) => r.rule_number === num)?.body;
  if (norm(got ?? "") !== norm(expected)) {
    console.error(`SPOT CHECK FAILED  ${num}\n  got:  ${got}\n  want: ${expected}`);
    bad++;
  }
}

console.log(`${corpus.rules.length} sections across ${got.length} rules`);
console.log(`rescinded: ${corpus.rescinded_rules.join(", ")}`);
console.log(bad === 0 ? "\nAll sections verified against source." : `\n${bad} problem(s).`);
process.exit(bad ? 1 : 0);
