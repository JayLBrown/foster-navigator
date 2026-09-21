# Foster Parent Navigator

Answers Michigan foster parents' licensing questions with a verdict **and the
verbatim rule text that backs it**. When the rules don't settle a question, it
says so and routes to the parent's assigned licensing specialist rather than
guessing.

The refusal is the product. Anything can answer foster care questions; what
makes this credible to an agency is that it **abstains when it cannot prove the
answer from the rule text**. "Insufficient" is a correct outcome, not a bug.

Live: https://foster-navigator.jay-a84.workers.dev — start at `/demo`, no
account needed.

## How it works

Three decisions carry the whole thing.

**1. The verification gate — `web/app/lib/gate.ts`.**
Every quoted passage the model produces is string-matched against the stored
rule text *before display*. No match, and the answer is discarded and the
question escalates. `resolveRule()` handles citations at a different
granularity than the corpus — `R 400.9303(2)` resolving to its parent rule —
because exact-string matching alone once blocked a *correct* answer.

Five verdicts: `yes` · `yes_if` · `no` · `no_unless` · `insufficient`. A
single "conditional" bucket collapsed three different situations and surfaced
all of them as "It depends", which reads as a shrug. `yes_if` and `no_unless`
must carry conditions, each quoting the rule that imposes it, or the gate
flags them.

**2. Access control lives in the query layer, not the database.**
D1 is SQLite and has no row-level security, so every function in
`db.server.ts` takes a `caller`, and a specialist's read is keyed off **the
escalation**, never the assignment. There is deliberately no function that
reads questions by parent — the privacy property is enforced by the absence of
an API, which `access.test.mjs` asserts.

**3. The corpus is code.**
Versioned files in the repo, ingested offline with human review, never scraped
at runtime. Provenance travels with every rule.

## Layout

    web/                            React Router v8 on Cloudflare Workers + D1
      app/lib/gate.ts                 the verification gate — read this first
      app/lib/answer.server.ts        model call, schema, then the gate
      app/lib/db.server.ts            every function takes a `caller`
      app/lib/demo.ts                 public demo: triage, samples, cookie state
      app/lib/config.ts               claims that need a source before they ship
      app/corpus/rules.json           43 rules, 101 citable sections
      app/corpus/rule-index.json      46 entries (43 active + 3 rescinded)
      app/corpus/policy.json          MDHHS manual tier — parsed, not wired in
      app/routes/demo.tsx             /demo — public, credential-free, real gate
      app/routes/ask.tsx              /ask — the signed-in parent app
      migrations/                     D1 schema and seeds
    tools/                          ingestion, verification, lint
    source/                         the original PDFs — the provenance chain
    gate.test.js                    30 tests against gate.ts — one gate, no copy
    access.test.mjs                 25 tests — access control, replaces RLS
    auth.test.mjs                   59 tests — passwords, sessions
    demo.test.mjs                   40 tests — the public demo and its triage
    ask.js, eval/questions.json     terminal eval harness

## Run it

    cd web
    npm install
    cp .dev.vars.example .dev.vars     # your key from console.anthropic.com
    npm run db:setup                   # local D1 schema + dev seed
    npm run dev                        # http://localhost:5173

`/` is the marketing home. The demo is `/demo`; the signed-in app is `/ask`.

Note: a POST to a root index route does not dispatch to its own action in this
React Router version — it returned 405. That is why the parent app lives at
`/ask`. Don't move it to an index route without retesting form submission.

Deploying needs macOS and a Cloudflare account; see `DEPLOY.md`.

## Tests

    npm test        # from the repo root — no API key needed

154 tests plus a lint that fails the build if client code imports a `*.server`
module. They cover paraphrase, added words, invented rule numbers, superseded
text and uncited verdicts; the access-control boundary; password hashing and
sessions; and the public demo, including that every pre-written demo answer
still verifies against the real corpus.

### Terminal eval harness

    cp .env.example .env
    npm run ask         # the question set through the loop
    npm run sabotage    # corrupts every citation; all must be stopped

`ask.js` predates the `yes_if`/`no_unless` split and still uses the older
four-verdict contract. It is useful for sabotage runs; update it before
treating its output as a real evaluation.

## Corpus

`web/app/corpus/rules.json` holds the complete current rule set: **43 rules,
101 individually citable sections**, effective 16 June 2023, parsed from the
compiled Michigan Administrative Code and re-checked line by line against the
extracted text by `tools/verify-corpus.mjs`.

Rebuild it with `npm run corpus`. Rules are never UPDATEd in place;
`superseded_at` is designed for versioning but is not yet implemented.

### Three things found while sourcing the rules

**The text changed in 2023.**

| Version | R 400.9303(2) |
| --- | --- |
| 2020 | "Portable heating devices may be used for up and awake activity, except in bedrooms." |
| 2023 | "Portable heating devices may not be used in bedrooms." |

The MDHHS handbook still carries the old wording. A gate test asserts the 2020
sentence is rejected.

**The 2023 filing is an amendment set, not the full code.** It contains only
rules that changed. R 400.9304 (smoke detectors), R 400.9418 and R 400.9504
are absent because they weren't amended — ingesting from that file alone would
silently drop the smoke detector rule. Use the compiled administrative code,
`R 400.9101 to 400.9506`, from LARA's ARS.

**Three different PDFs govern three different things.** Adult foster care
(R 400.601–745) and child placing agencies (R 400.12101–12808) look right and
are not. The wrong one was parsed twice before anyone checked a cover page.
The gate cannot protect against a corpus of the wrong rules — verify the cover,
the authority and the rule range before parsing anything.

**The FOM is policy, not law.** The MDHHS Foster Parent Manual paraphrases the
rules, so it is kept as a separate corpus with per-section dates and a
`predates_rule_amendment` flag. It is parsed but deliberately not wired into
answers, which is why manual-tier questions correctly escalate. Do not cite it
as a rule.

## Not built

Interactive follow-up questions for genuinely ambiguous cases — the design is
a sixth verdict, `unclear`, carrying one clarifying question and naming the
rule the answer turns on, gated the same way `yes_if` is gated. Also: the
policy tier wired into retrieval, `superseded_at` rule versioning, sign-in rate
limiting, email notification, and automatic routing to Centralized Intake for
questions that signal risk rather than a rule.

`HANDOFF.md` carries current state and open items. `BUILDATHON.md` is the
submission write-up.
