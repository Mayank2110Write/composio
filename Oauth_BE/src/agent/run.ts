// The research agent. The model proposes where to look, reads pages and
// writes; code opens every link, checks every quote, labels every source and
// scores the result. Progress streams to the browser as GenerateEvents.

import { getGuide, listApps, saveGuide } from "../db";
import { levelRange } from "../shared/resolve";
import { LEVELS } from "../shared/scoring";
import type { GenerateEvent, GuideDoc, Source } from "../shared/types";
import { assembleGuide, type VerifiedFact } from "./assemble";
import { COMPOSIO_SOURCE, managedApp } from "./composio";
import { labelSource, quoteFound } from "./evidence";
import { fetchPage, type Page } from "./fetchPage";
import { AgentError, generateJson, searchEnabled, searchForUrls } from "./gemini";
import {
  DISCOVER_SCHEMA,
  DISCOVER_SYSTEM,
  EXTRACT_SCHEMA,
  EXTRACT_SYSTEM,
  WRITE_SCHEMA,
  WRITE_SYSTEM,
  type Discovery,
  type ExtractedFact,
  type Written,
} from "./prompts";
import { writtenProblems } from "./quality";
import { matchesQuery, parseQuery, registrableDomain, slugify } from "./query";

const RELEVANT = /oauth|authori[sz]|scope|permission|review|verif|marketplace|listing|publish|distribut|rate.?limit|app.?(store|directory|gallery)|consent|redirect|install|security|token/i;
const MAX_PAGES = 14;
const PAGE_CHARS = 12_000;
const TOTAL_CHARS = 110_000;

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

const normUrl = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();

function relevance(p: Page): number {
  const hits = (p.url + " " + p.title + " " + p.text.slice(0, 20_000)).match(new RegExp(RELEVANT.source, "gi"));
  return hits?.length ?? 0;
}

const running = new Set<string>();

