# Foster Parent Navigator — session handoff

**Paste this whole file into a new chat to pick up where we left off.**

Written 2026-09-20. Project owner: Jay (jaquanb@umich.edu), University of Michigan.
Submission: Venture 313 AI Buildathon, Sept 17–22 2026.

---

## 1. What this is

A web app that answers Michigan foster parents' licensing questions with a **verdict plus
the verbatim rule text**, and escalates to their assigned licensing specialist when the
rules don't settle the question.

The product thesis is the refusal. Anyone can build something that answers foster care
questions; the thing that makes this credible to an agency is that it **abstains** when it
cannot prove the answer from the rule text. "Insufficient" is a correct outcome, not a bug.

Erica Adams — a real Michigan licensing specialist and Jay's partner on this — has tested
the deployed app and given feedback that shaped the verdict taxonomy (see §6).

---

## 2. Where everything lives

**Repo root: `~/Documents/foster-navigator`** on Jay's Mac (`/Users/jbrown/Documents/foster-navigator`).
Connected to Claude sessions as a folder. **There is no git repo** — nothing is version controlled.

```
foster-navigator/
├── BUILDATHON.md              8-part report on the submission pass
├── DEPLOY.md                  deploy runbook (read before deploying)
├── HANDOFF.md                 this file
├── README.md
├── gate.test.js               30 tests — the verification gate
├── access.test.mjs            25 tests — access control (replaces RLS)
├── auth.test.mjs              59 tests — passwords, sessions, OTP
├── demo.test.mjs              21 tests — the public demo
├── ask.js                     CLI harness for asking questions
├── package.json               `npm test` runs all four suites + the lint
│
├── source/                    ORIGINAL PDFs — the provenance chain
│   ├── R 400.9101 to R 400.9506.pdf     ← THE corpus source (foster family homes)
│   ├── R 400.601 to 400.745.pdf         ← adult foster care — WRONG, do not parse
│   ├── R 400.12101 to 400.12808.pdf     ← child placing agencies — WRONG, do not parse
│   ├── 722-*.pdf, 723.pdf               MDHHS Foster Om Manual (policy, not law)
│   └── fom-txt/*.clean.txt              extracted + hyphen-repaired policy text
│
├── tools/
│   ├── extract.sh             pdftotext -layout (the -layout flag is REQUIRED, see §7)
│   ├── parse-corpus.mjs       PDF text → rules.json
│   ├── verify-corpus.mjs      re-checks every parsed rule against the .clean.txt
│   ├── parse-policy.mjs       FOM → policy.json
│   ├── verify-policy.mjs
│   ├── lint-server-imports.mjs  fails the build if client code imports a *.server module
│   ├── set-password.mjs       prints an UPDATE statement; never writes a password to disk
│   ├── create-accounts.mjs, gen-test-accounts.mjs, seed-remote.mjs
│   └── fetch-fom.sh
│
└── web/                       the React Router v8 app on Cloudflare Workers
    ├── wrangler.jsonc         D1 binding "DB", database_id 5c3f77f3-…
    ├── vite.config.ts         needs resolve.tsconfigPaths: true for ~/ imports
    ├── app/
    │   ├── root.tsx           Layout, meta defaults, ErrorBoundary (404/403)
    │   ├── routes.ts          route table
    │   ├── app.css            Tailwind v4 @theme tokens
    │   ├── corpus/
    │   │   ├── rules.json         101 citable sections across 43 rules
    │   │   ├── rule-index.json
    │   │   └── policy.json        301 FOM sections — PARSED BUT NOT WIRED IN
    │   ├── lib/
    │   │   ├── gate.ts            ★ THE SAFETY MECHANISM — read this first
    │   │   ├── db.server.ts       ★ replaces RLS; every fn takes a `caller`
    │   │   ├── auth.server.ts     PBKDF2-SHA256 via Web Crypto, 100k iterations
    │   │   ├── session.server.ts  hashed session tokens, homeFor(role)
    │   │   ├── signin.server.ts   handleSignIn + devAccounts (http/localhost only)
    │   │   ├── signin-form.tsx    shared two-door sign-in form
    │   │   ├── answer.server.ts   Claude API call
    │   │   ├── corpus.ts          loads rules.json
    │   │   ├── demo.ts            cookie-only demo state, never touches D1
    │   │   ├── config.ts          ★ the deliberately-empty claim slots
    │   │   ├── meta.ts            pageMeta() — OG/Twitter/canonical for every route
    │   │   ├── context.ts         RR v8 RouterContextProvider
    │   │   └── ui.tsx             Shell, buttons, field — CLIENT-SAFE ONLY
    │   ├── site/chrome.tsx        SiteNav, SiteFooter, HomeMark, BackHome, Skyline, Pillar
    │   └── routes/
    │       ├── site.home.tsx      / — the pitch
    │       ├── site.navigator.tsx /navigator — STATIC WALKTHROUGH
    │       ├── demo.tsx           /demo — public, credential-free, real gate
    │       ├── signin.tsx         /signin — Foster Parent Sign In
    │       ├── portal.signin.tsx  /portal/signin — Licensing Specialist Sign In
    │       ├── ask.tsx            /ask — the parent app
    │       ├── requests.tsx       /requests
    │       ├── portal.tsx         /portal — specialist queue
    │       └── portal.detail.tsx  /portal/:id
    ├── migrations/            0001_init → 0007_test_accounts
    └── public/                favicon.svg, social-card.png (1200×630), social-card.svg
```

