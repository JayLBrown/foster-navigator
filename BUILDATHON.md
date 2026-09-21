# Buildathon submission pass — completion report

Venture 313 AI Buildathon · Foster Parent Navigator
Pass completed 2026-09-20. **Not deployed** — the spec said not to, and nothing here has shipped.

---

## 1. What a logged-out judge can now do

Before this pass, a judge who opened the site could read about the product but could not
use it — every path ended at a sign-in wall. There are now three doors from the homepage:

| Door | Route | What it is |
|---|---|---|
| **Try the demo** (primary CTA) | `/demo` | Working product, no credentials, no database |
| **Product walkthrough** | `/navigator` | Static, labelled screen-by-screen explanation |
| Sign in | `/signin`, `/portal/signin` | The real app, for Erica and for testing |

`/demo` is linked from the hero, the header nav, the footer, both walkthrough CTAs,
both sign-in pages, and the error page. A judge cannot miss it.

## 2. The demo is real, and it is honest

The demo runs the **actual verification gate against the actual corpus** — not a
scripted animation. Three questions, chosen to show all three outcomes:

- **Portable heater in a bedroom** → `No.` · R 400.9303(2)
- **Overnight stay with a relative** → `Yes, with conditions.` · three conditions, R 400.9413(1)(2)(3)
- **Tattoo or piercing** → *insufficient* → escalates to a specialist

The third one matters most. I probed the corpus first and confirmed piercing is
genuinely absent from it, so the escalation a judge sees is a real abstention, not a
staged one. `demo.test.mjs` asserts this — if a future corpus update ever adds a
piercing rule, that test fails rather than letting the demo quietly lie.

State lives in a cookie scoped to `/demo`, capped at 12 questions and 300 characters.
**The demo never touches D1.** It cannot read, write, or reach a real specialist.

## 3. Claims: what I would not write

Per the spec, I invented nothing. Where a credible page would normally carry a number,
`app/lib/config.ts` holds a null or an empty array, and the page renders *nothing* rather
than a placeholder:

```ts
export const IMPACT_PILLAR = null;        // the official Venture 313 pillar
export const FOUNDER_CONNECTION = null;   // why you, specifically
export const VERIFIED_STATS = [];         // needs a citable MDHHS figure
```

Only two statistics appear on the site, and both are facts about the corpus that I can
verify by counting: **43 rules, 101 citable sections.** The Expected Impact section labels
every measure `PILOT TARGET`. The Market section says, in the page itself, that it is
*"stated as a hypothesis, not a result."*

**Three slots are still empty and only you can fill them:** a citable figure for children
in Michigan foster care, a real study on first-year foster parent attrition, and your own
connection to this work. Funders back founders; the last one is the one nobody else can write.

## 4. `/navigator` stopped pretending to be the product

It was badged `LIVE PRODUCT` with a fake input box and fake buttons — a judge could click
them and nothing would happen. It is now badged `STATIC WALKTHROUGH`, the fake controls are
non-interactive `<p>` elements with dashed borders, and its escalation example uses the
piercing question so that no single question is shown producing two different outcomes on
two different pages.

## 5. Privacy held under demo pressure

