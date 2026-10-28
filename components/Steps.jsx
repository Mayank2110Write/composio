"use client";
import { useEffect, useState } from "react";
import SourceTag from "./SourceTag";
import CopyButton from "./CopyButton";

const WHO_LABEL = {
  agent: "Agent does this",
  you: "You",
  wait: "Waiting",
  customer: "Your customer",
};

function Tick() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 6.2l2.3 2.3L9.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Step({ step, id, done, onToggle, sources, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `step-body-${id}`;
  return (
    <div className={`step${done ? " done" : ""}`}>
      <div className="step-row">
        <button
          type="button"
          className="check"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${step.title}" as done`}
          onClick={onToggle}
        >
          {done && <Tick />}
        </button>
        <button type="button" className="step-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <div className="step-title">{step.title}</div>
          <div className="step-sub">
            <span className={`who who-${step.who}`}>{WHO_LABEL[step.who]}</span>
            <span>{step.time}</span>
          </div>
        </button>
        <span className={`chevron${open ? " open" : ""}`} aria-hidden="true">›</span>
      </div>
      {open && (
        <div className="step-body" id={bodyId}>
          <p>
            {step.detail}
            <SourceTag id={step.src} sources={sources} />
          </p>
          {step.fields?.map((f) => (
            <div className="field" key={f.label}>
              <span className="field-label">{f.label}</span>
              <span className="field-value">
                <code>{f.value}</code>
                {f.copy && <CopyButton text={f.value} />}
              </span>
            </div>
          ))}
          {step.draft && (
            <div className="draft">
              {step.draft.trim().startsWith("{") ? <pre>{step.draft}</pre> : <p className="draft-text">{step.draft}</p>}
              <CopyButton text={step.draft} label="Copy draft" />
            </div>
          )}
          {step.check && <p className="check-note">{step.check}</p>}
          {step.link && (
            <p><a href={step.link.url} target="_blank" rel="noreferrer">{step.link.label}</a></p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Steps({ phases, sources, storageKey }) {
  const [done, setDone] = useState({});
  const total = phases.reduce((n, p) => n + p.steps.length, 0);
  const count = Object.values(done).filter(Boolean).length;

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(storageKey) || "{}"));
    } catch {
      setDone({});
    }
  }, [storageKey]);

  function toggle(id) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Progress just won't be remembered.
    }
  }

  let firstOpen = true;
  return (
    <>
      <p className="progress" aria-live="polite">{count} of {total} done</p>
      {phases.map((phase, pi) => (
        <div className="phase" key={phase.name}>
          <h3>{phase.name}</h3>
          {phase.steps.map((step, si) => {
            const id = `${pi}-${si}`;
            const open = firstOpen && !done[id] && step.who === "you";
            if (open) firstOpen = false;
            return (
              <Step
                key={id}
                id={id}
                step={step}
                done={!!done[id]}
                onToggle={() => toggle(id)}
                sources={sources}
                defaultOpen={open}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
