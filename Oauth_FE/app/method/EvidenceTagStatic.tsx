import { EVIDENCE } from "@/lib/scoring";
import type { EvidenceKind } from "@/lib/types";

export function EvidenceTagStatic({ kind }: { kind: EvidenceKind }) {
  return <span className={`evidence evidence-${kind}`}>{EVIDENCE[kind].label}</span>;
}
