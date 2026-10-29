import Link from "next/link";
import { EVIDENCE } from "@/lib/scoring";
import type { EvidenceKind, ResolvedGuide } from "@/lib/types";
import { EvidenceTag } from "./ui";

export function TroubleshootView({ g }: { g: ResolvedGuide }) {
  return (
    <div className="fade-in">
      <section>
        <h2 style={{ fontSize: 17 }}>Common problems</h2>
        <p className="muted small" style={{ margin: "4px 0 14px" }}>
          Find what you&apos;re seeing, then open it for the cause and the fix.
        </p>
        {g.blockers.length === 0 ? (
          <p className="muted">No common problems recorded for this setup yet.</p>
        ) : (
          <div className="card">
            {g.blockers.map((b, i) => (
              <details className="collapse" key={b.symptom} open={i === 0}>
                <summary>{b.symptom}</summary>
                <dl className="collapse-body">
                  <dt>Why it happens</dt>
                  <dd>{b.cause}</dd>
                  <dt>How to fix it</dt>
                  <dd>
                    {b.fix} <EvidenceTag id={b.src} sources={g.sources} />
                  </dd>
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>

      {g.customerSide.length > 0 && (
        <section className="block">
          <h2>When your customers connect</h2>
          <p className="sub">Limits and approvals on your customers&apos; side. Worth putting in your onboarding.</p>
          <ul className="card checklist" style={{ padding: "6px 20px" }}>
            {g.customerSide.map((c) => (
              <li key={c.text}>
                <span className="tick" aria-hidden>→</span>
                <span>
                  {c.text} <EvidenceTag id={c.src} sources={g.sources} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function SourcesView({ g }: { g: ResolvedGuide }) {
  const counts = g.sources.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.kind]: (acc[s.kind] ?? 0) + 1 }), {});
  return (
    <div className="fade-in">
      <div className="callout callout-info" style={{ marginTop: 0 }}>
        <span className="callout-icon">i</span>
        <div>
          <div className="callout-title">{g.confidence} confidence in this verdict</div>
          <p>
            Confidence follows the weakest source behind the verdict. Every claim in this guide links to its source;
            the coloured dot shows how strong it is. <Link href="/method">How we rate</Link>
          </p>
        </div>
      </div>

      {g.unknowns.length > 0 && (
        <section className="block">
          <h2>What we&apos;re unsure of</h2>
          <p className="sub">Things sources disagree on or don&apos;t say. Check these before you rely on them.</p>
          <ul className="card checklist" style={{ padding: "6px 20px" }}>
            {g.unknowns.map((u) => (
              <li key={u}>
                <span className="tick" aria-hidden>?</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block">
        <h2>Sources</h2>
        <div className="legend">
          {(Object.keys(EVIDENCE) as EvidenceKind[])
            .filter((k) => counts[k])
            .map((k) => (
              <span key={k} className={`evidence evidence-${k}`} title={EVIDENCE[k].meaning}>
                {EVIDENCE[k].label} · {counts[k]}
              </span>
            ))}
        </div>
        <ul className="card sources">
          {g.sources.map((s) => (
            <li key={s.id}>
              <span className={`evidence evidence-${s.kind}`} title={EVIDENCE[s.kind].meaning} style={{ minWidth: 104 }}>
                {EVIDENCE[s.kind].label}
              </span>
              <span className="grow">
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                <span className="faint"> · {s.publisher}</span>
                {s.checkedAt && <span className="faint"> · read {s.checkedAt}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>Changes</h2>
        <ul className="small muted" style={{ listStyle: "none" }}>
          {g.changelog.map((c) => (
            <li key={c.date + c.text}>
              <span className="faint">{c.date}</span> · {c.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
