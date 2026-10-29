// The guide format shared with the backend. Library guides and guides the
// agent generates live use the same shape, so the UI renders both the same way.
//
// A guide is stored once and resolved per developer. Anything that depends on
// the three intent answers carries a `when` condition; `resolveGuide` filters
// those and computes the verdict with fixed rules (see scoring.ts).

export type Who = "team" | "few" | "public";
export type Brand = "yes" | "no";

export type Intent = {
  // Everything the developer's agent will do. The verdict follows the
  // strictest requirement among them.
  does: string[];
  who: Who;
  brand: Brand;
};

export type Review = "none" | "review" | "audit";

export type Facts = {
  review: Review;
  // A limit on growth before the provider approves something, e.g. "25 installs".
  cap: string | null;
  // Whether the developer wants anyone to be able to connect.
  publicReach: boolean;
};

export type Level = "selfserve" | "reviewed" | "audited" | "gated";
export type Confidence = "High" | "Medium" | "Low";

// Every key that is set must match. Keys that reference facts are checked
// after fact rules run.
export type When = {
  does?: string[];
  who?: Who[];
  brand?: Brand[];
  review?: Review[];
  capped?: boolean;
};

export type Conditional<T> = T & { when?: When };

// The first entry whose `when` matches wins. Leave `when` off the last entry
// to make it the default.
export type Variants<T> = { when?: When; value: T }[];

export type Owner = "agent" | "you" | "provider" | "customer";

export type EvidenceKind = "tested" | "official" | "community" | "unverified";

export type Source = {
  id: string;
  kind: EvidenceKind;
  publisher: string;
  title: string;
  url: string;
  checkedAt?: string;
};

export type DoesOption = {
  id: string;
  label: string;
  scopes: string[];
  note?: string;
};

// A value to enter in the provider's console. `example` marks a value the
// developer replaces with their own (their app name, homepage).
export type Field = { label: string; value: string; copy?: boolean; example?: boolean };

export type Step = {
  who: Owner;
  title: string;
  time: string;
  detail: string;
  fields?: Field[];
  // Text the agent prepared for the developer to paste or edit.
  draft?: string;
  // A warning about a common mistake at this step.
  check?: string;
  link?: { label: string; url: string };
  src: string;
};

export type Phase = {
  name: string;
  when?: When;
  steps: Conditional<Step>[];
};

export type Timing = {
  work: { text: string; hours: number };
  wait: { text: string; days: number };
  buffer: { text: string; days: number } | null;
};

export type Cited = { text: string; src: string };

export type Choice = { title: string; choice: string; consequence: string; src: string };

export type Blocker = { symptom: string; cause: string; fix: string; src: string };

export type Approval = { summary: string; whileWaiting: string[]; src: string };

export type GuideDoc = {
  slug: string;
  name: string;
  domain: string;
  category: string;
  tagline: string;
  origin: "library" | "generated";
  lastVerified: string;
  does: DoesOption[];
  // Strings in the guide can use {{scopes}}, {{does}}, {{doesLower}}, {{doesNote}},
  // {{requiredScopesJson}}, {{optionalScopesJson}}, {{callback}} and {{var.<name>}}.
  vars?: Record<string, Variants<string>>;
  factRules: { when?: When; set: Partial<Facts> }[];
  reasons?: Variants<string[]>;
  managed: { available: boolean | null; note: string; src: string };
  timing: Variants<Timing>;
  cost: Variants<string>;
  blocker: Variants<Cited>;
  keySources: Variants<string[]>;
  choices: Conditional<Choice>[];
  prerequisites: Conditional<Cited>[];
  phases: Phase[];
  approval: Variants<Approval | null>;
  blockers: Conditional<Blocker>[];
  customerSide: Conditional<Cited>[];
  unknowns: Conditional<{ text: string }>[];
  sources: Source[];
  changelog: { date: string; text: string }[];
};

export type ResolvedStep = Step & { id: string };

export type ResolvedGuide = {
  slug: string;
  name: string;
  domain: string;
  category: string;
  tagline: string;
  origin: GuideDoc["origin"];
  lastVerified: string;
  intent: Intent;
  // The options the developer picked, in the guide's order.
  doesOptions: DoesOption[];
  does: DoesOption[];
  facts: Facts;
  level: Level;
  reasons: string[];
  confidence: Confidence;
  // True when a managed app exists and the developer doesn't need their brand yet.
  canSkipOwnApp: boolean;
  managed: GuideDoc["managed"];
  timing: Timing;
  cost: string;
  blocker: Cited;
  keySources: string[];
  choices: Choice[];
  prerequisites: Cited[];
  phases: { name: string; steps: ResolvedStep[] }[];
  approval: Approval | null;
  blockers: Blocker[];
  customerSide: Cited[];
  unknowns: string[];
  sources: Source[];
  changelog: GuideDoc["changelog"];
};

// What the library and search return: enough to draw a card.
export type AppSummary = {
  slug: string;
  name: string;
  domain: string;
  category: string;
  tagline: string;
  origin: GuideDoc["origin"];
  // Range of levels across all intents, easiest first.
  levels: Level[];
};

// Events streamed while the agent researches an app.
export type GenerateEvent =
  | { type: "stage"; id: string; label: string; status: "running" | "done" | "failed"; detail?: string }
  | { type: "source"; source: Source; status: "kept" | "dropped"; reason?: string }
  | { type: "fact"; text: string; src?: string }
  | { type: "done"; slug: string }
  | { type: "error"; message: string };
