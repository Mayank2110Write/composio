import { EVIDENCE } from "@/lib/scoring";

// A small marker after a claim. It links to the source and shows what kind of evidence it is.
export default function SourceTag({ id, sources }) {
  const src = sources.find((s) => s.id === id);
  if (!src) return null;
  const ev = EVIDENCE[src.kind] ?? EVIDENCE.unknown;
  return (
    <a
      href={src.url}
      target="_blank"
      rel="noreferrer"
      className={`src-tag k-${src.kind}`}
      title={`${ev.label}: ${src.title} (${src.publisher})`}
      aria-label={`Source, ${ev.label}: ${src.title}`}
    >
      {ev.mark}
    </a>
  );
}
