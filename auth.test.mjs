/* Auth tests for web/app/lib/auth.server.ts against the real schema. */
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  requestCode, verifyCode, callerFromToken, destroySession,
  readSessionCookie, setSessionCookie, clearSessionCookie, SESSION_COOKIE,
  hashPassword, checkPassword, signInWithPassword,
} from "./web/app/lib/auth.server.ts";

const wrap = (sqlite) => ({
  prepare(sql) {
    return {
      bind(...values) {
        const stmt = sqlite.prepare(sql);
        return {
          async all() { return { results: stmt.all(...values) }; },
          async first() { return stmt.get(...values) ?? null; },
          async run() { return stmt.run(...values); },
        };
      },
    };
  },
});

const sqlite = new DatabaseSync(":memory:");
for (const f of ["0001_init.sql", "0002_seed_dev.sql", "0003_auth.sql", "0004_passwords.sql", "0005_seed_passwords.sql"])
  sqlite.exec(fs.readFileSync(`web/migrations/${f}`, "utf8"));
const db = wrap(sqlite);

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

const PARENT = "jay@example.org";
const SPEC = "erica@example-cpa.org";

console.log("\n--- requesting a code ---");
const req = await requestCode(db, PARENT, { exposeCodeForDev: true });
check("reports sent", req.sent, true);
check("code is six digits", /^\d{6}$/.test(req.devCode ?? ""), true);

const stored = sqlite.prepare("SELECT code_hash FROM otp_codes WHERE email = ?").get(PARENT);
check("code is NOT stored in plaintext", stored.code_hash === req.devCode, false);
check("code hash is sha-256 length", stored.code_hash.length, 64);

const unknown = await requestCode(db, "nobody@nowhere.org", { exposeCodeForDev: true });
check("unknown email still reports sent", unknown.sent, true);
check("unknown email produces no code", unknown.devCode, undefined);
check("unknown email writes no row", sqlite.prepare("SELECT COUNT(*) c FROM otp_codes WHERE email = ?").get("nobody@nowhere.org").c, 0);

console.log("\n--- case and whitespace ---");
const mixed = await requestCode(db, "  JAY@Example.ORG  ", { exposeCodeForDev: true });
const v0 = await verifyCode(db, "Jay@Example.org", mixed.devCode);
check("email is normalized on both sides", v0.ok, true);

console.log("\n--- wrong codes ---");
const r1 = await requestCode(db, PARENT, { exposeCodeForDev: true });
check("wrong code rejected", (await verifyCode(db, PARENT, "000000")).ok === false, true);
check("correct code still works after a miss", (await verifyCode(db, PARENT, r1.devCode)).ok, true);

console.log("\n--- attempt cap ---");
const r2 = await requestCode(db, PARENT, { exposeCodeForDev: true });
const wrong = r2.devCode === "111111" ? "222222" : "111111";
for (let i = 0; i < 5; i++) await verifyCode(db, PARENT, wrong);
const capped = await verifyCode(db, PARENT, r2.devCode);
check("correct code refused after 5 failures", capped.ok, false);
check("reason is too_many_attempts", capped.reason, "too_many_attempts");

console.log("\n--- single use ---");
const r3 = await requestCode(db, PARENT, { exposeCodeForDev: true });
check("first use succeeds", (await verifyCode(db, PARENT, r3.devCode)).ok, true);
check("replay refused", (await verifyCode(db, PARENT, r3.devCode)).ok, false);

console.log("\n--- superseding ---");
const old = await requestCode(db, PARENT, { exposeCodeForDev: true });
const fresh = await requestCode(db, PARENT, { exposeCodeForDev: true });
check("older code no longer works", (await verifyCode(db, PARENT, old.devCode)).ok, false);
check("newest code works", (await verifyCode(db, PARENT, fresh.devCode)).ok, true);

console.log("\n--- expiry ---");
const exp = await requestCode(db, PARENT, { exposeCodeForDev: true });
sqlite.prepare("UPDATE otp_codes SET expires_at = ? WHERE email = ? AND consumed_at IS NULL")
  .run(new Date(Date.now() - 60_000).toISOString(), PARENT);
const expired = await verifyCode(db, PARENT, exp.devCode);
check("expired code refused", expired.ok, false);
check("reason is expired", expired.reason, "expired");

