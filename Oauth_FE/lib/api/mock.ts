import { LIBRARY } from "../guides";
import { summarize } from "../resolve";
import type { AppSummary, GuideDoc } from "../types";
import type { Api } from "./types";
import { runMockAgent } from "./mockAgent";

// Generated guides live in this browser only. With the backend, they're saved
// to the database and anyone with the link can open them.
const KEY = "oauthready:generated";

function readGenerated(): GuideDoc[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as GuideDoc[];
  } catch {
    return [];
  }
}

function saveGenerated(doc: GuideDoc) {
  try {
    const rest = readGenerated().filter((d) => d.slug !== doc.slug);
    localStorage.setItem(KEY, JSON.stringify([doc, ...rest].slice(0, 20)));
  } catch {
    // Storage blocked: the guide still renders from memory this session.
  }
}

const memory = new Map<string, GuideDoc>();

function all(): GuideDoc[] {
  const generated = typeof window === "undefined" ? [] : readGenerated();
  return [...LIBRARY, ...generated.filter((g) => !LIBRARY.some((l) => l.slug === g.slug)), ...memory.values()];
}

export function matchesQuery(app: AppSummary, q: string): boolean {
  const needle = q.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (!needle) return true;
  return (
    app.name.toLowerCase().includes(needle) ||
    app.slug.includes(needle) ||
    app.domain.includes(needle) ||
    needle.includes(app.domain) ||
    app.category.toLowerCase().includes(needle)
  );
}

export const mockApi: Api = {
  mode: "mock",
  async listApps() {
    return all().map(summarize);
  },
  async searchApps(q) {
    return all().map(summarize).filter((a) => matchesQuery(a, q));
  },
  async getGuide(slug) {
    return all().find((d) => d.slug === slug) ?? null;
  },
  generate(query, onEvent, signal) {
    return runMockAgent(
      query,
      (doc) => {
        memory.set(doc.slug, doc);
        saveGenerated(doc);
      },
      onEvent,
      signal
    );
  },
};
