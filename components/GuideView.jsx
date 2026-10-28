"use client";
import { useState } from "react";
import Verdict from "./Verdict";
import Steps from "./Steps";
import SourceTag from "./SourceTag";
import { EVIDENCE } from "@/lib/scoring";
import { WHO } from "@/lib/intent";

export function ShareButton() {
  const [toast, setToast] = useState(false);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }
  return (
    <>
      <button type="button" className="btn-quiet" onClick={share}>Share guide</button>
      {toast && <div className="toast" role="status">Link copied</div>}
    </>
  );
}

export default function GuideView({ guide, intent, onEditIntent }) {
  const whoLabel = WHO.find((w) => w.id === intent.who)?.label;
  const brandLabel = intent.brand === "yes" ? "Your brand on consent" : "Shared app is fine";
  const showManaged = intent.brand === "no" && guide.managed.available === true;

  return (
    <article>
      <header className="guide-head">
        <h1>{guide.name} OAuth app</h1>
        <p className="guide-meta">
          {guide.generated ? "Generated" : "Checked"} {guide.lastVerified}
        </p>
        <div className="setup-row" aria-label="Your setup">
          <button type="button" className="pill" onClick={onEditIntent}>{guide.intentLabel}</button>
          <button type="button" className="pill" onClick={onEditIntent}>{whoLabel}</button>
          <button type="button" className="pill" onClick={onEditIntent}>{brandLabel}</button>
          <button type="button" className="link-btn" onClick={onEditIntent} style={{ fontSize: 15 }}>Change</button>
        </div>
      </header>

      {showManaged && (
        <div className="notice">
          <strong>You may not need your own app yet</strong>
          {guide.managed.note} Connect users now, and come back to this guide when they need to see your name.
          <SourceTag id={guide.managed.src} sources={guide.sources} />
        </div>
      )}
      {intent.brand === "no" && guide.managed.available === null && (
        <div className="notice">
          <strong>Managed app: not confirmed</strong>
          {guide.managed.note}
        </div>
      )}

      <Verdict guide={guide} />

      <section className="section" aria-labelledby="decisions">
        <h2 id="decisions">Choices that change your path</h2>
        {guide.decisions.map((d) => (
          <div className="decision" key={d.title}>
            <h3>{d.title}</h3>
            <p>{d.choice}</p>
            <p className="consequence">
              {d.consequence}
              <SourceTag id={d.src} sources={guide.sources} />
            </p>
          </div>
        ))}
      </section>

      <section className="section" aria-labelledby="before">
        <h2 id="before">Before you start</h2>
        <ul className="plain-list">
          {guide.prerequisites.map((p) => (
            <li key={p.text}>
              {p.text}
              <SourceTag id={p.src} sources={guide.sources} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="steps">
        <h2 id="steps">Steps</h2>
        <Steps
          phases={guide.phases}
          sources={guide.sources}
          storageKey={`progress:${guide.slug}:${intent.does}:${intent.who}`}
        />
      </section>

      {guide.approval && (
        <section className="section" aria-labelledby="approval">
          <h2 id="approval">Getting approved</h2>
          <p>
            {guide.approval.summary}
            <SourceTag id={guide.approval.src} sources={guide.sources} />
          </p>
          <h3 style={{ fontSize: 17, margin: "20px 0 8px" }}>While you wait</h3>
          <ul className="plain-list">
            {guide.approval.whileWaiting.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      )}

      {guide.blockers.length > 0 && (
        <section className="section" aria-labelledby="blockers">
          <h2 id="blockers">If you get stuck</h2>
          {guide.blockers.map((b) => (
            <div className="blocker-item" key={b.symptom}>
              <p className="symptom">{b.symptom}</p>
              <dl>
                <dt>Why</dt>
                <dd>{b.cause}<SourceTag id={b.src} sources={guide.sources} /></dd>
                <dt>Fix</dt>
                <dd>{b.fix}</dd>
              </dl>
            </div>
          ))}
        </section>
      )}

      {guide.rollout.length > 0 && (
        <section className="section" aria-labelledby="rollout">
          <h2 id="rollout">When customers connect</h2>
          <ul className="plain-list">
            {guide.rollout.map((r) => (
              <li key={r.text}>{r.text}<SourceTag id={r.src} sources={guide.sources} /></li>
            ))}
          </ul>
        </section>
      )}

      <section className="section" id="evidence" aria-labelledby="evidence-title">
        <h2 id="evidence-title">Sources and what we're unsure of</h2>
        <div className="legend">
          {Object.entries(EVIDENCE).map(([k, v]) => (
            <span key={k}><span className={`src-tag k-${k}`} style={{ marginLeft: 0 }}>{v.mark}</span>&nbsp;{v.label}</span>
          ))}
        </div>
        {guide.sources.map((s) => (
          <div className="source" key={s.id}>
            <span className={`src-tag k-${s.kind}`} title={EVIDENCE[s.kind].meaning}>{EVIDENCE[s.kind].mark}</span>
            <span>
              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="pub" style={{ display: "block" }}>{s.publisher}, {EVIDENCE[s.kind].label.toLowerCase()}</span>
            </span>
          </div>
        ))}
        {guide.unknowns.length > 0 && (
          <div className="unknowns">
            <h3>Not yet confirmed</h3>
            <ul>{guide.unknowns.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="changes">
        <h2 id="changes">Changes</h2>
        <ul className="plain-list changelog">
          {guide.changelog.map((c) => <li key={c.date + c.text}>{c.date}: {c.text}</li>)}
        </ul>
      </section>
    </article>
  );
}
