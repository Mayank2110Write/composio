// Copies the guide format, scoring rules and library guides from the frontend,
// so both sides resolve and score guides with exactly the same code.
import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = process.env.FE_LIB ?? join(root, "..", "Oauth_FE", "lib");
const to = join(root, "src", "shared");

if (!existsSync(from)) {
  console.error(`Frontend lib not found at ${from}. Set FE_LIB to its path.`);
  process.exit(1);
}
for (const f of ["types.ts", "scoring.ts", "resolve.ts", "intent.ts"]) cpSync(join(from, f), join(to, f));
for (const f of readdirSync(join(from, "guides"))) cpSync(join(from, "guides", f), join(to, "guides", f));
console.log(`Copied shared code from ${from}`);
