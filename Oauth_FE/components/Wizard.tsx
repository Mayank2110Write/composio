"use client";

import { useCallback, useEffect, useState } from "react";
import { BRAND, WHO } from "@/lib/intent";
import { computeFacts } from "@/lib/resolve";
import { LEVELS, levelFor } from "@/lib/scoring";
import type { GuideDoc, Intent } from "@/lib/types";
import { Breadcrumbs } from "./Breadcrumbs";
import { AppLogo, DifficultyMeter } from "./ui";

type Option = { id: string; title: string; hint?: string; extra?: React.ReactNode };
type Question = { key: keyof Intent; title: string; help: string; multi?: boolean; options: Option[] };
type Answers = { does: string[]; who?: Intent["who"]; brand?: Intent["brand"] };

// One question per screen, with plain-language options. The first question
// takes several answers; the audience question previews the difficulty each
// answer leads to, so the trade-off is visible before the developer commits.
export function Wizard({
  doc,
  initial,
  onDone,
  onCancel,
}: {
  doc: GuideDoc;
  initial: Partial<Intent>;
  onDone: (i: Intent) => void;
  onCancel?: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>({ does: initial.does ?? [], who: initial.who, brand: initial.brand });
  const [index, setIndex] = useState(0);

  const does = answers.does.length ? answers.does : [doc.does[0].id];

  const questions: Question[] = [
    {
      key: "does",
      title: `What should your agent do in ${doc.name}?`,
      help: "Pick everything that applies. The access you ask for is the biggest factor in how long approval takes.",
      multi: true,
      options: doc.does.map((d) => ({ id: d.id, title: d.label, hint: `Needs: ${d.scopes.join(", ")}` })),
    },
    {
      key: "who",
      title: `Who will connect their ${doc.name} account?`,
      help: "Opening your app to everyone is what usually triggers a provider review.",
      options: WHO.map((w) => {
        const level = levelFor(computeFacts(doc, { does, who: w.id, brand: "yes" }));
        return {
          id: w.id,
          title: w.label,
          hint: w.hint,
          extra: (
            <span className="row small muted" style={{ marginTop: 8, gap: 8 }}>
              <DifficultyMeter level={level} /> {LEVELS[level].plain}
            </span>
          ),
        };
      }),
    },
    {
      key: "brand",
      title: "Should users see your product's name when they connect?",
      help: "That's the consent screen users see when they click Connect.",
      options: BRAND.map((b) => ({
        id: b.id,
        title: b.id === "yes" ? "Yes, show my brand" : "Not yet",
        hint:
          b.id === "yes"
            ? "You'll register your own OAuth app with the provider."
            : doc.managed.available === true
              ? `A shared app already exists for ${doc.name}, so you may be able to skip setup for now.`
              : "A shared app is fine while you build and test.",
      })),
    },
  ];

  const q = questions[index];
  const isSelected = (id: string) => (q.multi ? answers.does.includes(id) : answers[q.key] === id);
  const canContinue = q.multi ? answers.does.length > 0 : Boolean(answers[q.key]);

  const finish = useCallback(
    (a: Answers) =>
      onDone({
        // Keep the guide's order so the URL and summary read consistently.
        does: doc.does.filter((d) => a.does.includes(d.id)).map((d) => d.id),
        who: a.who ?? "public",
        brand: a.brand ?? "yes",
      }),
    [onDone, doc.does]
  );

  const advance = useCallback(
    (a: Answers) => {
      if (index < questions.length - 1) setIndex(index + 1);
      else finish(a);
    },
    [index, questions.length, finish]
  );

  const choose = useCallback(
    (id: string) => {
      if (q.multi) {
        setAnswers((a) => ({ ...a, does: a.does.includes(id) ? a.does.filter((x) => x !== id) : [...a.does, id] }));
        return;
      }
      const next = { ...answers, [q.key]: id } as Answers;
      setAnswers(next);
      advance(next);
    },
    [q, answers, advance]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(e.target.tagName) && e.key === "Enter") return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) choose(q.options[n - 1].id);
      else if (e.key === "Enter" && canContinue) advance(answers);
      else if (e.key === "Backspace" && index > 0) setIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, choose, canContinue, advance, answers, index]);

  return (
    <div className="wizard">
      <Breadcrumbs current={doc.name} />
      <div className="wiz-app">
        <AppLogo name={doc.name} domain={doc.domain} small />
        Setting up {doc.name}
      </div>
      <div className="wiz-progress" aria-hidden>
        {questions.map((_, i) => (
          <i key={i} className={i <= index ? "on" : ""} />
        ))}
      </div>
      <div className="wiz-count">
        Question {index + 1} of {questions.length}
      </div>

      <div className="fade-in" key={index}>
        <h1 className="wiz-q" id="wiz-q">
          {q.title}
        </h1>
        <p className="wiz-help">{q.help}</p>

        <div className="options" role={q.multi ? "group" : "radiogroup"} aria-labelledby="wiz-q">
          {q.options.map((o, i) => (
            <button
              key={o.id}
              type="button"
              role={q.multi ? "checkbox" : "radio"}
              aria-checked={isSelected(o.id)}
              className={`option${q.multi ? " option-multi" : ""}`}
              onClick={() => choose(o.id)}
            >
              <span className={q.multi ? "option-check" : "option-radio"} aria-hidden>
                {q.multi && isSelected(o.id) ? "✓" : ""}
              </span>
              <span style={{ flex: 1 }}>
                <span className="option-title">{o.title}</span>
                {o.hint && <span className="option-hint">{o.hint}</span>}
                {o.extra}
              </span>
              <span className="option-key" aria-hidden>
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="wiz-nav">
        {index > 0 ? (
          <button className="btn btn-ghost" onClick={() => setIndex(index - 1)}>
            ← Back
          </button>
        ) : onCancel ? (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span />
        )}
        <span className="row" style={{ gap: 12 }}>
          {q.multi && (
            <span className="small muted">
              {answers.does.length ? `${answers.does.length} selected` : "Select at least one"}
            </span>
          )}
          {(q.multi || canContinue) && (
            <button className="btn btn-primary" disabled={!canContinue} onClick={() => advance(answers)}>
              {index === questions.length - 1 ? "See my plan" : "Continue"}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