console.log("\n--- sessions ---");
const ok = await verifyCode(db, PARENT, (await requestCode(db, PARENT, { exposeCodeForDev: true })).devCode);
check("session issued", ok.ok, true);
check("caller is the parent", ok.caller.userId, "parent-jay");
check("role is parent", ok.caller.role, "parent");

const sess = sqlite.prepare("SELECT token_hash FROM sessions").all();
check("token is NOT stored in plaintext", sess.some((s) => s.token_hash === ok.token), false);

const me = await callerFromToken(db, ok.token);
check("token resolves to the signed-in user", me.userId, "parent-jay");
check("full name comes back", me.fullName, "Jay Brown");
check("garbage token resolves to nobody", await callerFromToken(db, "not-a-token"), null);
check("null token resolves to nobody", await callerFromToken(db, null), null);

console.log("\n--- specialist role ---");
const se = await verifyCode(db, SPEC, (await requestCode(db, SPEC, { exposeCodeForDev: true })).devCode);
check("specialist signs in", se.ok, true);
check("role is specialist", se.caller.role, "specialist");

console.log("\n--- sign out ---");
const before = sqlite.prepare("SELECT COUNT(*) c FROM sessions").get().c;
await destroySession(db, ok.token);
const after = sqlite.prepare("SELECT COUNT(*) c FROM sessions").get().c;
check("session gone after sign out", await callerFromToken(db, ok.token), null);
check("exactly one row deleted server-side", before - after, 1);
check("other sessions untouched", (await callerFromToken(db, se.token)).role, "specialist");

console.log("\n--- expired session ---");
sqlite.prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?")
  .run(new Date(Date.now() - 1000).toISOString(), "spec-erica");
const specSessions = () => sqlite.prepare("SELECT COUNT(*) c FROM sessions WHERE user_id = ?").get("spec-erica").c;
check("specialist session exists before expiry check", specSessions() > 0, true);
check("expired session refused", await callerFromToken(db, se.token), null);
check("expired session row cleaned up on read", specSessions(), 0);

console.log("\n--- cookie handling ---");
const req2 = new Request("https://x/", { headers: { Cookie: `other=1; ${SESSION_COOKIE}=abc.def; more=2` } });
check("reads our cookie among others", readSessionCookie(req2), "abc.def");
check("no cookie header is fine", readSessionCookie(new Request("https://x/")), null);
const c = setSessionCookie("tok", true);
check("cookie is HttpOnly", c.includes("HttpOnly"), true);
check("cookie is SameSite=Lax", c.includes("SameSite=Lax"), true);
check("cookie is Secure in production", c.includes("Secure"), true);
check("cookie is not Secure on localhost", setSessionCookie("tok", false).includes("Secure"), false);
check("clearing expires the cookie", clearSessionCookie(false).includes("Max-Age=0"), true);

console.log("\n--- passwords ---");
const h = await hashPassword("correct horse");
check("hash is pbkdf2 format", h.startsWith("pbkdf2$100000$"), true);
check("hash does not contain the password", h.includes("correct horse"), false);
check("correct password verifies", await checkPassword("correct horse", h), true);
check("wrong password rejected", await checkPassword("wrong horse", h), false);
check("empty password rejected", await checkPassword("", h), false);
const h2 = await hashPassword("correct horse");
check("same password hashes differently (salted)", h === h2, false);
check("both salted hashes verify", (await checkPassword("correct horse", h2)), true);
check("malformed stored hash rejected", await checkPassword("x", "notahash"), false);

console.log("\n--- password sign-in ---");
const good = await signInWithPassword(db, "jay@example.org", "navigator");
check("seeded parent signs in", good.ok, true);
check("resolves to the right user", good.caller.userId, "parent-jay");
check("role is parent", good.caller.role, "parent");
check("session works", (await callerFromToken(db, good.token)).fullName, "Jay Brown");

const spec2 = await signInWithPassword(db, "erica@example-cpa.org", "navigator");
check("seeded specialist signs in", spec2.ok, true);
check("role is specialist", spec2.caller.role, "specialist");

check("wrong password refused", (await signInWithPassword(db, "jay@example.org", "nope")).ok, false);
check("unknown email refused", (await signInWithPassword(db, "nobody@nowhere.org", "navigator")).ok, false);
check("email case is ignored", (await signInWithPassword(db, "JAY@Example.ORG", "navigator")).ok, true);
check("empty password refused", (await signInWithPassword(db, "jay@example.org", "")).ok, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
