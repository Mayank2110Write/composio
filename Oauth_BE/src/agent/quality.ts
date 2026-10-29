import type { Written } from "./prompts";

// Checks a draft is complete enough to follow. Returned as feedback to the writer.
export function writtenProblems(w: Written): string[] {
  const problems: string[] = [];
  const steps = w.phases.flatMap((p) => p.steps);
  if (steps.length < 6) problems.push(`Only ${steps.length} steps. Write 7-12 covering registration, configuration, testing and approval.`);
  if (w.does.length < 2) problems.push("Give 2-4 'does' options with different levels of access.");
  const durations = [w.timing.noReview, w.timing.review, w.timing.audit].map((t) => t.workText);
  if (durations.some((d) => !/\d|unknown|none/i.test(d))) problems.push("Timing workText must be a duration range like '1-2 hours', not a description.");
  if (!steps.some((s) => s.fields.some((f) => f.value.includes("{{callback}}")))) problems.push("Include a step with a redirect URL field whose value is {{callback}}.");
  return problems;
}
