// Mock agent. It replays the same stages the real Gemini agent will run,
// so the interface can be built and tested without an API key.
// The backend will replace generateGuide() with a call to /api/generate.

import { levelFor, levelReasons, confidenceFor } from "./scoring";

export const GENERIC_DOES = [
  { id: "read", label: "Read data" },
  { id: "write", label: "Create and update data" },
  { id: "both", label: "Read and write data" },
];

export const STAGES = [
  { id: "resolve", label: "Finding the developer portal" },
  { id: "managed", label: "Checking for a managed OAuth app" },
  { id: "docs", label: "Reading the OAuth documentation" },
  { id: "scopes", label: "Classifying scopes" },
  { id: "approval", label: "Looking for review and install limits" },
  { id: "verify", label: "Checking that every source link works" },
  { id: "write", label: "Writing your guide" },
];

function slugify(name) {
  return name.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\..*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}

function titleCase(name) {
  const clean = name.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const base = clean.includes(".") ? clean.split(".")[0] : clean;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// onStage(stageId, status, detail) is called as the agent works.
export async function generateGuide(query, intent, onStage) {
  const name = titleCase(query.trim());
  const slug = slugify(query);
  const domain = query.includes(".") ? query.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : `${slug}.com`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const details = {
    resolve: `Looked for ${name}'s developer documentation`,
    managed: "Mock mode can't call Composio. Marked as unknown",
    docs: "Mock mode doesn't read real pages",
    scopes: "Used a generic read and write split",
    approval: "No review or install cap found in mock data",
    verify: "Skipped in mock mode",
    write: "Done",
  };

  for (const stage of STAGES) {
    onStage(stage.id, "running");
    await sleep(500 + Math.random() * 600);
    onStage(stage.id, "done", details[stage.id]);
  }

  const sources = [
    { id: "mock", kind: "unknown", publisher: "Mock agent", title: `${name} developer documentation (not checked in mock mode)`, url: `https://${domain}` },
  ];
  const facts = { review: "none", installCap: null, publicReach: intent.who === "public" };
  const doesLabel = GENERIC_DOES.find((d) => d.id === intent.does)?.label ?? GENERIC_DOES[0].label;

  const guide = {
    slug,
    name,
    domain,
    generated: true,
    mock: true,
    lastVerified: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    intentLabel: doesLabel,
    managed: { available: null, note: "Not checked. Look up this toolkit's composio_managed_auth_schemes field.", src: "mock" },
    facts,
    level: levelFor(facts),
    reasons: levelReasons(facts),
    time: { work: { text: "30–60 min", hours: 1 }, wait: { text: "Unknown", days: 0 }, buffer: null },
    cost: "Unknown",
    blocker: { text: "Not researched yet. Connect the Gemini agent to find real blockers.", src: "mock" },
    keySources: ["mock"],
    decisions: [
      { title: "Scopes", choice: `Request only what's needed to ${doesLabel.toLowerCase()}.`, consequence: "Broader scopes are more likely to trigger a review.", src: "mock" },
    ],
    prerequisites: [{ text: `An account on ${name} that can create developer apps.`, src: "mock" }],
    phases: [
      {
        name: "Register",
        steps: [
          { who: "you", title: `Find ${name}'s developer portal`, time: "5 min", detail: "Look for Developers, API or Integrations in the site footer.", src: "mock" },
          { who: "you", title: "Create an OAuth app", time: "10 min", detail: "Add your app name, homepage and the redirect URI from your Composio auth config.", fields: [{ label: "Redirect URI", value: "https://backend.composio.dev/api/v3/toolkits/auth/callback", copy: true }], src: "mock" },
        ],
      },
      {
        name: "Test",
        steps: [{ who: "you", title: "Connect a test account", time: "10 min", detail: "Run one tool call to confirm the scopes work.", src: "mock" }],
      },
    ],
    approval: null,
    blockers: [],
    rollout: [],
    unknowns: [
      "This guide was produced in mock mode, so nothing in it has been researched or checked.",
      "Review requirements, install limits and timelines are unknown until the real agent runs.",
    ],
    sources,
    changelog: [{ date: "Today", text: "Generated in mock mode." }],
  };

  return { ...guide, confidence: confidenceFor(sources, guide.keySources) };
}
