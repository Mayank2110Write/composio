import { describe, expect, it } from "vitest";
import { WHO } from "../shared/intent";
import { levelRange, resolveGuide } from "../shared/resolve";
import type { Source } from "../shared/types";
import { assembleGuide, isGrowthCap, type VerifiedFact } from "./assemble";
import { labelSource, quoteFound } from "./evidence";
import { htmlToText } from "./fetchPage";
import type { Written } from "./prompts";
import { parseQuery } from "./query";
import { writtenProblems } from "./quality";

describe("labelling sources by domain", () => {
  it("treats the provider's own hosts as provider docs", () => {
    expect(labelSource("https://developers.zoom.us/docs/integrations/oauth", "zoom.us")).toBe("official");
    expect(labelSource("https://zoom.us/pricing", "zoom.us")).toBe("official");
    expect(labelSource("https://airtable.readme.io/docs/oauth", "airtable.com")).toBe("official");
  });
  it("treats everyone else as community", () => {
    expect(labelSource("https://stackoverflow.com/q/1", "zoom.us")).toBe("community");
    expect(labelSource("https://nango.dev/docs/zoom", "zoom.us")).toBe("community");
  });
});

describe("checking quotes against pages", () => {
  const page = htmlToText("<p>All public apps must be submitted for review before they&nbsp;can be published on the Zoom App Marketplace.</p>");
  it("accepts exact and lightly reformatted quotes", () => {
    expect(quoteFound("must be submitted for review before they can be published", page)).toBe(true);
    expect(quoteFound("All public apps MUST be submitted   for review", page)).toBe(true);
  });
  it("rejects quotes that aren't on the page", () => {
    expect(quoteFound("Apps are approved automatically within one hour of submission", page)).toBe(false);
    expect(quoteFound("review", page)).toBe(false);
  });
});

describe("growth caps", () => {
  it("only counts numeric limits on who can connect", () => {
    expect(isGrowthCap("25 installs")).toBe(true);
    expect(isGrowthCap("100 users")).toBe(true);
    expect(isGrowthCap("10 personal access tokens per user")).toBe(false);
    expect(isGrowthCap("100 requests per minute")).toBe(false);
    expect(isGrowthCap("Public access requires approval")).toBe(false);
  });
});

describe("parsing queries", () => {
  it("handles names and websites", () => {
    expect(parseQuery("zoom.us")).toMatchObject({ slug: "zoom", domain: "zoom.us" });
    expect(parseQuery("https://www.airtable.com/pricing")).toMatchObject({ slug: "airtable", domain: "airtable.com" });
    expect(parseQuery("Monday CRM")).toMatchObject({ slug: "monday-crm", domain: null });
  });
});

const step = (over: Partial<Written["phases"][number]["steps"][number]> = {}): Written["phases"][number]["steps"][number] => ({
  who: "you",
  title: "Create the app",
  time: "5 min",
  detail: "Open the console.",
  fields: [],
  draft: "",
  check: "",
  linkLabel: "",
  linkUrl: "",
  factIds: ["F1"],
  appliesTo: "always",
  ...over,
});

const timing = { workText: "1-2 hours", workHours: 1.5, waitText: "None", waitDays: 0 };
const written: Written = {
  tagline: "Quick to start, reviewed before public launch.",
  does: [
    { label: "Read meetings", scopes: ["meeting:read"], note: "Narrowest.", reviewTrigger: "optional_listing", review: "review", factIds: ["F1"] },
    { label: "Manage recordings", scopes: ["recording:write"], note: "Broader.", reviewTrigger: "external_users", review: "review", factIds: ["F2"] },
  ],
  reviewAudience: "public",
  cap: { text: "10 personal access tokens per user", factIds: ["F3"] },
  timing: { noReview: timing, review: { ...timing, waitText: "2-6 weeks", waitDays: 28 }, audit: timing, bufferText: "+1-2 weeks", bufferDays: 10 },
  cost: { noReview: "Free", review: "Free", audit: "Unknown" },
  mainBlocker: {
    noReview: { text: "Nothing serious.", factIds: ["F1"] },
    review: { text: "The marketplace review.", factIds: ["F2"] },
    audit: { text: "n/a", factIds: [] },
    capped: { text: "n/a", factIds: [] },
  },
  choices: [{ title: "App type", choice: "General app", consequence: "Works for any account. {{weird}}", factIds: ["F1"], appliesTo: "always" }],
  prerequisites: [{ text: "A developer account", factIds: [], appliesTo: "always" }],
  phases: [
    {
      name: "Register",
      appliesTo: "always",
      steps: [
        step({ fields: [{ label: "Redirect URL", value: "{{callback}}", example: false }, { label: "App name", value: "Your app", example: true }] }),
        step({ title: "Open console", linkLabel: "Console", linkUrl: "https://dead.example/x" }),
      ],
    },
    { name: "Get approved", appliesTo: "review", steps: [step({ who: "provider", title: "Wait for review", factIds: ["F2"] })] },
  ],
  approval: { summary: "They check security.", whileWaiting: ["Keep building."], factIds: ["F2"] },
  blockers: [{ symptom: "Install fails", cause: "Not approved", fix: "Get approved", factIds: ["F9"], appliesTo: "public" }],
  customerSide: [],
  unknowns: ["Review time varies."],
};

