import type { AppSummary } from "../shared/types.js";

// Turns "airtable", "Airtable" or "https://www.airtable.com/pricing" into a
// name, a domain guess and a slug.
export function parseQuery(query: string): { name: string; domain: string | null; slug: string } {
  const q = query.trim();
  let domain: string | null = null;
  try {
    const url = new URL(/^https?:\/\//.test(q) ? q : `https://${q}`);
    if (url.hostname.includes(".") && !/\s/.test(q)) domain = url.hostname.replace(/^www\./, "");
  } catch {
    // Not a URL.
  }
  const base = domain ? domain.split(".").slice(-2, -1)[0] : q;
  const name = base
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { name: name || q, domain, slug: slugify(base) };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function matchesQuery(app: AppSummary, q: string): boolean {
  const needle = q.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!needle) return true;
  return (
    app.name.toLowerCase().includes(needle) ||
    app.slug.includes(needle) ||
    app.domain.includes(needle) ||
    needle.includes(app.domain) ||
    app.category.toLowerCase().includes(needle)
  );
}

// The part of a hostname that identifies the company, e.g. "zoom" in
// developers.zoom.us. Good enough for labelling sources; not a full public
// suffix list.
export function brandLabel(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  const twoPartTld = parts.length > 2 && ["co", "com", "org", "net", "ac", "gov"].includes(parts[parts.length - 2]);
  return parts[parts.length - (twoPartTld ? 3 : 2)] ?? parts[0];
}

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  const twoPartTld = parts.length > 2 && ["co", "com", "org", "net", "ac", "gov"].includes(parts[parts.length - 2]);
  return parts.slice(twoPartTld ? -3 : -2).join(".");
}