**Also:** a Claude project named **Venture313** holds `claude/buildathon-submission-pass.md`.

---

## 3. Architecture — the three load-bearing decisions

**1. The verification gate (`web/app/lib/gate.ts`).**
Every quoted passage the model produces is string-matched against the stored rule text
*before display*. No match → the answer is discarded and the question escalates. This is
the wall the whole product leans on. `resolveRule()` handles nested citations —
`R 400.9303(2)` resolving to its parent rule — because exact-string matching alone once
blocked a *correct* answer about corporal punishment.

**2. Access control lives in the query layer, not the database.**
D1 is SQLite and has no row-level security. So `db.server.ts` takes a `caller` on every
function, and a specialist's read is keyed off **the escalation**, never the assignment.
There is deliberately **no function that reads questions by parent** — the privacy property
is enforced by the absence of an API, which `access.test.mjs` asserts.

**3. The corpus is code.**
Versioned files in the repo, ingested offline with human review, never scraped at runtime.
Rules are never UPDATEd — `superseded_at` was designed for this but is not yet implemented.

**Verdict taxonomy** (`gate.ts`): `yes` · `yes_if` · `no` · `no_unless` · `insufficient`.
`yes_if`/`no_unless` must carry conditions or the gate flags them.

---

## 4. Deployed state

- **Live:** https://foster-navigator.jay-a84.workers.dev
- Cloudflare Workers + D1 (`foster-navigator`, id `5c3f77f3-e344-4356-b47d-8024aa0217b3`)
- `ANTHROPIC_API_KEY` is set as a Worker secret. **The key was pasted into a chat on
  2026-09-19 — rotate it at console.anthropic.com.**
- Workers **Paid** is effectively required: PBKDF2 at 100k iterations exceeds the free
  tier's 10ms CPU cap and sign-in fails there.
