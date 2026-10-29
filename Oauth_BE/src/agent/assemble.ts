// Builds a GuideDoc from the writer's output. Deterministic: fact rules, the
// conditions on each item and every source label are decided here, not by
// the model.

import type { Blocker, Choice, Cited, Conditional, Field, GuideDoc, Phase, Source, Step, When } from "../shared/types.js";
import type { Written } from "./prompts.js";
import { slugify } from "./query.js";

export type VerifiedFact = {
  id: string; // F1, F2...
  topic: string;
  statement: string;
  quote: string;
  url: string;
  verified: boolean;
  sourceId: string | null;
};

type Applies = Written["phases"][number]["appliesTo"];

const WHEN: Record<Applies, When | undefined> = {
  always: undefined,
  public: { who: ["public"] },
  outside: { who: ["few", "public"] },
  team: { who: ["team"] },
  review: { review: ["review", "audit"] },
  audit: { review: ["audit"] },
  no_review: { review: ["none"] },
};

export const UNVERIFIED_ID = "unverified";

// A growth cap limits how many customers can connect before approval, and
// names a number ("25 installs", "100 users"). Token, request and rate limits
// are not caps, and "needs approval to go public" is a review.
export function isGrowthCap(text: string): boolean {
  return (
    /\d/.test(text) &&
    /install|user|account|workspace|organi[sz]ation|tenant|customer|team/i.test(text) &&
    !/token|request|call|per (second|minute|hour)|rate/i.test(text)
  );
}

// Only {{callback}} is a real template; anything else the model wrote in
// braces is shown as plain text.
function clean(s: string): string {
  return s.replace(/\{\{\s*(?!callback\s*\}\})([^}]*)\}\}/g, "$1").trim();
}

