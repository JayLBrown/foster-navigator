# Deploying to Cloudflare

Run these on your Mac. Claude's sandbox cannot run wrangler (macOS binaries)
or reach Cloudflare.

## Before you start

**Workers Paid ($5/mo) is effectively required.** Password hashing uses PBKDF2
at 100,000 iterations, roughly 50-100ms of CPU. The free tier caps CPU at 10ms
per request, so sign-in fails there.

The alternative is setting `PBKDF2_ITERATIONS` lower as a Worker variable.
That is a real reduction in resistance to offline password cracking — take the
$5 instead unless you have a reason not to.

## 1. Authenticate

    cd web
    npx wrangler login

## 2. Create the production database

    npx wrangler d1 create foster-navigator

Copy the `database_id` it prints into `wrangler.jsonc`, replacing
`00000000-0000-4000-8000-000000000001`. That placeholder only ever worked
locally.

## 3. Create the schema (no dev seed)

    npm run db:setup:remote

This applies the schema and auth tables only. It deliberately skips
`0002_seed_dev.sql` and `0005_seed_passwords.sql` — those create Jay Brown,
Erica Adams and the shared password `navigator`, which must never exist on a
deployed instance.

## 4. Create real accounts

Copy `migrations/0006_prod_accounts.sql.example` to
`migrations/0006_prod_accounts.sql`, fill in real names and emails, then:

    npx wrangler d1 execute foster-navigator --remote --file=./migrations/0006_prod_accounts.sql

Set each password separately, so no password is ever written to a file that
could be committed:

    node ../tools/set-password.mjs you@example.org "a long passphrase"
    # paste the printed SQL:
    npx wrangler d1 execute foster-navigator --remote --command "UPDATE profiles SET ..."

## 5. Set the API key as a secret

    npm run secret:key

Paste the key when prompted. It is stored encrypted by Cloudflare. Never put
it in `wrangler.jsonc` — that file is meant to be committed.

## 6. Deploy

    npm run deploy

You get a `*.workers.dev` URL. Send that to your tester.

## After deploying

- **Rotate the key** if it has been pasted anywhere it shouldn't live.
- **Check the spend limit** at console.anthropic.com. Every question costs money.
- Confirm the sign-in page does NOT list accounts. That listing is gated to
  http/localhost; seeing it on https means the gate failed.

## What your tester should know

- **Policy questions escalate.** The FOM corpus is parsed but not wired in, so
  sleepovers, parenting time and school questions correctly go to review.
- **Escalations do not send email.** To see one, sign in as the specialist.
- **`/demo` calls the Anthropic API and needs no credentials.** Before sharing the link
  publicly, add a Cloudflare rate limit: dashboard → the zone → Security → WAF → Rate
  limiting rules → a rule matching the `/demo` path on POST, a few requests per minute per
  IP. The in-app `LIVE_BUDGET` is per browser cookie and a visitor can clear it; this is the
  limit they cannot. Watch spend at console.anthropic.com for the first day it is live.
- **Questions are stored.** There is no PII scrubbing yet and no retention
  policy. Test with invented scenarios, not real case details.
