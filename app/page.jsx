"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import IntentSheet from "@/components/IntentSheet";
import { LIBRARY, findInLibrary } from "@/lib/guides";
import { GENERIC_DOES } from "@/lib/mockAgent";
import { intentQuery } from "@/lib/intent";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(null); // { def } or { query }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = LIBRARY.filter(
      (g) => g.name.toLowerCase().includes(q) || g.domain.includes(q) || findInLibrary(q)?.slug === g.slug
    ).map((def) => ({ type: "library", def }));
    const exact = findInLibrary(q);
    if (!exact) matches.push({ type: "new", query: query.trim() });
    return matches;
  }, [query]);

  function choose(item) {
    setFocused(false);
    if (item.type === "library") setPicked({ def: item.def });
    else setPicked({ query: item.query });
  }

  function submitIntent(intent) {
    if (picked.def) {
      router.push(`/guide/${picked.def.slug}?${intentQuery(intent)}`);
    } else {
      router.push(`/generate?${intentQuery({ app: picked.query, ...intent })}`);
    }
  }

  function onKeyDown(e) {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); choose(results[active] ?? results[0]); }
  }

  const showResults = focused && results.length > 0;

  return (
    <>
      <Topbar />
      <main className="page home">
        <h1>Which app will your users connect?</h1>
        <p className="lede">See the setup steps, the work involved and how long approval takes, before you start.</p>

        <div className="search">
          <input
            type="text"
            placeholder="App name or website, e.g. Notion or notion.so"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showResults}
            aria-controls="search-results"
            aria-label="Search for an app"
            autoComplete="off"
          />
          {showResults && (
            <ul className="results" id="search-results" role="listbox">
              {results.map((r, i) => (
                <li key={r.type === "library" ? r.def.slug : "new"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r)}
                  >
                    {r.type === "library" ? (
                      <>
                        <span>{r.def.name}</span>
                        <span className="sub">Ready-made guide</span>
                      </>
                    ) : (
                      <>
                        <span>Research “{r.query}”</span>
                        <span className="sub">Agent builds a guide, about a minute</span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="library" aria-labelledby="lib-title">
          <h2 id="lib-title">Ready-made guides</h2>
          {LIBRARY.map((def) => (
            <button key={def.slug} type="button" className="library-row" onClick={() => setPicked({ def })}>
              <span className="app-icon" aria-hidden="true">{def.name[0]}</span>
              <span>
                <span className="library-name">{def.name}</span>
                <span className="library-tag" style={{ display: "block" }}>{def.tagline}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      </main>

      {picked && (
        <IntentSheet
          appName={picked.def?.name ?? picked.query}
          doesOptions={picked.def?.does ?? GENERIC_DOES}
          onClose={() => setPicked(null)}
          onSubmit={submitIntent}
          submitLabel={picked.def ? "Show my path" : "Research this app"}
        />
      )}
    </>
  );
}
