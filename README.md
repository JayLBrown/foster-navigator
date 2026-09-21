# Foster Parent Navigator

Answers Michigan foster parents' licensing questions with a verdict and the
verbatim rule text that backs it. Anything the rules don't clearly answer is
escalated to the parent's assigned licensing specialist.

## Layout

    web/                 the app — React Router v8 on Cloudflare Workers
      app/lib/gate.ts       the verification gate (canonical)
      app/lib/answer.server.ts  Claude call + schema + gate
      app/corpus/           rule corpus + full rule index (canonical)
      app/routes/ask.tsx    screens 2, 3, 4
    ask.js               terminal eval harness, runs eval/questions.json
    gate.test.js         tests web/app/lib/gate.ts — one gate, no duplicate
    eval/questions.json  starter question set
    source/              put the source rule PDF here

## Run the app

    cd web
    npm install
    cp .dev.vars.example .dev.vars    # paste your key from console.anthropic.com
    npm run dev                        # http://localhost:5173

`/` redirects to `/ask`.

Note: POST to a root index route does not dispatch to its action in this
React Router version, so the app lives at `/ask` and `/` redirects. Don't move
it back to an index route without retesting form submission.

## Run the tests

    npm test        # from the repo root, no API key needed

Eleven cases covering paraphrase, added words, invented rule numbers,
superseded text, and uncited verdicts.

## Terminal eval harness

    npm install
    cp .env.example .env
    npm run ask         # 10 questions through the loop
    npm run sabotage    # corrupts every citation; all 10 must be stopped

## Corpus status

`web/app/corpus/rules.json` holds **3 rule sections** of 43. It is a stub for
testing the loop. Questions outside those 3 are *supposed* to escalate.

`web/app/corpus/rule-index.json` is the complete manifest of all 43 active
rules (plus 3 rescinded), with per-rule provenance. That file is the phase 1
ingestion checklist.

### Two things found while sourcing the rules

**The text changed in 2023.**

| Version | R 400.9303(2) |
| --- | --- |
| 2020 | "Portable heating devices may be used for up and awake activity, except in bedrooms." |
| 2023 | "Portable heating devices may not be used in bedrooms." |

A gate test asserts the 2020 sentence is rejected.

**The 2023 filing is an amendment set, not the full code.** It contains only
rules that changed. R 400.9304 (smoke detectors), R 400.9418, and R 400.9504
are absent from it because they weren't amended — ingesting from that file
alone would silently drop the smoke detector rule. Use the compiled admin
code, `R 400.9101 to 400.9506`, from LARA's ARS.

## Next

Phase 1: download the compiled admin code PDF into `source/` (egress policy
blocks automated fetching — grab it from a browser), then parse it into all 43
sections matching the shape in `rules.json`.

Then: D1, auth (OTP, parent/specialist roles), specialist portal, PWA.
