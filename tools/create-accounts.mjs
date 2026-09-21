/* Generates the SQL to create one specialist and one foster parent, with
 * strong random passwords. Prints the SQL to run and the passwords to share.
 *
 *   node tools/create-accounts.mjs \
 *     "erica@agency.org" "Erica Adams" "Agency Name" \
 *     "jay@example.org"  "Jay Brown"   "Washtenaw"
 *
 * Passwords are generated here rather than chosen, and never written to a
 * file — they exist only in this output. Specialists are created this way
 * because self-registration would let anyone become a specialist and start
 * receiving families' escalations.
 */
import { hashPassword } from "../web/app/lib/auth.server.ts";

const [sEmail, sName, sAgency, pEmail, pName, pCounty, fixedPassword] = process.argv.slice(2);
if (!sEmail || !sName || !sAgency || !pEmail || !pName) {
  console.error(
    'usage: node tools/create-accounts.mjs \\\n' +
    '  "<specialist email>" "<Specialist Name>" "<Agency Name>" \\\n' +
    '  "<parent email>" "<Parent Name>" ["<County>"]'
  );
  process.exit(1);
}

const WORDS = "anchor beacon canyon dapple ember fathom garnet harbor indigo juniper kestrel lantern meadow nimbus orchard pewter quarry ripple summit thicket umber velvet willow yonder".split(" ");
const passphrase = () =>
  Array.from({ length: 4 }, () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length])
    .join("-") + "-" + (crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10);

const esc = (s) => String(s).replace(/'/g, "''");
const sId = "spec-" + crypto.randomUUID().slice(0, 8);
const pId = "parent-" + crypto.randomUUID().slice(0, 8);
/* A fixed password is for throwaway test instances only. Anyone who finds
   the URL can sign in, and there is no rate limiting. */
const sPass = fixedPassword || passphrase();
const pPass = fixedPassword || passphrase();

const sql = [
  `INSERT INTO profiles (user_id, role, email, full_name) VALUES ('${sId}', 'specialist', '${esc(sEmail.toLowerCase())}', '${esc(sName)}');`,
  `INSERT INTO specialists (user_id, agency_name, work_email) VALUES ('${sId}', '${esc(sAgency)}', '${esc(sEmail.toLowerCase())}');`,
  `UPDATE profiles SET password_hash = '${await hashPassword(sPass)}' WHERE user_id = '${sId}';`,
  `INSERT INTO profiles (user_id, role, email, full_name) VALUES ('${pId}', 'parent', '${esc(pEmail.toLowerCase())}', '${esc(pName)}');`,
  `INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('${pId}', '${sId}', ${pCounty ? `'${esc(pCounty)}'` : "NULL"});`,
  `UPDATE profiles SET password_hash = '${await hashPassword(pPass)}' WHERE user_id = '${pId}';`,
].join("\n");

console.log("\n=== run this ===\n");
console.log(`cd web && npx wrangler d1 execute foster-navigator --remote --command "${sql.replace(/"/g, '\\"').replace(/\n/g, " ")}"`);
console.log("\n=== credentials to share ===\n");
console.log(`  SPECIALIST  ${sEmail}`);
console.log(`              ${sPass}`);
console.log(`  PARENT      ${pEmail}`);
console.log(`              ${pPass}`);
if (fixedPassword) {
  console.log("  NOTE: shared fixed password. Replace before real data exists.\n");
} else {
  console.log("\nThese are shown once. Nothing wrote them to disk.\n");
}
