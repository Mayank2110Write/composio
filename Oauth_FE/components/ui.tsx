"use client";

import { useState } from "react";
import { EVIDENCE, LEVELS, OWNERS } from "@/lib/scoring";
import type { Level, Owner, Source } from "@/lib/types";

export function LevelBadge({ level, large }: { level: Level; large?: boolean }) {
  return (
    <span className={`level level-${level}${large ? " level-lg" : ""}`} title={LEVELS[level].meaning}>
      {LEVELS[level].label}
    </span>
  );
}

export function DifficultyMeter({ level, large }: { level: Level; large?: boolean }) {
  const rank = LEVELS[level].rank;
  return (
    <span className={`meter meter-${level}${large ? " meter-lg" : ""}`} role="img" aria-label={`Difficulty ${rank + 1} of 4: ${LEVELS[level].label}`}>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i <= rank ? "on" : ""} />
      ))}
    </span>
  );
}

export function OwnerTag({ who }: { who: Owner }) {
  return (
    <span className={`owner owner-${who}`} title={OWNERS[who].meaning}>
      {OWNERS[who].label}
    </span>
  );
}

export function EvidenceTag({ id, sources }: { id: string; sources: Source[] }) {
  const s = sources.find((x) => x.id === id);
  if (!s) return null;
  const e = EVIDENCE[s.kind];
  return (
    <a
      className={`evidence evidence-${s.kind}`}
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={`${e.label}: ${e.meaning}\n${s.publisher}: ${s.title}`}
    >
      {e.label}
    </a>
  );
}

const PALETTE = ["#4338ca", "#0f766e", "#b45309", "#be123c", "#7e22ce", "#0369a1", "#15803d", "#a16207"];

// The app's own icon, looked up by domain. Falls back to a coloured letter
// when there's no domain or no icon (the service answers 404 for unknown sites).
export function AppLogo({ name, domain, large, small }: { name: string; domain?: string | null; large?: boolean; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = `${large ? " mono-logo-lg" : ""}${small ? " mono-logo-sm" : ""}`;
  if (domain && !failed) {
    return (
      <span aria-hidden className={`mono-logo logo-img${size}`}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span aria-hidden className={`mono-logo${size}`} style={{ background: PALETTE[n % PALETTE.length] }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function CopyButton({ text, label = "Copy", className = "btn btn-sm" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing else to do.
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function SearchIcon() {
  return (
    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
