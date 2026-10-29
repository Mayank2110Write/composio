import type { Brand, DoesOption, Intent, Who } from "./types";

export const WHO: { id: Who; label: string; hint: string }[] = [
  { id: "team", label: "Just my team", hint: "People inside your own company" },
  { id: "few", label: "A few customers", hint: "Up to about 10 accounts you know by name" },
  { id: "public", label: "Anyone", hint: "Any user who signs up for your product" },
];

export const BRAND: { id: Brand; label: string; hint: string }[] = [
  { id: "yes", label: "Yes", hint: "Users see your product's name when they approve access" },
  { id: "no", label: "Not yet", hint: "A shared app is fine while you build and test" },
];

type Params = { get(key: string): string | null };

// `does` is a comma-separated list in the URL, e.g. ?does=read,write.
export function readIntent(params: Params, does: DoesOption[]): Intent {
  const picked = (params.get("does") ?? "").split(",").filter((id) => does.some((o) => o.id === id));
  const w = params.get("who");
  const b = params.get("brand");
  return {
    does: picked.length ? does.filter((o) => picked.includes(o.id)).map((o) => o.id) : does[0] ? [does[0].id] : [],
    who: WHO.some((o) => o.id === w) ? (w as Who) : "public",
    brand: BRAND.some((o) => o.id === b) ? (b as Brand) : "yes",
  };
}

export function intentQuery(intent: Intent): string {
  const enc = (s: string) => encodeURIComponent(s);
  return `does=${intent.does.map(enc).join(",")}&who=${enc(intent.who)}&brand=${enc(intent.brand)}`;
}
