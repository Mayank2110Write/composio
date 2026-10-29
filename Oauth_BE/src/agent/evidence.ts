// Code, not the model, decides how strong each source is and whether a fact is
// actually supported by the page it cites.

import type { EvidenceKind } from "../shared/types";
import { brandLabel, registrableDomain } from "./query";

// Provider docs: the provider's own domain, or a docs host carrying its brand
// (e.g. airtable.readme.io). Composio's own docs count for the managed-app
// question. Everything else is a third party.
export function labelSource(url: string, appDomain: string): EvidenceKind {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "unverified";
  }
  const reg = registrableDomain(appDomain);
  if (host === reg || host.endsWith(`.${reg}`)) return "official";
  const brand = brandLabel(appDomain);
  if (brand.length >= 4 && host.split(".").includes(brand)) return "official";
  if (host.endsWith("composio.dev")) return "official";
  return "community";
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9%$.:/'"-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A quote counts as found when it appears in the page text, allowing for
// whitespace and punctuation differences. Long quotes may be trimmed by the
// model, so we also accept a run of 8+ consecutive words from it.
export function quoteFound(quote: string, pageText: string): boolean {
  const q = normalize(quote);
  const page = normalize(pageText);
  if (q.length < 12) return false;
  if (page.includes(q)) return true;
  const words = q.split(" ");
  if (words.length < 8) return false;
  for (let i = 0; i + 8 <= words.length; i++) {
    if (page.includes(words.slice(i, i + 8).join(" "))) return true;
  }
  return false;
}
