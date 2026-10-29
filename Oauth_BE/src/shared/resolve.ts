// Turns a stored guide plus the developer's three answers into the guide they
// read. Pure and deterministic: the backend runs the same function when it
// saves a generated guide.

import { confidenceFor, levelFor, levelReasons } from "./scoring";
import type {
  AppSummary,
  Conditional,
  Facts,
  GuideDoc,
  Intent,
  Level,
  ResolvedGuide,
  Variants,
  When,
} from "./types";
import { BRAND, WHO } from "./intent";

export const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";

type Ctx = { intent: Intent; facts?: Facts };

export function matches(when: When | undefined, { intent, facts }: Ctx): boolean {
  if (!when) return true;
  if (when.does && !when.does.some((d) => intent.does.includes(d))) return false;
  if (when.who && !when.who.includes(intent.who)) return false;
  if (when.brand && !when.brand.includes(intent.brand)) return false;
  if (facts) {
    if (when.review && !when.review.includes(facts.review)) return false;
    if (when.capped !== undefined && when.capped !== Boolean(facts.cap)) return false;
  }
  return true;
}

function pick<T>(variants: Variants<T>, ctx: Ctx, fallback: T): T {
  return variants.find((v) => matches(v.when, ctx))?.value ?? fallback;
}

function keep<T>(items: Conditional<T>[], ctx: Ctx): T[] {
  return items.filter((i) => matches(i.when, ctx)).map(({ when: _when, ...rest }) => rest as T);
}

const REVIEW_RANK = { none: 0, review: 1, audit: 2 } as const;

// Rules that match are combined, keeping the strictest review, so picking
// several things the agent will do lands on the hardest requirement among them.
export function computeFacts(doc: GuideDoc, intent: Intent): Facts {
  const facts: Facts = { review: "none", cap: null, publicReach: intent.who === "public" };
  for (const rule of doc.factRules) {
    if (!matches(rule.when, { intent })) continue;
    const { review, cap, publicReach } = rule.set;
    if (review && REVIEW_RANK[review] > REVIEW_RANK[facts.review]) facts.review = review;
    if (cap !== undefined) facts.cap = cap;
    if (publicReach !== undefined) facts.publicReach = publicReach;
  }
  return facts;
}

function listJoin(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function fillTemplates<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") {
    return value.replace(/\{\{([\w.]+)\}\}/g, (m, key: string) => vars[key] ?? m) as T;
  }
  if (Array.isArray(value)) return value.map((v) => fillTemplates(v, vars)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillTemplates(v, vars)])
    ) as T;
  }
  return value;
}

export function resolveGuide(doc: GuideDoc, intent: Intent): ResolvedGuide {
  const picked = doc.does.filter((d) => intent.does.includes(d.id));
  const doesOptions = picked.length ? picked : doc.does.slice(0, 1);
  intent = { ...intent, does: doesOptions.map((d) => d.id) };
  const facts = computeFacts(doc, intent);
  const ctx: Ctx = { intent, facts };
  const level = levelFor(facts);
  const keySources = pick(doc.keySources, ctx, []);

  const scopes = [...new Set(doesOptions.flatMap((d) => d.scopes))];
  const optional = scopes.filter((s) => / \(optional\)$/.test(s)).map((s) => s.replace(/ \(optional\)$/, ""));
  const required = scopes.filter((s) => !/ \(optional\)$/.test(s) && !optional.includes(s));
  const vars: Record<string, string> = {
    scopes: scopes.join(", "),
    requiredScopesJson: JSON.stringify(required),
    optionalScopesJson: JSON.stringify(optional),
    does: listJoin(doesOptions.map((d) => d.label)),
    doesLower: listJoin(doesOptions.map((d) => lowerFirst(d.label))),
    doesNote: [...new Set(doesOptions.map((d) => d.note).filter(Boolean))].join(" "),
    callback: COMPOSIO_CALLBACK,
    who: WHO.find((w) => w.id === intent.who)!.label,
    brand: BRAND.find((b) => b.id === intent.brand)!.label,
  };
  for (const [name, variants] of Object.entries(doc.vars ?? {})) {
    vars[`var.${name}`] = pick(variants, ctx, "");
  }

  const resolved: ResolvedGuide = {
    slug: doc.slug,
    name: doc.name,
    domain: doc.domain,
    category: doc.category,
    tagline: doc.tagline,
    origin: doc.origin,
    lastVerified: doc.lastVerified,
    intent,
    doesOptions,
    does: doc.does,
    facts,
    level,
    reasons: doc.reasons ? pick(doc.reasons, ctx, levelReasons(facts)) : levelReasons(facts),
    confidence: confidenceFor(doc.sources, keySources),
    canSkipOwnApp: doc.managed.available === true && intent.brand === "no",
    managed: doc.managed,
    timing: pick(doc.timing, ctx, {
      work: { text: "Unknown", hours: 0 },
      wait: { text: "Unknown", days: 0 },
      buffer: null,
    }),
    cost: pick(doc.cost, ctx, "Unknown"),
    blocker: pick(doc.blocker, ctx, { text: "No main blocker found.", src: "" }),
    keySources,
    choices: keep(doc.choices, ctx),
    prerequisites: keep(doc.prerequisites, ctx),
    phases: doc.phases
      .filter((p) => matches(p.when, ctx))
      .map((p) => ({
        name: p.name,
        steps: keep(p.steps, ctx).map((s) => ({ ...s, id: `${slugify(p.name)}--${slugify(s.title)}` })),
      }))
      .filter((p) => p.steps.length > 0),
    approval: pick(doc.approval, ctx, null),
    blockers: keep(doc.blockers, ctx),
    customerSide: keep(doc.customerSide, ctx),
    unknowns: keep(doc.unknowns, ctx).map((u) => u.text),
    sources: doc.sources,
    changelog: doc.changelog,
  };

  return fillTemplates(resolved, vars);
}

// Every level the app can land on across all intents, easiest first.
export function levelRange(doc: GuideDoc): Level[] {
  const order: Level[] = ["selfserve", "reviewed", "gated", "audited"];
  const seen = new Set<Level>();
  for (const d of doc.does) {
    for (const w of WHO) {
      seen.add(levelFor(computeFacts(doc, { does: [d.id], who: w.id, brand: "yes" })));
    }
  }
  return order.filter((l) => seen.has(l));
}

export function summarize(doc: GuideDoc): AppSummary {
  return {
    slug: doc.slug,
    name: doc.name,
    domain: doc.domain,
    category: doc.category,
    tagline: doc.tagline,
    origin: doc.origin,
    levels: levelRange(doc),
  };
}
