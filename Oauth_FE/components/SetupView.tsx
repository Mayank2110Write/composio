"use client";

import { useEffect, useRef } from "react";
import { OWNERS } from "@/lib/scoring";
import type { Field, ResolvedGuide, ResolvedStep } from "@/lib/types";
import { CopyButton, EvidenceTag, OwnerTag } from "./ui";

function Fields({ fields, provider }: { fields: Field[]; provider: string }) {
  return (
    <div className="fields">
      <p className="field-intro">What to enter in {provider}&apos;s form:</p>
      {fields.map((f) => (
        <div key={f.label}>
          <div className="field-label">
            {f.label}
            <span className="faint">{f.example ? " · use your own" : " · use exactly this"}</span>
          </div>
          <div className="field-row">
            {f.example ? (
              <span className="field-example">e.g. {f.value}</span>
            ) : (
              <>
                <code>{f.value}</code>
                <CopyButton text={f.value} className="btn" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// One step at a time, with a task list on the side, like a setup assistant.
export function SetupView({
  g,
  done,
  setDone,
  current,
  onSelect,
  onTroubleshoot,
}: {
  g: ResolvedGuide;
  done: Record<string, boolean>;
  setDone: (id: string, value: boolean) => void;
  current: string | null;
  onSelect: (id: string | null) => void;
  onTroubleshoot: () => void;
}) {
  const steps = g.phases.flatMap((p) => p.steps.map((s) => ({ ...s, phase: p.name })));
  const complete = steps.filter((s) => done[s.id]).length;
  const allDone = complete === steps.length;
  const fallback = steps.find((s) => !done[s.id]) ?? null;
  const step = steps.find((s) => s.id === current) ?? (allDone && !current ? null : fallback);
  const index = step ? steps.findIndex((s) => s.id === step.id) : -1;
  const phaseIndex = step ? g.phases.findIndex((p) => p.name === step.phase) : -1;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, [step?.id]);

  function finish(s: ResolvedStep) {
    setDone(s.id, true);
    const next = steps.slice(index + 1).find((x) => !done[x.id]) ?? steps.find((x) => !done[x.id] && x.id !== s.id);
    onSelect(next?.id ?? "__done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="setup fade-in">
      <aside className="rail" aria-label="Setup steps">
        <div className="rail-progress">
          {complete} of {steps.length} done
        </div>
        <div className="progress-track">
          <span style={{ width: `${(complete / steps.length) * 100}%` }} />
        </div>
        <div className="rail-list">
          {g.phases.map((p) => (
            <div key={p.name}>
              <div className="rail-phase">{p.name}</div>
              {p.steps.map((s) => (
                <button
                  key={s.id}
                  className="rail-step"
                  aria-current={step?.id === s.id ? "step" : undefined}
                  onClick={() => onSelect(s.id)}
                >
                  <span className={`status${done[s.id] ? " done" : step?.id === s.id ? " current" : ""}`} aria-hidden>
                    {done[s.id] ? "✓" : ""}
                  </span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div ref={panel} tabIndex={-1} style={{ outline: "none" }}>
        {!step ? (
          <div className="card done-panel">
            <div className="big" aria-hidden>🎉</div>
            <h2 style={{ fontSize: 22, marginTop: 8 }}>You&apos;re all set</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Every step is ticked off. If something breaks once real users connect, the troubleshooting tab lists the
              usual causes and fixes.
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
              <button className="btn" onClick={onTroubleshoot}>
                See common problems
              </button>
              <button className="btn btn-ghost" onClick={() => onSelect(steps[0].id)}>
                Review steps
              </button>
            </div>
          </div>
        ) : (
          <article className="card step-panel fade-in" key={step.id} aria-labelledby="step-title">
            <div className="step-kicker">
              Step {index + 1} of {steps.length} · {step.phase} (phase {phaseIndex + 1} of {g.phases.length})
            </div>
            <h2 id="step-title">{step.title}</h2>
            <div className="step-who">
              <OwnerTag who={step.who} />
              <span>{step.who === "provider" ? `Wait for ${g.name}` : OWNERS[step.who].action}</span>
              <span aria-hidden>·</span>
              <span>{step.time}</span>
              <span aria-hidden>·</span>
              <EvidenceTag id={step.src} sources={g.sources} />
            </div>

            <p className="step-detail">{step.detail}</p>

            {step.fields && <Fields fields={step.fields} provider={g.name} />}

            {step.draft && (
              <div className="draft">
                <div className="draft-head">
                  <span>✦ We drafted this for you. Edit it to fit your product.</span>
                  <CopyButton text={step.draft} className="btn btn-sm" />
                </div>
                <pre>{step.draft}</pre>
              </div>
            )}

            {step.check && (
              <div className="warn">
                <span aria-hidden>⚠</span>
                <span>
                  <strong>Watch out: </strong>
                  {step.check}
                </span>
              </div>
            )}

            <div className="step-actions">
              {step.link && (
                <a className="btn" href={step.link.url} target="_blank" rel="noreferrer">
                  {step.link.label} ↗
                </a>
              )}
              <span className="spacer" />
              {index > 0 && (
                <button className="btn btn-ghost" onClick={() => onSelect(steps[index - 1].id)}>
                  ← Back
                </button>
              )}
              {done[step.id] ? (
                <button className="btn" onClick={() => setDone(step.id, false)}>
                  ✓ Done · undo
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => finish(step)}>
                  {step.who === "provider" ? "It's approved" : step.who === "customer" ? "They've done it" : "Done"}, next →
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
