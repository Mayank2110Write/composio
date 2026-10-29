import { LEVELS } from "@/lib/scoring";
import type { ResolvedGuide } from "@/lib/types";
import { DifficultyMeter, EvidenceTag } from "./ui";

// Work and waiting are drawn on one bar in calendar days, so "one hour of work"
// never reads as "done in one hour".
function TimeBar({ g }: { g: ResolvedGuide }) {
  const workDays = Math.max(g.timing.work.hours / 8, 0.05);
  const wait = g.timing.wait.days;
  const buffer = g.timing.buffer?.days ?? 0;
  const total = workDays + wait + buffer;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="timebar">
      <div className="timebar-track" aria-hidden>
        <span style={{ width: pct(workDays), background: "var(--bar-work)" }} />
        {wait > 0 && <span style={{ width: pct(wait), background: "var(--bar-wait)" }} />}
        {buffer > 0 && (
          <span style={{ width: pct(buffer), background: "repeating-linear-gradient(45deg, var(--bar-buffer) 0 4px, transparent 4px 8px)" }} />
        )}
      </div>
      <div className="timebar-legend">
        <span><i className="dot" style={{ background: "var(--bar-work)" }} />You: {g.timing.work.text}</span>
        <span><i className="dot" style={{ background: "var(--bar-wait)" }} />Waiting: {g.timing.wait.text}</span>
        {g.timing.buffer && <span><i className="dot" style={{ background: "var(--bar-buffer)" }} />If it goes wrong: {g.timing.buffer.text}</span>}
      </div>
    </div>
  );
}

export function PlanView({
  g,
  done,
  onStart,
  onSources,
}: {
  g: ResolvedGuide;
  done: Record<string, boolean>;
  onStart: () => void;
  onSources: () => void;
}) {
  const steps = g.phases.flatMap((p) => p.steps);
  const agentSteps = steps.filter((s) => s.who === "agent").length;
  const started = steps.some((s) => done[s.id]);

  return (
    <div className="fade-in">
      {g.canSkipOwnApp && (
        <div className="callout callout-good" style={{ marginTop: 0, marginBottom: 12 }}>
          <span className="callout-icon">✓</span>
          <div>
            <div className="callout-title">Good news: you can skip this for now</div>
            <p>
              {g.managed.note} Build on it today, and come back when users need to see your name on the consent screen.{" "}
              <EvidenceTag id={g.managed.src} sources={g.sources} />
            </p>
          </div>
        </div>
      )}

      <section className="card verdict" aria-label="Verdict">
        <div className="verdict-level">
          <DifficultyMeter level={g.level} large />
          <span className="name">{LEVELS[g.level].label}</span>
          <span className="muted">{LEVELS[g.level].plain}</span>
        </div>
        <p className="headline">
          {g.timing.work.text} of work
          <br />
          <em>
            {g.timing.wait.days === 0 ? `No waiting on ${g.name}` : `Waiting on ${g.name}: ${g.timing.wait.text}`}
          </em>
        </p>
        <p className="verdict-why">{g.reasons.join(" ")}</p>
        <TimeBar g={g} />
        <div className="facts">
          <div>
            <div className="fact-label">Cost</div>
            <div className="fact-value">{g.cost}</div>
          </div>
          <div>
            <div className="fact-label">Steps</div>
            <div className="fact-value">
              {steps.length}
              {agentSteps > 0 && <span className="muted" style={{ fontWeight: 400 }}> · {agentSteps} done for you</span>}
            </div>
          </div>
          <div>
            <div className="fact-label">How sure we are</div>
            <button className={`fact-value conf-${g.confidence}`} onClick={onSources} style={{ border: 0, background: "none", padding: 0 }}>
              {g.confidence} confidence ›
            </button>
          </div>
        </div>
      </section>

      <div className="callout callout-warn">
        <span className="callout-icon">!</span>
        <div>
          <div className="callout-title">Most likely to slow you down</div>
          <p>
            {g.blocker.text} <EvidenceTag id={g.blocker.src} sources={g.sources} />
          </p>
        </div>
      </div>

      <section className="block">
        <h2>Your path</h2>
        <p className="sub">The phases you&apos;ll go through, in order.</p>
        <div className="card" style={{ padding: "4px 20px" }}>
          <ol className="path">
            {g.phases.map((p, i) => {
              const allDone = p.steps.every((s) => done[s.id]);
              const waits = p.steps.some((s) => s.who === "provider");
              return (
                <li key={p.name} className={`path-item${allDone ? " done" : ""}${waits ? " wait" : ""}`} style={{ listStyle: "none" }}>
                  <span className="path-dot">{allDone ? "✓" : i + 1}</span>
                  <div>
                    <div className="path-name">{p.name}</div>
                    <div className="path-meta">
                      {p.steps.length} step{p.steps.length > 1 ? "s" : ""}
                      {waits ? " · includes waiting" : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {g.choices.length > 0 && (
        <section className="block">
          <h2>Decisions that change your path</h2>
          <p className="sub">Get these right up front. They&apos;re hard to change later.</p>
          <div className="decisions">
            {g.choices.map((c) => (
              <div className="card decision" key={c.title + c.choice}>
                <div className="decision-title">{c.title}</div>
                <div className="decision-pick">{c.choice}</div>
                <p className="decision-why">
                  {c.consequence} <EvidenceTag id={c.src} sources={g.sources} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {g.prerequisites.length > 0 && (
        <section className="block">
          <h2>What you&apos;ll need</h2>
          <p className="sub">Have these ready before you start.</p>
          <ul className="card checklist" style={{ padding: "6px 20px" }}>
            {g.prerequisites.map((p) => (
              <li key={p.text}>
                <span className="tick" aria-hidden>✓</span>
                <span>
                  {p.text} <EvidenceTag id={p.src} sources={g.sources} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.approval && (
        <section className="block">
          <h2>Getting approved</h2>
          <p className="sub">
            {g.approval.summary} <EvidenceTag id={g.approval.src} sources={g.sources} />
          </p>
          <ul className="card checklist" style={{ padding: "6px 20px" }}>
            {g.approval.whileWaiting.map((w) => (
              <li key={w}>
                <span className="tick" aria-hidden>⏳</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card cta-bar no-print">
        <div>
          <div style={{ fontWeight: 650 }}>{started ? "Pick up where you left off" : "Ready to start?"}</div>
          <div className="muted small">
            {steps.length} steps, one at a time, with values to copy and links to the right page.
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          {started ? "Continue setup" : "Start setup"} →
        </button>
      </div>
    </div>
  );
}
