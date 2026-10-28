"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import GuideView, { ShareButton } from "@/components/GuideView";
import IntentSheet from "@/components/IntentSheet";
import { STAGES, GENERIC_DOES, generateGuide } from "@/lib/mockAgent";
import { intentQuery } from "@/lib/intent";

export default function GenerateClient() {
  const router = useRouter();
  const params = useSearchParams();
  const app = (params.get("app") || "").trim();
  const intent = {
    does: GENERIC_DOES.some((d) => d.id === params.get("does")) ? params.get("does") : "read",
    who: params.get("who") || "public",
    brand: params.get("brand") || "yes",
  };
  const key = `${app}|${intent.does}|${intent.who}|${intent.brand}`;

  const [stages, setStages] = useState({});
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    setStages({});
    setGuide(null);
    setError(null);
    generateGuide(app, intent, (id, status, detail) => {
      if (!cancelled) setStages((s) => ({ ...s, [id]: { status, detail } }));
    })
      .then((g) => !cancelled && setGuide(g))
      .catch(() => !cancelled && setError("The agent couldn't finish researching this app. Try again, or check the app name."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!app) {
    return (
      <>
        <Topbar />
        <main className="page home">
          <h1>Which app should the agent research?</h1>
          <p><Link href="/" className="btn">Search apps</Link></p>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="mock-banner">Mock mode: the agent's steps are simulated until the Gemini backend is connected.</div>
      <Topbar>{guide && <ShareButton />}</Topbar>
      <main className="page">
        {!guide && (
          <>
            <header className="guide-head">
              <h1>Researching {app}</h1>
              <p className="guide-meta">The agent reads the provider's docs and checks every source it cites.</p>
            </header>
            <ol className="trace" aria-live="polite">
              {STAGES.map((s) => {
                const st = stages[s.id];
                return (
                  <li key={s.id} className={st ? "" : "pending"}>
                    <span className={`state ${st?.status ?? ""}`} aria-hidden="true" />
                    <span>
                      <span className="label">{s.label}</span>
                      {st?.detail && <span className="detail">{st.detail}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            {error && (
              <div className="notice">
                <strong>Research stopped</strong>
                {error}
              </div>
            )}
          </>
        )}
        {guide && <GuideView guide={guide} intent={intent} onEditIntent={() => setEditing(true)} />}
      </main>
      {editing && (
        <IntentSheet
          appName={guide?.name ?? app}
          doesOptions={GENERIC_DOES}
          initial={intent}
          submitLabel="Research again"
          onClose={() => setEditing(false)}
          onSubmit={(next) => {
            setEditing(false);
            router.replace(`/generate?${intentQuery({ app, ...next })}`);
          }}
        />
      )}
    </>
  );
}
