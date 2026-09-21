import { hashPassword } from "../web/app/lib/auth.server.ts";

const PW = "password";
const h = async () => await hashPassword(PW);

const AGENCY = "Birchwood Family Services";
const rows = [];

/* Erica as licensing specialist */
rows.push(`INSERT INTO profiles (user_id, role, email, full_name) VALUES ('spec-erica', 'specialist', 'eadams@example.com', 'Erica Adams');`);
rows.push(`INSERT INTO specialists (user_id, agency_name, work_email) VALUES ('spec-erica', '${AGENCY}', 'eadams@example.com');`);
rows.push(`UPDATE profiles SET password_hash = '${await h()}' WHERE user_id = 'spec-erica';`);

/* Erica as a foster parent, assigned to her own specialist account so she can
   walk the full loop alone: ask, escalate, switch logins, answer. */
rows.push(`INSERT INTO profiles (user_id, role, email, full_name) VALUES ('parent-erica', 'parent', 'erica.parent@example.com', 'Erica Adams');`);
rows.push(`INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('parent-erica', 'spec-erica', 'Washtenaw');`);
rows.push(`UPDATE profiles SET password_hash = '${await h()}' WHERE user_id = 'parent-erica';`);

/* Jay as a foster parent on Erica's caseload */
rows.push(`INSERT INTO profiles (user_id, role, email, full_name) VALUES ('parent-jay', 'parent', 'jbrown@example.com', 'Jay Brown');`);
rows.push(`INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('parent-jay', 'spec-erica', 'Washtenaw');`);
rows.push(`UPDATE profiles SET password_hash = '${await h()}' WHERE user_id = 'parent-jay';`);

/* A second specialist with no caseload: signing in as Marcus shows an empty
   queue while Jay and Erica have questions, which demonstrates that a
   specialist cannot see a family they were not sent. */
rows.push(`INSERT INTO profiles (user_id, role, email, full_name) VALUES ('spec-marcus', 'specialist', 'mellery@example.com', 'Marcus Ellery');`);
rows.push(`INSERT INTO specialists (user_id, agency_name, work_email) VALUES ('spec-marcus', '${AGENCY}', 'mellery@example.com');`);
rows.push(`UPDATE profiles SET password_hash = '${await h()}' WHERE user_id = 'spec-marcus';`);

console.log("\n=== run this ===\n");
console.log(`cd web && npx wrangler d1 execute foster-navigator --remote --command "${rows.join(" ").replace(/"/g, '\\"')}"`);
console.log("\n=== accounts (all password: password) ===\n");
console.log("  /signin");
console.log("    jbrown@example.com         Jay Brown            parent, Erica's caseload");
console.log("    erica.parent@example.com   Erica Adams          parent, her own caseload");
console.log("\n  /portal/signin");
console.log("    eadams@example.com         Erica Adams          specialist, 2 families");
console.log("    mellery@example.com        Marcus Ellery        specialist, no caseload\n");