export function assembleGuide(input: {
  app: { name: string; domain: string; slug: string; category: string; consoleUrl: string };
  written: Written;
  facts: VerifiedFact[];
  sources: Source[];
  managed: GuideDoc["managed"];
  liveLinks: Set<string>;
  pagesRead: number;
  today: string;
}): GuideDoc {
  const { app, facts, managed, liveLinks, today } = input;
  // The schema can't cap list sizes, so trim here.
  const w: Written = {
    ...input.written,
    does: input.written.does.slice(0, 4),
    choices: input.written.choices.slice(0, 4),
    prerequisites: input.written.prerequisites.slice(0, 6),
    phases: input.written.phases.slice(0, 6).map((p) => ({ ...p, steps: p.steps.slice(0, 6) })),
    blockers: input.written.blockers.slice(0, 6),
    customerSide: input.written.customerSide.slice(0, 4),
    unknowns: input.written.unknowns.slice(0, 5),
  };
  if (w.does.length === 0) throw new Error("The writer returned no uses for this app.");
  const byId = new Map(facts.map((f) => [f.id, f]));
  let usedUnverified = false;

  // The strongest-supported source behind an item; Unverified if none of its
  // facts were confirmed on the page they cite.
  const src = (ids: string[]): string => {
    for (const id of ids) {
      const f = byId.get(id.trim().toUpperCase());
      if (f?.verified && f.sourceId) return f.sourceId;
    }
    usedUnverified = true;
    return UNVERIFIED_ID;
  };
  const when = <T extends object>(item: T, applies: Applies): Conditional<T> => {
    const cond = WHEN[applies];
    return cond ? { ...item, when: cond } : item;
  };

  const usedIds = new Set<string>();
  const does = w.does.map((d) => {
    let id = slugify(d.label).slice(0, 40) || "use";
    while (usedIds.has(id)) id += "-2";
    usedIds.add(id);
    // Review only counts when it gates customers connecting; a review for an
    // optional marketplace listing doesn't change how hard OAuth setup is.
    return { ...d, id, review: d.reviewTrigger === "external_users" ? d.review : ("none" as const) };
  });
  const audience: When["who"] = w.reviewAudience === "few_and_public" ? ["few", "public"] : ["public"];
  const capText = isGrowthCap(w.cap.text) ? clean(w.cap.text) : "";

  const factRules: GuideDoc["factRules"] = [
    ...does.filter((d) => d.review !== "none").map((d) => ({ when: { does: [d.id], who: audience }, set: { review: d.review } })),
    ...(capText ? [{ when: { who: ["public" as const] }, set: { cap: capText } }] : []),
  ];

  const reviewIds = does.filter((d) => d.review !== "none").flatMap((d) => d.factIds);
  const registrationSources = facts.filter((f) => f.verified && f.topic === "registration").map((f) => f.sourceId!);

  const timing = (t: Written["timing"]["noReview"], buffer: boolean) => ({
    work: { text: clean(t.workText), hours: Math.max(0.1, t.workHours || 1) },
    wait: { text: clean(t.waitText), days: Math.max(0, t.waitDays || 0) },
    buffer: buffer && w.timing.bufferText ? { text: clean(w.timing.bufferText), days: Math.max(1, w.timing.bufferDays || 7) } : null,
  });
  const cited = (c: { text: string; factIds: string[] }): Cited => ({ text: clean(c.text), src: src(c.factIds) });

  const phases: Phase[] = w.phases.map((p) => ({
    name: clean(p.name),
    ...(WHEN[p.appliesTo] ? { when: WHEN[p.appliesTo] } : {}),
    steps: p.steps.map((s) => {
      const step: Step = {
        who: s.who,
        title: clean(s.title),
        time: clean(s.time),
        detail: clean(s.detail),
        src: src(s.factIds),
      };
      const fields: Field[] = s.fields
        .filter((f) => f.label && f.value)
        .map((f) => ({ label: clean(f.label), value: f.value.trim(), ...(f.example ? { example: true } : { copy: true }) }));
      if (fields.length) step.fields = fields;
      if (s.draft.trim()) step.draft = s.draft.trim();
      if (s.check.trim()) step.check = clean(s.check);
      if (s.linkUrl && liveLinks.has(s.linkUrl)) step.link = { label: clean(s.linkLabel) || "Open", url: s.linkUrl };
      return when(step, s.appliesTo);
    }),
  }));

  const unconfirmed = facts.filter((f) => !f.verified).length;
  const doc: GuideDoc = {
    slug: app.slug,
    name: app.name,
    domain: app.domain,
    category: app.category,
    tagline: clean(w.tagline),
    origin: "generated",
    lastVerified: today,
    does: does.map((d) => ({ id: d.id, label: clean(d.label), scopes: d.scopes.length ? d.scopes : ["Not stated in the docs we read"], note: clean(d.note) })),
    factRules,
    managed,
    timing: [
      { when: { review: ["audit"] }, value: timing(w.timing.audit, true) },
      { when: { review: ["review"] }, value: timing(w.timing.review, true) },
      { value: timing(w.timing.noReview, Boolean(capText)) },
    ],
    cost: [
      { when: { review: ["audit"] }, value: clean(w.cost.audit) || "Unknown" },
      { when: { review: ["review"] }, value: clean(w.cost.review) || "Unknown" },
      { value: clean(w.cost.noReview) || "Free" },
    ],
    blocker: [
      { when: { review: ["audit"] }, value: cited(w.mainBlocker.audit) },
      { when: { review: ["review"] }, value: cited(w.mainBlocker.review) },
      ...(capText ? [{ when: { capped: true, who: ["public" as const] }, value: cited(w.mainBlocker.capped) }] : []),
      { value: cited(w.mainBlocker.noReview) },
    ],
    keySources: [
      { when: { review: ["review", "audit"] }, value: [src(reviewIds), src(w.approval.factIds)] },
      ...(capText ? [{ when: { capped: true, who: ["public" as const] }, value: [src(w.cap.factIds)] }] : []),
      { value: registrationSources.length ? [...new Set(registrationSources)].slice(0, 2) : [src(w.mainBlocker.noReview.factIds)] },
    ],
    choices: w.choices.map((c) =>
      when<Choice>({ title: clean(c.title), choice: clean(c.choice), consequence: clean(c.consequence), src: src(c.factIds) }, c.appliesTo)
    ),
    prerequisites: w.prerequisites.map((p) => when<Cited>({ text: clean(p.text), src: src(p.factIds) }, p.appliesTo)),
    phases,
    approval: [
      {
        when: { review: ["review", "audit"] },
        value: { summary: clean(w.approval.summary), whileWaiting: w.approval.whileWaiting.map(clean), src: src(w.approval.factIds) },
      },
      { value: null },
    ],
    blockers: w.blockers.map((b) =>
      when<Blocker>({ symptom: clean(b.symptom), cause: clean(b.cause), fix: clean(b.fix), src: src(b.factIds) }, b.appliesTo)
    ),
    customerSide: w.customerSide.map((c) => ({ text: clean(c.text), src: src(c.factIds) })),
    unknowns: [
      { text: "Written by the research agent from the pages listed under Sources. None of the steps have been tested." },
      ...(unconfirmed
        ? [{ text: `${unconfirmed} fact${unconfirmed > 1 ? "s" : ""} the agent reported couldn't be found on the page it cited, so anything resting on them is marked Unverified.` }]
        : []),
      ...w.unknowns.map((u) => ({ text: clean(u) })),
    ],
    sources: [],
    changelog: [
      {
        date: today,
        text: `Researched live: read ${input.pagesRead} page${input.pagesRead === 1 ? "" : "s"}, confirmed ${facts.length - unconfirmed} of ${facts.length} facts against page text.`,
      },
    ],
  };

  // Keep only sources something actually cites, plus Composio for the managed note.
  const cites = new Set<string>([managed.src]);
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "src" && typeof x === "string") cites.add(x);
        else visit(x);
      }
    }
  };
  visit(doc);
  doc.keySources.forEach((k) => k.value.forEach((id) => cites.add(id)));
  doc.sources = input.sources.filter((s) => cites.has(s.id));
  if (usedUnverified || cites.has(UNVERIFIED_ID)) {
    doc.sources.push({
      id: UNVERIFIED_ID,
      kind: "unverified",
      publisher: app.name,
      title: "No page we opened confirmed this",
      url: app.consoleUrl || `https://${app.domain}`,
    });
  }
  return doc;
}
