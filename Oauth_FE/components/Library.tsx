"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AppSummary, Level } from "@/lib/types";
import { SearchBox } from "./SearchBox";
import { AppLogo, DifficultyMeter } from "./ui";

const HARDEST: Record<Level, string> = {
  selfserve: "No approval needed",
  reviewed: "Can need a provider review",
  gated: "Can be capped until listed",
  audited: "Can need a security audit",
};

function rangeText(a: AppSummary): string {
  if (a.origin === "generated") return "Researched live · unverified";
  return HARDEST[a.levels[a.levels.length - 1]];
}

export function Library() {
  const [apps, setApps] = useState<AppSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listApps().then(setApps, (e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Know what it takes to get your OAuth app approved</h1>
        <p>Pick the app your users will connect. Answer three questions. Get a step-by-step plan with honest timelines.</p>
        <SearchBox apps={apps ?? []} autoFocus />
        <div className="how">
          <div className="how-step">
            <span className="how-num">1</span>
            <div>
              <strong>Pick an app</strong>
              <span>From the library, or any app by name or website</span>
            </div>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <div>
              <strong>Answer 3 questions</strong>
              <span>What your agent does decides how hard it gets</span>
            </div>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <div>
              <strong>Follow your plan</strong>
              <span>One step at a time, with values to copy</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-title">
        <h2>Ready-made guides</h2>
        <Link href="/method" className="small">
          How we rate difficulty
        </Link>
      </div>

      {error && <p className="notice notice-warn">Couldn&apos;t load the library: {error}</p>}

      <div className="tiles">
        {apps === null
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 76 }} />)
          : apps.map((a) => (
              <Link key={a.slug} href={`/apps/${a.slug}`} className="card tile">
                <AppLogo name={a.name} domain={a.domain} />
                <div className="grow">
                  <div className="tile-name">{a.name}</div>
                  <div className="tile-sub">{rangeText(a)}</div>
                </div>
                <DifficultyMeter level={a.levels[a.levels.length - 1]} />
                <span className="tile-arrow" aria-hidden>
                  ›
                </span>
              </Link>
            ))}
      </div>

      <div className="card generate-cta">
        <div>
          <div style={{ fontWeight: 600 }}>Don&apos;t see your app?</div>
          <div className="muted small">Type its name or website in the search box. An agent reads its developer docs and builds a guide while you watch.</div>
        </div>
        <Link href="/generate" className="btn">
          Research an app
        </Link>
      </div>
    </>
  );
}