The demo is now a single surface — the foster parent's. The confirmation screen a parent
reaches after sending a question carries the boundary directly: it compares *questions
asked* against *questions sent*, so the property is visible rather than asserted, and it
shows a sample of the notification the live product would send ("your licensing specialist
has received your question"), plainly labelled as sent to nobody. This mirrors the real
system, where `db.server.ts` keys specialist reads off the **escalation**, never the
assignment, and there is deliberately no function that reads questions by parent.

The signed-in surfaces — `/ask`, `/requests`, `/portal` — still exist and are still covered
by the access and auth suites, but nothing in the public site links to them: a judge has one
door, the demo. Sign-in pages list development accounts only over `http`/localhost — never on
the deployed Worker. No API key appears in tracked source; `.dev.vars` is gitignored. I
checked both.

## 5b. Triage: not every unanswered question is a refusal

The demo routed anything it did not recognise to "Specialist review needed" — "hi"
included. That is three different situations sharing one off-ramp, and the default was the
most expensive one. It also cheapened the refusal: when junk produces the same screen as
the piercing question, abstention reads as the app not understanding rather than as a
principled limit.

`triage()` separates them. Input that is not a licensing question never leaves the ask
screen, and never spends a model call. Everything else is a real question: the demo runs the
same model call and the same verification gate a signed-in parent gets, and only a genuine
corpus gap — or an answer the gate refuses to certify — reaches a person. Three sample
questions short-circuit to pre-written, gate-checked answers so the common path is instant
and free, and matching is on meaning-bearing terms, so "can I use portable heater" hits that
cache rather than the model.

A judge can therefore ask the demo anything, and watch it refuse when it cannot prove the
answer. The route is public and unauthenticated, so a per-browser budget caps live calls;
the durable limit is a rate limit at the edge, noted in DEPLOY.md.

## 6. Accessibility and chrome

- Every form input has a stable `id` with a matching `htmlFor` label
- Visible `focus-visible` rings on every interactive element
- `← Back to home` on both sign-in pages, the demo, and the error page
- The logo is always a link home
- The compact nav is a keyboard-accessible `<details>/<summary>`, not a JS-only menu
- `aria-current="page"` on the active nav item; `role="alert"` on sign-in errors
- The error boundary now handles 404 and 403 distinctly and always offers a way out

## 7. Social card, metadata, and one bug that was hiding

React Router replaces a parent's `meta()` wholesale when a route exports its own — so the
homepage, the page most likely to be shared with a judge, would have silently dropped its
social card. Every route now builds its tags through one `pageMeta()` helper in
`app/lib/meta.ts`: title, description, Open Graph, Twitter card, and a canonical URL.
Sign-in and demo routes carry `noindex`. A 1200×630 card and a favicon are in `public/`.

Two **pre-existing JSX structure bugs** surfaced during the typecheck — an unclosed `<div>`
in the problem section and a duplicated `</div>` in the "Working today" section, both from
the earlier editing pass. Both are fixed. They would have failed your build.

## 8. Verification — and the one thing you have to run

```
tools/lint-server-imports.mjs   no server-only imports from client code
gate.test.js                    30 passed
access.test.mjs                 25 passed
auth.test.mjs                   59 passed
demo.test.mjs                   21 passed
                                ---------------
                                135 passed, 0 failed
```

`demo.test.mjs` is now wired into `npm test`; it wasn't before.

TypeScript is clean across all application source. One error remains —
`Cannot find module 'virtual:react-router/server-build'` — and it is an artifact of my
having cleared the stale `.react-router/` type cache, which still referenced a route you
renamed days ago. `react-router typegen` regenerates it.

**`npm run build` has not been run.** It cannot run from here: `node_modules` holds macOS
arm64 binaries and my shell on your machine is Linux, so rolldown's native binding won't
load. On your Mac:

```sh
cd ~/Documents/foster-navigator/web
npm run typecheck   # regenerates .react-router/, should be silent
npm run build
```

Also unverified for the same reason: **horizontal overflow at 390px and 1280px**. I audited
it statically instead — no fixed widths, no `min-w-`, no `whitespace-nowrap`, no `overflow-x`,
every multi-column grid gated behind `lg:`, the only SVG scaled by `viewBox` with `w-full`,
and no rendered word long enough to break the 342px content box at 390px. That is good
evidence, not proof. Open the demo and the homepage in a narrow window before you present.

---

## Not done, and deliberately

- **Not deployed.** Awaiting your word.
- The policy/FOM tier is parsed and verified but not wired into the app
- Two-tier retrieval, sign-in rate limiting, `superseded_at`, email, PWA — all still deferred