- Test accounts (`web/migrations/0007_test_accounts.sql`), all password `password`:
  `jbrown@example.com`, `eadams@example.com` (specialist), `erica.parent@example.com`
  (Erica's parent-side account), `mellery@example.com`
- Dev-account listing on sign-in is gated to http/localhost. **If you ever see it over
  https, the gate failed** — that's the canary.

**As of this writing the latest changes are NOT deployed.** The submission pass is
complete and tested but `npm run deploy` has not been run since.

---

## 5. Current status

**135 tests passing, 0 failing** (gate 30, access 25, auth 59, demo 21) plus the
server-import lint. TypeScript clean across all app source.

The submission pass made the product usable by a logged-out judge: a public `/demo` that
runs the real gate against the real corpus with cookie-only state, `/navigator` relabelled
from `LIVE PRODUCT` to `STATIC WALKTHROUGH` with its fake controls made non-interactive,
OG/social metadata, accessibility work, and an error boundary that always offers a way out.
Full detail in `BUILDATHON.md`.

**The demo's three questions** — chosen to show all three outcomes:
heater in a bedroom → `No.` (R 400.9303(2)); overnight stay → `Yes, with conditions.`
(R 400.9413); tattoo/piercing → *insufficient* → escalation. The piercing gap was verified
absent from the corpus first, and `demo.test.mjs` asserts it stays absent — so a future
corpus update fails the test rather than letting the demo quietly lie.

---

## 6. Open items

**Blocking-ish**
1. `npm run typecheck && npm run deploy` on the Mac. Claude cannot build: `node_modules`
   holds macOS arm64 binaries and Claude's shell on the machine is Linux, so rolldown's
   native binding won't load.
2. Verify 390px and 1280px in a real browser. Only statically audited.
3. **No version control.** Consider `git init` before the submission.
4. Rotate the Anthropic API key.

**Three content slots deliberately left empty** — `web/app/lib/config.ts` holds nulls and
the pages render nothing rather than a placeholder. Only Jay can fill them:
- a citable MDHHS figure for children in Michigan foster care
- a real study on first-year foster parent attrition
- `FOUNDER_CONNECTION` — Jay's own connection to this work
- `IMPACT_PILLAR` — the official Venture 313 pillar, once confirmed

**Erica's feedback, partly integrated.** She said "It depends" left too much ambiguity and
that parents need follow-up questions and more definite yeses. That's why `conditional`
was split into `yes_if`/`no_unless` — it was collapsing three different situations into one
mushy answer. Still outstanding: interactive follow-up questions.

**Deferred features:** policy/FOM tier not wired into the app (so sleepover, parenting-time
and school questions correctly escalate); two-tier retrieval; sign-in rate limiting;
`superseded_at` rule versioning; email notifications; PWA / app download.

---

## 7. Traps — things that already went wrong once

- **The wrong PDF was parsed twice** (adult foster care, then child placing agencies) before
  anyone checked the cover page. The gate cannot protect against a corpus of the wrong rules.
  **Verify cover, authority and rule range before parsing anything.**
- **`pdftotext` without `-layout`** silently drops hyphens — "trauma-responsive" became
  "traumaresponsive". `extract.sh` uses `-layout` and rejoins `[a-z]-$` with the next line.
- **The 2020→2023 amendment.** R 400.9303(2)'s text changed and the MDHHS handbook still
  carries the old wording. A gate test asserts the superseded sentence is rejected.
- **The FOM is policy, not law** — it paraphrases the rules. Kept as a separate corpus with
  per-section dates and a `predates_rule_amendment` flag. Do not cite it as a rule.
- **RR v8 root index routes don't dispatch to their own action** — a POST to `/` returned
  405. That's why the parent app lives at `/ask`, not `/`.
- **Route `meta()` replaces the parent's wholesale**, silently dropping the social card.
  Everything goes through `pageMeta()` in `lib/meta.ts` now — keep it that way.
- **`ui.tsx` must stay client-safe.** Importing anything `*.server` from it fails the build
  with a confusing error; `tools/lint-server-imports.mjs` catches it.
- Claude's shell on the Mac is a **Linux VM**, so it can run tests (pure JS) but never
  `npm run build`, `wrangler`, or anything needing the macOS native bindings.

---

## 8. Working preferences

Jay moves fast and pushes back on ceremony — "slow down", "keep it simple", "just use
@example.com". Prefers being shown the actual code over descriptions of it. Wants honest
pushback rather than agreement, and has overruled suggestions (generated passphrases →
just `password`) where the ceremony wasn't worth it. Don't invent statistics, sources,
partnerships, or pilot results for this project under any circumstances — that rule has
been explicit throughout and is why `config.ts` is full of nulls.
