"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { guideToMarkdown } from "@/lib/markdown";
import { WHO } from "@/lib/intent";
import { useProgress } from "@/lib/progress";
import type { ResolvedGuide } from "@/lib/types";
import { PlanView } from "./PlanView";
import { SourcesView, TroubleshootView } from "./ReferenceViews";
import { SetupView } from "./SetupView";
import { AppLogo, CopyButton } from "./ui";

export type Tab = "plan" | "setup" | "troubleshoot" | "sources";

export function GuideShell({
  g,
  tab,
  step,
  shareUrl,
  onTab,
  onStep,
  onEditAnswers,
}: {
  g: ResolvedGuide;
  tab: Tab;
  step: string | null;
  shareUrl: string;
  onTab: (t: Tab) => void;
  onStep: (id: string | null) => void;
  onEditAnswers: () => void;
}) {
  const { done, set } = useProgress(g.slug);
  const steps = g.phases.flatMap((p) => p.steps);
  const complete = steps.filter((s) => done[s.id]).length;

  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: "plan", label: "Plan" },
    { id: "setup", label: "Setup", count: `${complete}/${steps.length}` },
    { id: "troubleshoot", label: "Troubleshoot", count: String(g.blockers.length) },
    { id: "sources", label: "Sources", count: String(g.sources.length) },
  ];

  return (
    <article>
      <header className="shell-head">
        <Breadcrumbs current={g.name} />

        <div className="shell-title">
          <AppLogo name={g.name} domain={g.domain} large />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>Your {g.name} OAuth plan</h1>
            <p className="faint small" style={{ marginTop: 2 }}>
              {g.origin === "generated" ? "Researched live" : "Library guide"} · checked {g.lastVerified}
            </p>
          </div>
          <span className="row no-print share">
            <CopyButton text={shareUrl} label="Copy link" className="btn btn-sm" />
            <CopyButton text={guideToMarkdown(g, shareUrl)} label="Copy as Markdown" className="btn btn-sm" />
          </span>
        </div>

        <section className="card answers" aria-label="Your answers">
          <div className="answer answer-wide">
            <div className="answer-label">Your agent will</div>
            <ul className="answer-list">
              {g.doesOptions.map((d) => (
                <li key={d.id}>{d.label}</li>
              ))}
            </ul>
          </div>
          <div className="answer">
            <div className="answer-label">Who connects</div>
            <div className="answer-value">{WHO.find((w) => w.id === g.intent.who)!.label}</div>
          </div>
          <div className="answer">
            <div className="answer-label">Your brand on consent</div>
            <div className="answer-value">{g.intent.brand === "yes" ? "Yes" : "Not yet"}</div>
          </div>
          <button className="btn btn-sm no-print answer-edit" onClick={onEditAnswers}>
            Edit answers
          </button>
        </section>

        {g.origin === "generated" && (
          <div className="notice notice-warn small">
            <span aria-hidden>⚠</span>
            <span>
              <strong>Written by an agent.</strong> We haven&apos;t tested any of it. Check anything marked Community or
              Unverified before you rely on it.
            </span>
          </div>
        )}

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
              {t.label}
              {t.count && <span className="count">{t.count}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="panel" role="tabpanel">
        {tab === "plan" && <PlanView g={g} done={done} onStart={() => onTab("setup")} onSources={() => onTab("sources")} />}
        {tab === "setup" && (
          <SetupView g={g} done={done} setDone={set} current={step} onSelect={onStep} onTroubleshoot={() => onTab("troubleshoot")} />
        )}
        {tab === "troubleshoot" && <TroubleshootView g={g} />}
        {tab === "sources" && <SourcesView g={g} />}
      </div>
    </article>
  );
}
