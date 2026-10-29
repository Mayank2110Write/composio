// Runs the live agent on apps we have hand-checked guides for and compares the
// verdicts. Usage: npm run eval -- github hubspot notion
// Writes the results to EVALUATION.md.

import { writeFileSync } from "node:fs";
import { runAgent } from "../src/agent/run";
import { LIBRARY } from "../src/shared/guides";
import { WHO } from "../src/shared/intent";
import { computeFacts, levelRange } from "../src/shared/resolve";
import { LEVELS, levelFor } from "../src/shared/scoring";
import type { GuideDoc, Level } from "../src/shared/types";

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ["github", "hubspot", "notion", "slack"];

// Hardest level per audience, across everything the agent might do.
function hardestByAudience(doc: GuideDoc): Record<string, Level> {
  const out: Record<string, Level> = {};
  for (const w of WHO) {
    const levels = doc.does.map((d) => levelFor(computeFacts(doc, { does: [d.id], who: w.id, brand: "yes" })));
    out[w.id] = levels.sort((a, b) => LEVELS[b].rank - LEVELS[a].rank)[0];
  }
  return out;
}

const label = (l: Level) => LEVELS[l].label;
const rows: string[] = [];
const notes: string[] = [];

for (const slug of slugs) {
  const checked = LIBRARY.find((g) => g.slug === slug);
  if (!checked) {
    console.log(`No library guide for ${slug}`);
    continue;
  }
  const started = Date.now();
  process.stdout.write(`${checked.name}… `);
  try {
    const { doc, facts = [] } = await runAgent(checked.domain, () => undefined, { evaluate: true });
    if (!doc) throw new Error("No guide produced");
    const secs = Math.round((Date.now() - started) / 1000);
    const a = hardestByAudience(doc);
    const c = hardestByAudience(checked);
    const agree = WHO.filter((w) => a[w.id] === c[w.id]).length;
    const confirmed = facts.filter((f) => f.verified).length;
    const official = doc.sources.filter((s) => s.kind === "official").length;
    rows.push(
      `| ${checked.name} | ${levelRange(checked).map(label).join(" → ")} | ${levelRange(doc).map(label).join(" → ")} | ${WHO.map((w) => `${a[w.id] === c[w.id] ? "✓" : "✗"} ${w.id}: ${label(a[w.id])}`).join("<br>")} | ${confirmed}/${facts.length} | ${official}/${doc.sources.length} | ${secs}s |`
    );
    notes.push(
      `### ${checked.name}\n\nAgent's main blocker (public): ${doc.blocker.at(-1)?.value.text}\n\nAgent's uses: ${doc.does.map((d) => `${d.label} (${d.scopes.join(", ")})`).join("; ")}\n\nFacts the agent confirmed:\n${facts
        .filter((f) => f.verified)
        .slice(0, 8)
        .map((f) => `- ${f.statement} ([source](${f.url}))`)
        .join("\n")}\n`
    );
    console.log(`done in ${secs}s, ${agree}/3 audiences agree`);
  } catch (e) {
    rows.push(`| ${checked.name} | ${levelRange(checked).map(label).join(" → ")} | failed: ${(e as Error).message} | | | | |`);
    console.log(`failed: ${(e as Error).message}`);
  }
}

const md = `# Agent vs hand-checked guides

Generated ${new Date().toISOString().slice(0, 10)} by \`npm run eval\`. The agent ran the same live pipeline the app uses, without seeing the library guide.

"Hardest level by audience" compares, for each answer to "Who will connect?", the hardest level across the things the agent could do.

| App | Checked guide | Agent | Hardest level by audience | Facts confirmed on page | Provider-doc sources | Time |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

${notes.join("\n")}`;

writeFileSync("EVALUATION.md", md);
console.log("Wrote EVALUATION.md");
