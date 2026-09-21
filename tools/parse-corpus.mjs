/* Step 2 of corpus ingestion: text -> web/app/corpus/rules.json
 *
 * Splits the Michigan foster family home licensing rules into one corpus row
 * per top-level subsection, because that is the granularity the app cites
 * ("R 400.9303(2)").
 *
 * Refuses to write anything if the parsed output disagrees with
 * rule-index.json. A silently incomplete corpus is the one failure the
 * verification gate cannot catch.
 */
import fs from "node:fs";

const SRC = "source/mi-foster-rules.txt";
const INDEX = "web/app/corpus/rule-index.json";
const OUT = "web/app/corpus/rules.json";

const RULE_HEAD = /^R (400\.9\d{3})\s+(.+?)\.?\s*$/;
const SUBSEC = /^\((\d+)\)\s*(.*)$/;
const LETTER = /^\(([a-z])\)\s*(.*)$/;
const RULE_PREFIX = /^Rule \d+\.\s*/;

/* pdftotext -layout keeps a trailing hyphen where a word is broken across
   lines. Rejoin those without a space so "trauma-" + "responsive" becomes
   "trauma-responsive" rather than "trauma- responsive". Default (non-layout)
   mode drops the hyphen entirely, which is why extract.sh uses -layout. */
const rawLines = fs
  .readFileSync(SRC, "utf8")
  .split("\n")
  .map((l) => l.replace(/\u00a0/g, " ").trim())
  .filter((l) => !/^Page \d+$/.test(l));

const HY = "\u0000";
const lines = [];
for (let i = 0; i < rawLines.length; i++) {
  let line = rawLines[i];
  while (/[a-z]-$/.test(line) && /^[a-z]/.test(rawLines[i + 1] ?? "")) {
    line = line.slice(0, -1) + HY + rawLines[i + 1];
    i++;
  }
  lines.push(line);
}

/* ---- pass 1: split into rules ---- */

const rules = [];
let cur = null;
let part = null;

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;

  const partMatch = line.match(/^PART (\d+)\./);
  if (partMatch) {
    part = Number(partMatch[1]);
    continue;
  }

  const head = line.match(RULE_HEAD);
  if (head) {
    cur = { number: "R " + head[1], heading: head[2], part, body: [], history: null };
    rules.push(cur);
    continue;
  }
  if (!cur) continue;

  if (line.startsWith("History:")) {
    cur.history = line.replace(/^History:\s*/, "").replace(/\.$/, "");
    cur = null; // everything after History belongs to the next rule
    continue;
  }
  cur.body.push(line);
}

/* ---- pass 2: split each rule body into subsections ---- */

function subsections(bodyLines) {
  const out = [];
  let open = null;

  const push = (text) => {
    if (open) open.parts.push(text);
  };

  for (let i = 0; i < bodyLines.length; i++) {
    let line = bodyLines[i];
    if (i === 0) line = line.replace(RULE_PREFIX, "");

    const sub = line.match(SUBSEC);
    if (sub) {
      open = { n: Number(sub[1]), parts: sub[2] ? [sub[2]] : [] };
      out.push(open);
      continue;
    }
    const letter = line.match(LETTER);
    if (letter) {
      push(`(${letter[1]}) ${letter[2]}`);
      continue;
    }
    if (!open) {
      open = { n: null, parts: [line] };
      out.push(open);
      continue;
    }
    push(line);
  }

  return out.map((s) => ({
    n: s.n,
    text: s.parts.join(" ").replace(/\s+/g, " ").split(HY).join("-").trim(),
  }));
}

/* ---- pass 3: emit corpus rows ---- */

const rows = [];
const rescinded = [];

for (const r of rules) {
  const joined = r.body.join(" ").trim();
  if (/^Rescinded\.?$/i.test(r.heading) || /^Rescinded\.?$/i.test(joined)) {
    rescinded.push(r.number);
    continue;
  }

  const effective = /2023 AACS/.test(r.history ?? "") ? "2023-06-16" : null;
  const subs = subsections(r.body).filter((s) => s.text);

  if (subs.length === 1 && subs[0].n === null) {
    rows.push({
      rule_number: r.number,
      heading: r.heading,
      body: subs[0].text,
      doc_id: r.number,
      part: r.part,
      effective_date: effective,
      history: r.history,
      source_status: "verified",
    });
    continue;
  }

  for (const s of subs) {
    if (s.n === null) continue; // preamble text before (1), if any
    rows.push({
      rule_number: `${r.number}(${s.n})`,
      heading: r.heading,
      body: s.text,
      doc_id: r.number,
      part: r.part,
      effective_date: effective,
      history: r.history,
      source_status: "verified",
    });
  }
}

/* ---- pass 4: reconcile against the index, refuse to write on any gap ---- */

const index = JSON.parse(fs.readFileSync(INDEX, "utf8")).rules;
const expectedActive = index.filter((r) => r.status === "active").map((r) => r.n);
const expectedRescinded = index.filter((r) => r.status === "rescinded").map((r) => r.n);
const gotRules = [...new Set(rows.map((r) => r.doc_id))];

const missing = expectedActive.filter((n) => !gotRules.includes(n));
const unexpected = gotRules.filter((n) => !expectedActive.includes(n));
const rescindedMismatch = expectedRescinded.filter((n) => !rescinded.includes(n));

console.log(`parsed   ${gotRules.length} rules -> ${rows.length} subsections`);
console.log(`rescinded ${rescinded.length}: ${rescinded.join(", ")}`);

let bad = false;
if (missing.length) { console.error(`\nMISSING from parse: ${missing.join(", ")}`); bad = true; }
if (unexpected.length) { console.error(`\nNOT IN INDEX: ${unexpected.join(", ")}`); bad = true; }
if (rescindedMismatch.length) { console.error(`\nEXPECTED RESCINDED, not seen: ${rescindedMismatch.join(", ")}`); bad = true; }
const empty = rows.filter((r) => r.body.length < 10);
if (empty.length) { console.error(`\nSUSPICIOUSLY SHORT: ${empty.map((r) => r.rule_number).join(", ")}`); bad = true; }

if (bad) {
  console.error("\nRefusing to write rules.json. Fix the parser or the index first.");
  process.exit(1);
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      corpus_status: "complete",
      source_document: "Michigan Administrative Code, Foster Family Homes and Foster Family Group Homes",
      source_file: "source/R 400.9101 to R 400.9506.pdf",
      authority: "1973 PA 116 (child care organizations act)",
      publisher: "Michigan Department of Health and Human Services",
      effective_date: "2023-06-16",
      retrieved: "2026-09-19",
      rescinded_rules: rescinded,
      rules: rows,
    },
    null,
    2
  ) + "\n"
);

console.log(`\nwrote ${OUT}`);
