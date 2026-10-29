// Node's ES modules need explicit file extensions on relative imports
// ("./db.js", "./guides/index.js"). TypeScript and tsx resolve them to the .ts
// files. Run on a folder to add any that are missing:
//   node scripts/esm-imports.mjs src scripts
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const IMPORT = /((?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"']+)(["'])/g;

export function fixFile(file) {
  const src = readFileSync(file, "utf8");
  const out = src.replace(IMPORT, (match, head, spec, tail) => {
    if (/\.(m?js|json|css)$/.test(spec)) return match;
    const base = resolve(dirname(file), spec);
    if (existsSync(`${base}.ts`) || existsSync(`${base}.tsx`)) return `${head}${spec}.js${tail}`;
    if (existsSync(join(base, "index.ts"))) return `${head}${spec}/index.js${tail}`;
    return match;
  });
  if (out !== src) writeFileSync(file, out);
  return out !== src;
}

export function fixDir(dir) {
  let changed = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) changed += fixDir(p);
    else if (/\.tsx?$/.test(name) && fixFile(p)) changed++;
  }
  return changed;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("esm-imports.mjs")) {
  const dirs = process.argv.slice(2);
  for (const d of dirs.length ? dirs : ["src"]) console.log(`${d}: ${fixDir(d)} files updated`);
}
