// Difficulty and confidence are computed from facts by fixed rules,
// never chosen by the language model. That keeps them explainable.

export const LEVELS = {
  selfserve: {
    label: "Self-serve",
    tone: "green",
    meaning: "Register the app and start connecting users. No one reviews it.",
  },
  reviewed: {
    label: "Reviewed",
    tone: "amber",
    meaning: "The provider checks your app before anyone outside your test list can connect.",
  },
  audited: {
    label: "Audited",
    tone: "red",
    meaning: "A paid third-party security assessment is required, and it renews every year.",
  },
  gated: {
    label: "Gated",
    tone: "purple",
    meaning: "You can start, but an install cap or listing process limits how far you can grow.",
  },
};

// facts: { review: "none" | "review" | "audit", installCap: number | null, publicReach: boolean }
export function levelFor(facts) {
  if (facts.review === "audit") return "audited";
  if (facts.installCap && facts.publicReach) return "gated";
  if (facts.review === "review") return "reviewed";
  return "selfserve";
}

export function levelReasons(facts) {
  const reasons = [];
  if (facts.review === "audit") reasons.push("A requested scope needs a third-party security assessment.");
  if (facts.review === "review") reasons.push("A requested scope needs the provider's review.");
  if (facts.installCap && facts.publicReach)
    reasons.push(`Installs are capped at ${facts.installCap} until the provider approves a listing.`);
  if (reasons.length === 0) reasons.push("No provider review applies to the scopes and audience you chose.");
  return reasons;
}

export const EVIDENCE = {
  tested: { label: "Tested", mark: "✓", meaning: "We did this step ourselves and it worked." },
  official: { label: "Provider docs", mark: "◆", meaning: "Stated in the provider's own documentation." },
  community: { label: "Community", mark: "◇", meaning: "Reported by developers or third parties. Treat as likely, not certain." },
  unknown: { label: "Unverified", mark: "?", meaning: "We could not confirm this. Sources disagree or say nothing." },
};

// Confidence comes from the weakest source behind the verdict's key claims.
export function confidenceFor(sources, keyIds) {
  const kinds = keyIds.map((id) => sources.find((s) => s.id === id)?.kind ?? "unknown");
  if (kinds.includes("unknown")) return "Low";
  if (kinds.includes("community")) return "Medium";
  return "High";
}
