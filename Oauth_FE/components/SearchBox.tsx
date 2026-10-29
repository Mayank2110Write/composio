"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { matchesQuery } from "@/lib/api/mock";
import type { AppSummary } from "@/lib/types";
import { AppLogo, DifficultyMeter, SearchIcon } from "./ui";

// Library apps open instantly; anything else goes to the research agent.
export function SearchBox({ apps, autoFocus }: { apps: AppSummary[]; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => (q.trim() ? apps.filter((a) => matchesQuery(a, q)).slice(0, 5) : []), [apps, q]);
  const options = q.trim() ? [...results.map((a) => ({ kind: "app" as const, app: a })), { kind: "generate" as const }] : [];

  useEffect(() => setActive(0), [q]);

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    if (o.kind === "app") router.push(`/apps/${o.app.slug}`);
    else router.push(`/generate?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        choose(active);
      }}
    >
      <SearchIcon />
      <label className="sr-only" htmlFor={`${listId}-input`}>
        App name or website
      </label>
      <input
        id={`${listId}-input`}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="e.g. Gmail, HubSpot, or any app's website"
        value={q}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={options.length ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="btn btn-primary" type="submit" disabled={!q.trim()}>
        Continue
      </button>

      {open && options.length > 0 && (
        <div className="card suggest" role="listbox" id={listId}>
          {options.map((o, i) => (
            <div
              key={o.kind === "app" ? o.app.slug : "generate"}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="suggest-item"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
            >
              {o.kind === "app" ? (
                <>
                  <AppLogo name={o.app.name} domain={o.app.domain} small />
                  <span className="grow">
                    {o.app.name} <span className="faint small">{o.app.domain}</span>
                  </span>
                  <DifficultyMeter level={o.app.levels[o.app.levels.length - 1]} />
                </>
              ) : (
                <>
                  <span className="mono-logo mono-logo-sm" style={{ background: "var(--surface-2)", color: "var(--text)" }} aria-hidden>
                    ✦
                  </span>
                  <span className="grow">
                    Research <strong>{q.trim()}</strong> live
                    <span className="faint small"> · about a minute</span>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
