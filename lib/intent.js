export const WHO = [
  { id: "team", label: "Just my team", hint: "People inside your own company" },
  { id: "few", label: "A few customers", hint: "Up to about 10 accounts you know by name" },
  { id: "public", label: "Anyone", hint: "Any user who signs up for your product" },
];

export const BRAND = [
  { id: "yes", label: "Yes", hint: "Users should see your product's name when they approve access" },
  { id: "no", label: "Not yet", hint: "A shared app is fine while you build and test" },
];

export function readIntent(searchParams, guideDef) {
  const does = searchParams.get("does");
  const who = searchParams.get("who");
  const brand = searchParams.get("brand");
  return {
    does: guideDef?.does?.some((d) => d.id === does) ? does : guideDef?.does?.[0]?.id,
    who: WHO.some((w) => w.id === who) ? who : "public",
    brand: BRAND.some((b) => b.id === brand) ? brand : "yes",
  };
}

export function intentQuery(intent) {
  const p = new URLSearchParams();
  Object.entries(intent).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
}
