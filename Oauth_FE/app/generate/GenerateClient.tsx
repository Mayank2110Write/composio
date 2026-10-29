"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchBox } from "@/components/SearchBox";
import { AppLogo } from "@/components/ui";
import { api } from "@/lib/api";
import { matchesQuery } from "@/lib/api/mock";
import { parseQuery } from "@/lib/api/mockAgent";
import { EVIDENCE } from "@/lib/scoring";
import type { AppSummary, GenerateEvent, Source } from "@/lib/types";

type Stage = { id: string; label: string; status: "running" | "done" | "failed"; detail?: string };
type Found = { source: Source; status: "kept" | "dropped"; reason?: string };

export function GenerateClient() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();

  const [library, setLibrary] = useState<AppSummary[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [found, setFound] = useState<Found[]>([]);
  const [facts, setFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    api.listApps().then(setLibrary, () => setLibrary([]));
  }, []);

  useEffect(() => {
    if (!q) return;
    setStages([]);
    setFound([]);
    setFacts([]);
    setError(null);
    setDoneSlug(null);
    setStartedAt(Date.now());

    const ctrl = new AbortController();
    const onEvent = (e: GenerateEvent) => {
      if (e.type === "stage") {
        setStages((prev) => {
          const i = prev.findIndex((s) => s.id === e.id);
          const next = { id: e.id, label: e.label, status: e.status, detail: e.detail };
          return i === -1 ? [...prev, next] : prev.map((s, j) => (j === i ? next : s));
        });
      } else if (e.type === "source") setFound((prev) => [...prev, { source: e.source, status: e.status, reason: e.reason }]);
      else if (e.type === "fact") setFacts((prev) => [...prev, e.text]);
      else if (e.type === "done") setDoneSlug(e.slug);
      else if (e.type === "error") setError(e.message);
    };
    api.generate(q, onEvent, ctrl.signal).catch((err: Error) => {
      if (err.name !== "AbortError") setError(err.message);
    });
    return () => ctrl.abort();
  }, [q, attempt]);

  useEffect(() => {
    if (!startedAt || doneSlug || error) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt, doneSlug, error]);

  useEffect(() => {
    if (!doneSlug) return;
    const t = setTimeout(() => router.push(`/apps/${doneSlug}`), 900);
    return () => clearTimeout(t);
  }, [doneSlug, router]);

  if (!q) {
    return (
      <div className="gen">
        <Breadcrumbs current="Research an app" />
        <h1>Research an app</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: 560 }}>
          Enter an app name or its website. The agent finds its developer docs, checks every link it cites, and writes a
          guide in the same format as the library.
        </p>
        <SearchBox apps={library} autoFocus />
      </div>
    );
  }

  const inLibrary = library.find((a) => a.origin === "library" && matchesQuery(a, q));
  const { name, domain } = parseQuery(q);

  return (
    <div className="gen">
      <Breadcrumbs current={`Researching ${name}`} />
      <div className="row" style={{ gap: 14 }}>
        <AppLogo name={name} domain={/[./]/.test(q) ? domain : null} large />
        <div>
          <h1 style={{ fontSize: 24 }}>Researching {name}</h1>
          <p className="muted small" style={{ marginTop: 2 }}>
            {doneSlug ? "Guide ready. Opening it…" : error ? "Research stopped." : `${elapsed}s · usually about a minute`}
            {api.mode === "mock" && " · simulated agent (no backend connected)"}
          </p>
        </div>
      </div>

      {inLibrary && (
        <div className="notice notice-info">
          <span aria-hidden>ⓘ</span>
          <div className="small">
            We already have a checked guide for {inLibrary.name}.{" "}
            <Link href={`/apps/${inLibrary.slug}`}>Open the library guide</Link>
          </div>
        </div>
      )}

      <section className="section">
        <h2>Progress</h2>
        <ul className="card stages" aria-live="polite">
          {stages.length === 0 && !error && (
            <li>
              <span className="stage-icon"><span className="spinner" /></span>
              Starting the agent…
            </li>
          )}
          {stages.map((s) => (
            <li key={s.id}>
              <span className="stage-icon" aria-label={s.status}>
                {s.status === "running" ? <span className="spinner" /> : s.status === "done" ? "✓" : "✕"}
              </span>
              <span className={s.status === "running" ? "" : "muted"}>{s.label}</span>
              {s.detail && <span className="faint small">{s.detail}</span>}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <div className="notice notice-warn">
          <span aria-hidden>⚠</span>
          <div className="small stack">
            <p><strong>The agent couldn&apos;t finish.</strong> {error}</p>
            <div className="row">
              <button className="btn btn-sm" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
              <Link className="btn btn-sm" href="/">Back to the home screen</Link>
            </div>
          </div>
        </div>
      )}

      {found.length > 0 && (
        <section className="section">
          <h2>Sources <span className="count">{found.filter((f) => f.status === "kept").length} kept</span></h2>
          <ul className="card found">
            {found.map((f, i) => (
              <li key={i}>
                <span className={`evidence evidence-${f.source.kind}`}>{EVIDENCE[f.source.kind].label}</span>
                <span className={f.status === "dropped" ? "dropped" : ""}>
                  {f.source.title} <span className="faint">{f.source.url}</span>
                </span>
                {f.reason && <span className="faint small">· {f.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {facts.length > 0 && (
        <section className="section">
          <h2>What it found</h2>
          <ul className="card found">
            {facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
