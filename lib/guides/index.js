import { github } from "./github";
import { google } from "./google";
import { hubspot } from "./hubspot";
import { confidenceFor } from "../scoring";

export const LIBRARY = [github, google, hubspot];

export function getGuideDef(slug) {
  return LIBRARY.find((g) => g.slug === slug) ?? null;
}

const ALIASES = {
  github: ["github", "git hub", "github.com"],
  google: ["google", "gmail", "google drive", "drive", "google calendar", "calendar", "google workspace", "gsuite", "google sheets"],
  hubspot: ["hubspot", "hub spot", "hubspot crm"],
};

export function findInLibrary(query) {
  const q = query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (!q) return null;
  return (
    LIBRARY.find(
      (g) => ALIASES[g.slug].includes(q) || q.startsWith(g.domain)
    ) ?? null
  );
}

export function resolveGuide(def, intent) {
  const guide = def.resolve(intent);
  return { ...guide, confidence: confidenceFor(guide.sources, guide.keySources) };
}
