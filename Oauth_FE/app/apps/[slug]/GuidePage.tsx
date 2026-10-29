"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GuideShell, type Tab } from "@/components/GuideShell";
import { Wizard } from "@/components/Wizard";
import { api } from "@/lib/api";
import { intentQuery, readIntent } from "@/lib/intent";
import { resolveGuide } from "@/lib/resolve";
import type { GuideDoc, Intent } from "@/lib/types";

type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; doc: GuideDoc };

const TABS: Tab[] = ["plan", "setup", "troubleshoot", "sources"];

// The URL holds the three answers, the tab and the current step, so any link
// opens exactly the same view. Without answers, the page asks the questions first.
export function GuidePage({ slug }: { slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    let live = true;
    api.getGuide(slug).then(
      (doc) => live && setState(doc ? { status: "ready", doc } : { status: "missing" }),
      (e: Error) => live && setState({ status: "error", message: e.message })
    );
    return () => {
      live = false;
    };
  }, [slug]);

  const doc = state.status === "ready" ? state.doc : null;
  const answered = params.has("does") && params.has("who") && params.has("brand");
  const editing = params.get("edit") === "1";
  const intent = useMemo(() => (doc ? readIntent(params, doc.does) : null), [doc, params]);
  const resolved = useMemo(() => (doc && intent ? resolveGuide(doc, intent) : null), [doc, intent]);
  const tab = (TABS as string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "plan";
  const step = params.get("step");

  useEffect(() => {
    if (doc) document.title = `${doc.name} OAuth plan · OAuth Ready`;
  }, [doc]);

  const go = (i: Intent, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(intentQuery(i));
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    router.push(`${pathname}?${q}`, { scroll: true });
  };

  if (state.status === "loading") {
    return (
      <div className="wizard" aria-busy>
        <Breadcrumbs />
        <div className="skeleton" style={{ height: 24, width: 180 }} />
        <div className="skeleton" style={{ height: 36, marginTop: 30 }} />
        <div className="skeleton" style={{ height: 260, marginTop: 20 }} />
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="gen stack">
        <Breadcrumbs current={slug} />
        <h1>We don&apos;t have a guide for &ldquo;{slug}&rdquo; yet</h1>
        <p className="muted">Guides from the demo agent are saved in the browser that created them. You can research it now.</p>
        <div className="row">
          <Link className="btn btn-primary" href={`/generate?q=${encodeURIComponent(slug)}`}>
            Research {slug} live
          </Link>
          <Link className="btn" href="/">
            Back to the home screen
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="gen stack">
        <Breadcrumbs current={slug} />
        <h1>Couldn&apos;t load this guide</h1>
        <p className="muted">{state.message}</p>
        <div className="row">
          <button className="btn" onClick={() => location.reload()}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/">
            Back to the home screen
          </Link>
        </div>
      </div>
    );
  }

  if (!answered || editing) {
    return (
      <Wizard
        doc={state.doc}
        initial={answered ? intent! : {}}
        onDone={(i) => go(i)}
        onCancel={answered ? () => go(intent!) : () => router.push("/")}
      />
    );
  }

  const g = resolved!;
  return (
    <GuideShell
      g={g}
      tab={tab}
      step={step}
      shareUrl={`${origin}${pathname}?${intentQuery(g.intent)}`}
      onTab={(t) => go(g.intent, t === "plan" ? {} : { tab: t })}
      onStep={(id) => go(g.intent, id ? { tab: "setup", step: id } : { tab: "setup" })}
      onEditAnswers={() => go(g.intent, { edit: "1" })}
    />
  );
}
