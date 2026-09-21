/* Prints the SQL to set a password for a seeded account.
 *
 *   node tools/set-password.mjs erica@example-cpa.org "some password"
 *
 * Then run the printed statement through:
 *   cd web && npx wrangler d1 execute foster-navigator --local --command "<sql>"
 */
import { hashPassword } from "../web/app/lib/auth.server.ts";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node tools/set-password.mjs <email> "<password>"');
  process.exit(1);
}
const hash = await hashPassword(password);
console.log(`UPDATE profiles SET password_hash = '${hash}' WHERE email = '${email}';`);
