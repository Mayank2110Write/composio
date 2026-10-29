import type { AppSummary, GenerateEvent, GuideDoc } from "../types";

// Everything the UI needs from the backend. Two implementations: `http` talks
// to Oauth_BE, `mock` runs in the browser with the seed library and a scripted
// agent so the frontend works on its own.
export interface Api {
  mode: "http" | "mock";
  listApps(): Promise<AppSummary[]>;
  searchApps(query: string): Promise<AppSummary[]>;
  getGuide(slug: string): Promise<GuideDoc | null>;
  // Streams research progress. Resolves when the stream ends.
  generate(query: string, onEvent: (e: GenerateEvent) => void, signal?: AbortSignal): Promise<void>;
}
