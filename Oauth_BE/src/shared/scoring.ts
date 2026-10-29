// Difficulty and confidence are computed from facts by fixed rules, never
// chosen by the language model. That keeps every verdict explainable and
// consistent between library guides and generated ones.

import type { Confidence, EvidenceKind, Facts, Level, Owner, Source } from "./types.js";

export const LEVELS: Record<Level, { label: string; plain: string; meaning: string; rank: number }> = {
  selfserve: {
    label: "Self-serve",
    plain: "No approval needed",
    meaning: "Register the app and start connecting users. No one reviews it.",
    rank: 0,
  },
  reviewed: {
    label: "Reviewed",
    plain: "The provider reviews your app",
    meaning: "The provider checks your app before anyone outside your test list can connect.",
    rank: 1,
  },
  gated: {
    label: "Gated",
    plain: "Capped until the provider lists you",
    meaning: "You can start, but a cap or listing process limits how far you can grow.",
    rank: 2,
  },
  audited: {
    label: "Audited",
    plain: "Paid security audit required",
    meaning: "A paid third-party security assessment is required, and it renews every year.",
    rank: 3,
  },
};

export function levelFor(facts: Facts): Level {
  if (facts.review === "audit") return "audited";
  if (facts.cap && facts.publicReach) return "gated";
  if (facts.review === "review") return "reviewed";
  return "selfserve";
}

export function levelReasons(facts: Facts): string[] {
  const reasons: string[] = [];
  if (facts.review === "audit") reasons.push("A scope you need requires a third-party security assessment.");
  if (facts.review === "review") reasons.push("A scope or audience you chose requires the provider's review.");
  if (facts.cap && facts.publicReach) reasons.push(`You're limited to ${facts.cap} until the provider approves a listing.`);
  if (reasons.length === 0) reasons.push("No provider review applies to the scopes and audience you chose.");
  return reasons;
}

export const EVIDENCE: Record<EvidenceKind, { label: string; meaning: string; strength: number }> = {
  tested: { label: "Tested", meaning: "We did this ourselves and it worked.", strength: 3 },
  official: { label: "Provider docs", meaning: "Stated in the provider's own documentation.", strength: 2 },
  community: {
    label: "Community",
    meaning: "Reported by developers or third parties. Treat as likely, not certain.",
    strength: 1,
  },
  unverified: {
    label: "Unverified",
    meaning: "We couldn't confirm this. Sources disagree or say nothing.",
    strength: 0,
  },
};

// Confidence follows the weakest source behind the verdict's key claims.
export function confidenceFor(sources: Source[], keyIds: string[]): Confidence {
  if (keyIds.length === 0) return "Low";
  const kinds = keyIds.map((id) => sources.find((s) => s.id === id)?.kind ?? "unverified");
  if (kinds.includes("unverified")) return "Low";
  if (kinds.includes("community")) return "Medium";
  return "High";
}

export const OWNERS: Record<Owner, { label: string; meaning: string; action: string }> = {
  agent: { label: "Agent", meaning: "Done for you in this guide.", action: "Done for you" },
  you: { label: "You", meaning: "Needs you: an account, a decision or a signature.", action: "You do this" },
  provider: { label: "Provider", meaning: "Waiting on the provider.", action: "You wait" },
  customer: { label: "Customer", meaning: "Your customer's admin does this.", action: "Your customer does this" },
};
