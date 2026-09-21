/* Access-control tests for web/app/lib/db.server.ts
 *
 * D1 has no row-level security, so these assertions are the only thing
 * standing between a specialist and a family's entire question history.
 * Runs against the real migration on an in-memory SQLite database.
 *
 *   node access.test.mjs
 */
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  createQuestion, listMyQuestions, createEscalation, listMyEscalations,
  listAssignedEscalations, getAssignedEscalation, respondToEscalation,
  closeOffline, AccessDenied,
} from "./web/app/lib/db.server.ts";

/* --- shim giving node:sqlite the D1 surface db.server.ts expects --- */
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
sqlite.exec(fs.readFileSync("web/migrations/0001_init.sql", "utf8"));
const db = wrap(sqlite);

/* --- fixtures --- */
const SPEC = "spec-1", SPEC2 = "spec-2", PARENT = "parent-1", PARENT2 = "parent-2";
const ins = (sql, ...v) => sqlite.prepare(sql).run(...v);

for (const [uid, role, email, name] of [
  [SPEC, "specialist", "dana@agency.org", "Dana Whitfield"],
  [SPEC2, "specialist", "other@agency.org", "Other Specialist"],
  [PARENT, "parent", "jay@example.org", "Jay Brown"],
  [PARENT2, "parent", "kim@example.org", "Kim Reed"],
]) ins("INSERT INTO profiles (user_id, role, email, full_name) VALUES (?,?,?,?)", uid, role, email, name);

ins("INSERT INTO specialists (user_id, agency_name, work_email) VALUES (?,?,?)", SPEC, "Example CPA", "dana@agency.org");
ins("INSERT INTO specialists (user_id, agency_name, work_email) VALUES (?,?,?)", SPEC2, "Example CPA", "other@agency.org");
ins("INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES (?,?,?)", PARENT, SPEC, "Washtenaw");
ins("INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES (?,?,?)", PARENT2, SPEC2, "Wayne");

const parent = { userId: PARENT, role: "parent" };
const parent2 = { userId: PARENT2, role: "parent" };
const specialist = { userId: SPEC, role: "specialist" };
const specialist2 = { userId: SPEC2, role: "specialist" };

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const denies = async (name, fn) => {
  try { await fn(); fail++; console.log(`FAIL  ${name}\n        expected AccessDenied, none thrown`); }
  catch (e) {
    const ok = e instanceof AccessDenied;
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        threw ${e.constructor.name}: ${e.message}`}`);
  }
};

/* --- the scenario from the architecture doc:
       a parent with ten questions and one escalation --- */
const qids = [];
for (let i = 1; i <= 10; i++) {
  qids.push(await createQuestion(db, parent, {
    body: `Private question number ${i} that the specialist must never see`,
    verdict: "insufficient",
  }));
}
const esc = await createEscalation(db, parent, {
  questionId: qids[4],
  sharedPayload: "Can a foster child share a bedroom with my own child?",
  reason: "The rules do not provide one definite answer.",
});

console.log("\n--- the rule that replaces RLS ---");
check("parent sees all ten of their own questions", (await listMyQuestions(db, parent)).length, 10);
check("SPECIALIST SEES EXACTLY ONE", (await listAssignedEscalations(db, specialist)).length, 1);

const detail = await getAssignedEscalation(db, specialist, esc.id);
check("specialist sees the escalated payload", detail.shared_payload, "Can a foster child share a bedroom with my own child?");
check("specialist sees the parent's name", detail.parent_name, "Jay Brown");
check("escalated question body is NOT exposed", detail.body, undefined);

console.log("\n--- cross-tenant isolation ---");
check("other specialist's queue is empty", (await listAssignedEscalations(db, specialist2)).length, 0);
await denies("other specialist cannot open this escalation", () => getAssignedEscalation(db, specialist2, esc.id));
await denies("other specialist cannot respond to it", () => respondToEscalation(db, specialist2, esc.id, "sneaky"));
await denies("other specialist cannot close it offline", () => closeOffline(db, specialist2, esc.id));
check("other parent sees none of these questions", (await listMyQuestions(db, parent2)).length, 0);
check("other parent sees no escalations", (await listMyEscalations(db, parent2)).length, 0);

console.log("\n--- role boundaries ---");
await denies("specialist cannot list questions", () => listMyQuestions(db, specialist));
await denies("specialist cannot ask a question", () => createQuestion(db, specialist, { body: "x" }));
await denies("specialist cannot escalate", () => createEscalation(db, specialist, { questionId: qids[0], sharedPayload: "x", reason: "x" }));
await denies("parent cannot read a specialist queue", () => listAssignedEscalations(db, parent));
await denies("parent cannot open an escalation as specialist", () => getAssignedEscalation(db, parent, esc.id));
await denies("parent cannot respond to their own escalation", () => respondToEscalation(db, parent, esc.id, "x"));
await denies("parent cannot escalate another parent's question", () => createEscalation(db, parent2, { questionId: qids[0], sharedPayload: "x", reason: "x" }));

console.log("\n--- the snapshot survives reassignment ---");
ins("UPDATE parent_profiles SET specialist_user_id = ? WHERE user_id = ?", SPEC2, PARENT);
check("escalation still belongs to the original specialist", (await listAssignedEscalations(db, specialist)).length, 1);
check("new specialist does not inherit the old escalation", (await listAssignedEscalations(db, specialist2)).length, 0);
ins("UPDATE parent_profiles SET specialist_user_id = ? WHERE user_id = ?", SPEC, PARENT);

console.log("\n--- responding ---");
await respondToEscalation(db, specialist, esc.id, "Yes, if the bedroom meets the square footage requirement.");
const after = await listMyEscalations(db, parent);
check("parent sees the response", after[0].response_body, "Yes, if the bedroom meets the square footage requirement.");
check("status is answered", after[0].status, "answered");
check("parent sees who answered", after[0].specialist_name, "Dana Whitfield");
check("answered escalation leaves the open queue", (await listAssignedEscalations(db, specialist)).length, 0);
check("but is still visible in the full queue", (await listAssignedEscalations(db, specialist, "all")).length, 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