const facts: VerifiedFact[] = [
  { id: "F1", topic: "registration", statement: "Create apps in the console.", quote: "q", url: "https://developers.zoom.us/a", verified: true, sourceId: "s1" },
  { id: "F2", topic: "review", statement: "Public apps are reviewed.", quote: "q", url: "https://developers.zoom.us/b", verified: true, sourceId: "s2" },
  { id: "F3", topic: "limits", statement: "Token limit.", quote: "q", url: "https://developers.zoom.us/b", verified: false, sourceId: "s2" },
];
const sources: Source[] = [
  { id: "s1", kind: "official", publisher: "developers.zoom.us", title: "A", url: "https://developers.zoom.us/a" },
  { id: "s2", kind: "official", publisher: "developers.zoom.us", title: "B", url: "https://developers.zoom.us/b" },
  { id: "s3", kind: "community", publisher: "blog", title: "Unused", url: "https://blog.example/x" },
  { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed", url: "https://docs.composio.dev/toolkits/managed-auth" },
];

describe("assembling a guide", () => {
  const doc = assembleGuide({
    app: { name: "Zoom", domain: "zoom.us", slug: "zoom", category: "Video", consoleUrl: "https://marketplace.zoom.us" },
    written,
    facts,
    sources,
    managed: { available: null, note: "Unconfirmed.", src: "cmp-managed" },
    liveLinks: new Set(),
    pagesRead: 2,
    today: "29 Oct 2026",
  });

  it("ignores reviews that are only for an optional listing", () => {
    expect(doc.factRules.some((r) => r.when?.does?.includes("read-meetings"))).toBe(false);
  });

  it("scores with fixed rules and ignores token limits posing as caps", () => {
    expect(levelRange(doc)).toEqual(["selfserve", "reviewed"]);
    expect(doc.factRules.some((r) => r.set.cap)).toBe(false);
  });

  it("marks items with no confirmed fact as Unverified", () => {
    const g = resolveGuide(doc, { does: ["read-meetings"], who: "public", brand: "yes" });
    expect(g.blockers[0].src).toBe("unverified");
    expect(g.prerequisites[0].src).toBe("unverified");
    expect(g.sources.find((s) => s.id === "unverified")?.kind).toBe("unverified");
  });

  it("drops links that didn't load, unused sources and stray templates", () => {
    const all = doc.phases.flatMap((p) => p.steps);
    expect(all.some((s) => s.link)).toBe(false);
    expect(doc.sources.map((s) => s.id)).not.toContain("s3");
    expect(JSON.stringify(doc)).not.toContain("{{weird}}");
  });

  it("resolves for every answer without broken references", () => {
    const ids = new Set(doc.sources.map((s) => s.id));
    for (const d of doc.does) {
      for (const w of WHO) {
        const g = resolveGuide(doc, { does: [d.id], who: w.id, brand: "yes" });
        const cited = [g.blocker.src, ...g.keySources, ...g.phases.flatMap((p) => p.steps.map((s) => s.src))];
        for (const c of cited) expect(ids).toContain(c);
        expect(JSON.stringify(g)).not.toMatch(/\{\{/);
      }
    }
  });

  it("shows the approval phase only when review applies", () => {
    expect(resolveGuide(doc, { does: ["manage-recordings"], who: "public", brand: "yes" }).phases.map((p) => p.name)).toContain("Get approved");
    expect(resolveGuide(doc, { does: ["manage-recordings"], who: "team", brand: "yes" }).phases.map((p) => p.name)).not.toContain("Get approved");
  });
});

describe("draft quality checks", () => {
  it("flags thin drafts", () => {
    const problems = writtenProblems(written);
    expect(problems.join(" ")).toMatch(/Only 3 steps/);
  });
});
