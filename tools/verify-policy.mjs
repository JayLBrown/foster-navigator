/* Every parsed policy passage must appear in its own source section's text.
 * Same principle as verify-corpus.mjs: the runtime gate checks the model
 * against the corpus, so something has to check the corpus against the source.
 */
import fs from "node:fs";

const P = JSON.parse(fs.readFileSync("web/app/corpus/policy.json", "utf8"));
const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

/* Must mirror joinLines() in parse-policy.mjs exactly: a hyphen at a line
   break is dropped ("con-" + "cerns" -> "concerns"), while a real hyphen
   inside a line is kept. Doing this on the line-structured text is the only
   way to tell the two apart. */
const flatten = (text) => {
  let out = "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/[a-z]-$/.test(out) && /^[a-z]/.test(t)) out = out.slice(0, -1) + t;
    else out += (out ? " " : "") + t;
  }
  return norm(out);
};

/* Verify against the CLEANED line stream the parser produced, not the raw
 * text: page headers and footers are removed during parsing, so a passage
 * spanning a page break is legitimately not contiguous in the raw file.
 * The .clean.txt files are written to disk so what was stripped is auditable
 * by diffing them against the originals. */
const cache = {};
const sourceFor = (section) =>
  (cache[section] ??= flatten(fs.readFileSync(`source/fom-txt/${section}.clean.txt`, "utf8")));

let bad = 0;
for (const r of P.rules) {
  if (!sourceFor(r.section).includes(norm(r.body))) {
    console.error(`NOT IN SOURCE  ${r.citation}`);
    console.error(`  ${r.body.slice(0, 100)}`);
    bad++;
  }
}

const expected = 11;
if (P.sections.length !== expected) {
  console.error(`Expected ${expected} sections, got ${P.sections.length}`);
  bad++;
}
for (const s of P.sections) {
  if (!s.fob || !s.effective_date) {
    console.error(`Missing bulletin/date: ${s.section}`);
    bad++;
  }
}

console.log(`${P.rules.length} passages across ${P.sections.length} sections`);
console.log(`stale (pre-${P.rule_amendment_date}): ${P.sections.filter((s) => s.predates_rule_amendment).map((s) => s.section).join(", ")}`);
console.log(bad === 0 ? "\nAll passages verified against source." : `\n${bad} problem(s).`);
process.exit(bad ? 1 : 0);