// `evaluate` runs the full pipeline without using or saving stored guides, so
// the agent can be compared with the hand-checked library.
export async function runAgent(
  query: string,
  emit: (e: GenerateEvent) => void,
  opts: { refresh?: boolean; signal?: AbortSignal; evaluate?: boolean } = {}
): Promise<{ slug: string; doc?: GuideDoc; facts?: VerifiedFact[] }> {
  const signal = opts.signal;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const parsed = parseQuery(query);

  const stage = async <T>(id: string, label: string, fn: () => Promise<T>, detail?: (r: T) => string | undefined): Promise<T> => {
    emit({ type: "stage", id, label, status: "running" });
    try {
      const r = await fn();
      emit({ type: "stage", id, label, status: "done", detail: detail?.(r) });
      return r;
    } catch (e) {
      emit({ type: "stage", id, label, status: "failed" });
      throw e;
    }
  };

  // A checked library guide always beats a generated one.
  const library = opts.evaluate ? undefined : listApps().find((a) => a.origin === "library" && matchesQuery(a, query));
  if (library) {
    await stage("library", `Found a checked guide for ${library.name}`, async () => null);
    emit({ type: "done", slug: library.slug });
    return { slug: library.slug };
  }

  // 1. Who is this provider, and where might their docs be?
  const discovery = await stage(
    "identify",
    `Identifying ${parsed.name} and where its developer docs live`,
    () =>
      generateJson<Discovery>({
        system: DISCOVER_SYSTEM,
        prompt: `App: ${query}${parsed.domain ? `\nWebsite: ${parsed.domain}` : ""}`,
        schema: DISCOVER_SCHEMA,
        signal,
      }),
    (d) => `${d.name} · ${d.domain}`
  );
  if (!discovery.supportsOAuth) {
    throw new AgentError(`${discovery.name} doesn't appear to offer OAuth for third-party apps, so there's no OAuth app to set up.`);
  }
  const name = discovery.name || parsed.name;
  const domain = registrableDomain(parsed.domain ?? discovery.domain);
  const slug = slugify(name) || parsed.slug;

  const existing = opts.evaluate ? null : getGuide(slug);
  if (existing && !opts.refresh) {
    await stage("cached", `Found a guide we researched on ${existing.updatedAt.slice(0, 10)}`, async () => null);
    emit({ type: "done", slug });
    return { slug };
  }
  if (running.has(slug)) throw new AgentError(`Someone is already researching ${name}. Try again in a minute.`);
  running.add(slug);

  try {
    // 2. Candidate pages: the model's suggestions, common developer-site
    // addresses, and Google Search when the key allows it.
    const candidates = await stage(
      "search",
      "Collecting candidate documentation pages",
      async () => {
        const found = [
          ...discovery.candidateUrls.map((c) => c.url),
          discovery.developerConsoleUrl,
          `https://developers.${domain}`,
          `https://developer.${domain}`,
          `https://docs.${domain}`,
          ...(await searchForUrls(`${name} OAuth app registration, scopes and app review requirements developer documentation`, signal)),
        ].filter((u) => /^https?:\/\//.test(u ?? ""));
        return [...new Map(found.map((u) => [normUrl(u), u])).values()].slice(0, 16);
      },
      (c) => `${c.length} to check${searchEnabled() ? "" : " · web search unavailable on this key"}`
    );

    // 3. Open every candidate. Dead and invented links are dropped here.
    const pages: Page[] = [];
    const seen = new Set<string>();
    // Addresses we guessed (developers.<domain> and so on) fail quietly; links
    // the model or search suggested are shown as dropped when they don't load.
    const guessed = new Set([`https://developers.${domain}`, `https://developer.${domain}`, `https://docs.${domain}`]);
    const open = async (urls: string[]) => {
      const results = await mapLimit(urls, 6, (u) => fetchPage(u));
      for (const r of results) {
        if (r.ok) {
          const key = normUrl(r.page.url);
          if (seen.has(key)) continue;
          seen.add(key);
          pages.push(r.page);
          emit({
            type: "source",
            source: { id: key, kind: labelSource(r.page.url, domain), publisher: new URL(r.page.url).hostname, title: r.page.title.slice(0, 100), url: r.page.url },
            status: "kept",
          });
        } else if (!guessed.has(r.url)) {
          emit({
            type: "source",
            source: { id: r.url, kind: "unverified", publisher: "", title: r.url, url: r.url },
            status: "dropped",
            reason: r.reason,
          });
        }
      }
    };
    await stage("open", "Opening every candidate page", () => open(candidates), () => `${pages.length} loaded`);

    // 4. Follow links on the provider's own docs towards OAuth, scopes and review.
    await stage(
      "follow",
      "Following links to OAuth, scopes and review pages",
      async () => {
        const official = pages.filter((p) => labelSource(p.url, domain) === "official");
        const scored = new Map<string, number>();
        for (const p of official) {
          for (const l of p.links) {
            if (labelSource(l.url, domain) !== "official" || seen.has(normUrl(l.url))) continue;
            const s = (l.url.match(new RegExp(RELEVANT.source, "gi"))?.length ?? 0) * 2 + (l.text.match(new RegExp(RELEVANT.source, "gi"))?.length ?? 0);
            if (s > 0) scored.set(l.url, Math.max(scored.get(l.url) ?? 0, s));
          }
        }
        const next = [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.max(0, MAX_PAGES - pages.length)).map(([u]) => u);
        const before = pages.length;
        await open(next);
        return pages.length - before;
      },
      (n) => `${n} more page${n === 1 ? "" : "s"}`
    );
    if (pages.length === 0) throw new AgentError(`We couldn't open any documentation for ${name}. Try its website address instead of its name.`);

    // Sources, labelled by domain.
    const ranked = [...pages].sort((a, b) => relevance(b) - relevance(a));
    const sources: Source[] = ranked.map((p, i) => ({
      id: `s${i + 1}`,
      kind: labelSource(p.url, domain),
      publisher: new URL(p.url).hostname.replace(/^www\./, ""),
      title: (p.title || p.url).replace(/\s+/g, " ").slice(0, 110),
      url: p.url,
      checkedAt: today,
    }));
    const sourceFor = new Map<string, { id: string; page: Page }>();
    ranked.forEach((p, i) => {
      sourceFor.set(normUrl(p.url), { id: `s${i + 1}`, page: p });
      sourceFor.set(normUrl(p.requestedUrl), { id: `s${i + 1}`, page: p });
    });

    // 5. Read the pages and extract facts, each with an exact quote.
    let budget = TOTAL_CHARS;
    const corpus = ranked
      .map((p) => {
        const take = Math.min(PAGE_CHARS, budget);
        budget -= take;
        return take > 500 ? `=== PAGE ${p.url}\nTITLE: ${p.title}\n${p.text.slice(0, take)}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
    const extracted = await stage(
      "read",
      `Reading ${Math.min(ranked.length, Math.ceil(TOTAL_CHARS / PAGE_CHARS))} pages for setup steps, review rules and limits`,
      () =>
        generateJson<{ facts: ExtractedFact[] }>({
          system: EXTRACT_SYSTEM,
          prompt: `Provider: ${name} (${domain})\n\n${corpus}`,
          schema: EXTRACT_SCHEMA,
          signal,
        }),
      (r) => `${r.facts.length} facts found`
    );

    // 6. Code checks every quote against the page it cites.
    const facts: VerifiedFact[] = await stage(
      "verify",
      "Checking every quote against its page",
      async () =>
        (extracted.facts ?? []).map((f, i) => {
          const hit = sourceFor.get(normUrl(f.url));
          const verified = Boolean(hit && quoteFound(f.quote, hit.page.text));
          return { id: `F${i + 1}`, ...f, verified, sourceId: hit?.id ?? null };
        }).slice(0, 40),
      (fs) => `${fs.filter((f) => f.verified).length} of ${fs.length} confirmed`
    );
    for (const f of facts.filter((x) => x.verified && ["review", "audit", "cap", "admin_consent", "distribution"].includes(x.topic)).slice(0, 6)) {
      emit({ type: "fact", text: f.statement, src: f.sourceId ?? undefined });
    }

    // 7. Managed app?
    const managed = await stage("managed", "Checking whether Composio already runs an app for it", () => managedApp(slug, name), (m) =>
      m.available === null ? "unconfirmed" : m.available ? "yes" : "no"
    );

    // 8. Write the guide from the facts.
    const factList = facts
      .map((f) => `${f.id} [${f.verified ? "CONFIRMED" : "UNCONFIRMED"}] (${f.topic}) ${f.statement}`)
      .join("\n");
    const writePrompt = `Provider: ${name} (${domain})\nDeveloper console: ${discovery.developerConsoleUrl || "unknown"}\nManaged app by Composio: ${managed.available === null ? "unknown" : managed.available}\n\nFacts (prefer CONFIRMED; treat UNCONFIRMED with caution):\n${factList || "(none found)"}`;
    const written = await stage("write", "Writing steps and blockers from confirmed facts", async () => {
      let out = await generateJson<Written>({ system: WRITE_SYSTEM, prompt: writePrompt, schema: WRITE_SCHEMA, signal });
      // One retry with specific feedback if the draft is too thin to follow.
      const problems = writtenProblems(out);
      if (problems.length) {
        out = await generateJson<Written>({
          system: WRITE_SYSTEM,
          prompt: `${writePrompt}\n\nYour previous draft had these problems. Fix them:\n- ${problems.join("\n- ")}`,
          schema: WRITE_SCHEMA,
          signal,
        });
      }
      return out;
    });

    // 9. Check step links, assemble and score with fixed rules.
    const doc = await stage(
      "score",
      "Checking links and scoring difficulty with fixed rules",
      async () => {
        const liveLinks = new Set(pages.flatMap((p) => [p.url, p.requestedUrl]));
        const links = [...new Set(written.phases.flatMap((p) => p.steps.map((s) => s.linkUrl)).filter((u) => u && !liveLinks.has(u)))];
        const checked = await mapLimit(links, 6, (u) => fetchPage(u, 8000));
        checked.forEach((r, i) => {
          if (r.ok) liveLinks.add(links[i]);
        });
        return assembleGuide({
          app: { name, domain, slug, category: discovery.category || "Researched live", consoleUrl: discovery.developerConsoleUrl },
          written,
          facts,
          sources: [...sources, COMPOSIO_SOURCE],
          managed,
          liveLinks,
          pagesRead: pages.length,
          today,
        });
      },
      (d) => levelRange(d).map((l) => LEVELS[l].label).join(" to ")
    );

    if (!opts.evaluate) saveGuide(doc, query);
    emit({ type: "done", slug });
    return { slug, doc, facts };
  } finally {
    running.delete(slug);
  }
}
