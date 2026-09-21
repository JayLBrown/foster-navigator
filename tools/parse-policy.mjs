/* Parses the MDHHS Children's Foster Care Manual (FOM) sections into
 * web/app/corpus/policy.json.
 *
 * Policy is NOT law. It is kept in a separate corpus from the administrative
 * rules and carries its own bulletin number and effective date, because:
 *   - FOM paraphrases the rules rather than quoting them
 *   - sections revise independently, on their own schedule
 *   - a section predating the 2023 rule amendment may describe superseded law
 *
 * Layout: headings sit in the left margin, body text is indented ~22 columns.
 */
import fs from "node:fs";
import path from "node:path";

const DIR = "source/fom-txt";
const OUT = "web/app/corpus/policy.json";
const RULE_AMENDMENT = "2023-06-16";
const MAX_CHUNK = 1800;

const FURNITURE = [
  /CHILDREN'S FOSTER CARE MANUAL/i,
  /STATE OF MICHIGAN/i,
  /DEPARTMENT OF HEALTH ?& ?HUMAN SERVICES/i,
  /^FOM \S+\s+\d+ of \d+/,
  /^FOB \d{4}-\d{3}$/,
  /^\d{1,2}-\d{1,2}-\d{4}$/,
];

const isFurniture = (l) => FURNITURE.some((re) => re.test(l.trim()));
const indent = (l) => l.length - l.trimStart().length;

function readSection(file) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const id = path.basename(file, ".txt");

  const head = raw.slice(0, 600).replace(/\s+/g, " ");
  const fob = head.match(/FOB (\d{4}-\d{3})/)?.[1] ?? null;
  const d = head.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  const effective = d
    ? `${d[3]}-${String(d[1]).padStart(2, "0")}-${String(d[2]).padStart(2, "0")}`
    : null;
  const title =
    head
      .replace(/^.*?FOM \S+\s+\d+ of \d+\s*/, "")
      .replace(/FOB \d{4}-\d{3}/g, "")
      .replace(/\d{1,2}-\d{1,2}-\d{4}/g, "")
      .trim()
      .split(/\s{2,}|OVERVIEW/)[0]
      .trim() || id;

  /* strip page headers: after a form feed, skip to the first blank line */
  const lines = [];
  let skipping = true; // page 1 has no preceding form feed
  for (const line of raw.split("\n")) {
    if (line.includes("\f")) { skipping = true; continue; }
    if (skipping) { if (!line.trim()) skipping = false; continue; }
    if (isFurniture(line)) continue;
    lines.push(line.replace(/ /g, " ").trimEnd());
  }

  /* headings live in the left margin, body is indented */
  const blocks = [];
  let cur = null;
  let pendingHeading = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const ind = indent(line);

    if (ind <= 6) {
      if (cur && cur.body.length) { blocks.push(cur); cur = null; }
      pendingHeading.push(line.trim());
      continue;
    }
    if (pendingHeading.length) {
      cur = { heading: joinLines(pendingHeading), body: [] };
      pendingHeading = [];
    }
    if (!cur) cur = { heading: null, body: [] };
    cur.body.push(line.trim());
  }
  if (cur && cur.body.length) blocks.push(cur);

  fs.writeFileSync(path.join(DIR, `${id}.clean.txt`), lines.join("\n") + "\n");

  return { id, title, fob, effective, blocks };
}

/* "disci-" + "plining" -> "disciplining"; keeps real hyphens intact. */
function joinLines(arr) {
  let out = "";
  for (const line of arr) {
    if (/[a-z]-$/.test(out) && /^[a-z]/.test(line)) out = out.slice(0, -1) + line;
    else out += (out ? " " : "") + line;
  }
  return out.replace(/\s+/g, " ").trim();
}

function chunk(text) {
  if (text.length <= MAX_CHUNK) return [text];
  const out = [];
  let buf = "";
  for (const sentence of text.split(/(?<=\.)\s+/)) {
    if ((buf + " " + sentence).length > MAX_CHUNK && buf) { out.push(buf.trim()); buf = ""; }
    buf += " " + sentence;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const rows = [];
const sections = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort()) {
  const s = readSection(file);
  const stale = s.effective ? s.effective < RULE_AMENDMENT : true;
  sections.push({
    section: s.id, title: s.title, fob: s.fob,
    effective_date: s.effective, predates_rule_amendment: stale,
    blocks: s.blocks.length,
  });

  for (const b of s.blocks) {
    const body = joinLines(b.body);
    if (body.length < 40) continue;
    const parts = chunk(body);
    parts.forEach((text, i) => {
      const heading = b.heading ?? "General";
      rows.push({
        citation: `FOM ${s.id}` + (b.heading ? ` § ${titleCase(heading)}` : "") +
                  (parts.length > 1 ? ` (${i + 1} of ${parts.length})` : ""),
        section: s.id,
        section_title: s.title,
        heading: titleCase(heading),
        body: text,
        fob: s.fob,
        effective_date: s.effective,
        source_type: "policy",
        predates_rule_amendment: stale,
      });
    });
  }
}

function titleCase(h) {
  if (!/[a-z]/.test(h)) {
    return h.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\b(And|Or|Of|In|To|For|The|A|An|From)\b/g, (m) => m.toLowerCase())
      .replace(/^./, (c) => c.toUpperCase());
  }
  return h;
}

fs.writeFileSync(OUT, JSON.stringify({
  corpus_type: "policy",
  source_document: "MDHHS Children's Foster Care Manual (FOM)",
  publisher: "Michigan Department of Health and Human Services",
  note: "Agency policy, not law. Where policy and an administrative rule conflict, the rule governs.",
  rule_amendment_date: RULE_AMENDMENT,
  retrieved: "2026-09-19",
  sections,
  rules: rows,
}, null, 2) + "\n");

console.log(`${sections.length} sections -> ${rows.length} passages`);
console.log(`chars: ${rows.reduce((a, r) => a + r.body.length, 0).toLocaleString()}`);
console.log(`\npredating the 2023 rule amendment:`);
sections.filter((s) => s.predates_rule_amendment)
  .forEach((s) => console.log(`  ${s.section.padEnd(9)} ${s.effective_date}  ${s.title.slice(0, 44)}`));
console.log(`\nwrote ${OUT}`);
