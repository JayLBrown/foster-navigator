/* Catches the build error "Server-only module referenced by client".
 *
 * React Router will not bundle a *.server module into the browser. A route
 * file may import one (its loader/action are stripped from the client build);
 * a shared component may not. tsc does not catch this, and it only surfaces
 * at build time, so check it here where it is cheap.
 */
import fs from "node:fs";
import path from "node:path";

const APP = "web/app";
const problems = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.server\.tsx?$/.test(entry.name)) continue;      // server modules may import each other
    if (full.startsWith(path.join(APP, "routes"))) continue; // routes may: server exports are stripped
    if (full === path.join(APP, "routes.ts")) continue;

    const src = fs.readFileSync(full, "utf8");
    for (const m of src.matchAll(/from\s+["']([^"']*\.server)["']/g)) {
      problems.push(`${full} imports ${m[1]}`);
    }
  }
};

walk(APP);

if (problems.length) {
  console.error("Server-only modules imported from client code:\n");
  for (const p of problems) console.error("  " + p);
  console.error("\nMove the shared value into a non-server module.");
  process.exit(1);
}
console.log("no server-only imports from client code");
