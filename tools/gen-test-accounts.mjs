import fs from "node:fs";
import { hashPassword } from "../web/app/lib/auth.server.ts";

const PW = "password";
const A = "Birchwood Family Services";
const people = [
  { id: "spec-erica",   role: "specialist", email: "eadams@example.com",       name: "Erica Adams" },
  { id: "spec-marcus",  role: "specialist", email: "mellery@example.com",      name: "Marcus Ellery" },
  { id: "parent-jay",   role: "parent",     email: "jbrown@example.com",       name: "Jay Brown",   spec: "spec-erica" },
  { id: "parent-erica", role: "parent",     email: "erica.parent@example.com", name: "Erica Adams", spec: "spec-erica" },
];

const out = [
  "-- Test accounts for the deployed instance. Password for all: password",
  "-- Idempotent: safe to run more than once.",
  "-- Replace before any real foster parent uses this.",
  "",
];

for (const p of people) {
  out.push(`INSERT OR IGNORE INTO profiles (user_id, role, email, full_name) VALUES ('${p.id}', '${p.role}', '${p.email}', '${p.name}');`);
  out.push(`UPDATE profiles SET role = '${p.role}', email = '${p.email}', full_name = '${p.name}', password_hash = '${await hashPassword(PW)}' WHERE user_id = '${p.id}';`);
  if (p.role === "specialist") {
    out.push(`INSERT OR IGNORE INTO specialists (user_id, agency_name, work_email) VALUES ('${p.id}', '${A}', '${p.email}');`);
  } else {
    out.push(`INSERT OR IGNORE INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('${p.id}', '${p.spec}', 'Washtenaw');`);
    out.push(`UPDATE parent_profiles SET specialist_user_id = '${p.spec}' WHERE user_id = '${p.id}';`);
  }
  out.push("");
}
out.push("SELECT role, email, full_name, CASE WHEN password_hash IS NULL THEN 'NO PW' ELSE 'ok' END AS pw FROM profiles ORDER BY role, email;");

fs.writeFileSync("web/migrations/0007_test_accounts.sql", out.join("\n") + "\n");
console.log("wrote web/migrations/0007_test_accounts.sql");
