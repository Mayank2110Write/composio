import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vercel runs the compiled code with plain Node, which rejects relative ES
// module imports without a file extension. tsx and vitest don't, so check here.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(n) ? [p] : [];
  });
}

describe("ES module imports", () => {
  it("every relative import names its .js file", () => {
    const bad: string[] = [];
    for (const f of files(join(__dirname))) {
      for (const m of readFileSync(f, "utf8").matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        if (!m[1].endsWith(".js")) bad.push(`${f}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
