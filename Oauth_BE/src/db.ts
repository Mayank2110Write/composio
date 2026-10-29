// SQLite store for guides and agent runs. Library guides are seeded on start;
// generated guides are saved when the agent finishes, so their links work for
// anyone.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";
import { LIBRARY } from "./shared/guides";
import { summarize } from "./shared/resolve";
import type { AppSummary, GenerateEvent, GuideDoc } from "./shared/types";

mkdirSync(dirname(config.databasePath), { recursive: true });
const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  create table if not exists guides (
    slug text primary key,
    origin text not null,
    doc text not null,
    query text,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  );
  create table if not exists runs (
    id integer primary key autoincrement,
    query text not null,
    slug text,
    status text not null,
    error text,
    events text not null default '[]',
    started_at text not null default (datetime('now')),
    finished_at text
  );
`);

const upsert = db.prepare(`
  insert into guides (slug, origin, doc, query) values (@slug, @origin, @doc, @query)
  on conflict(slug) do update set origin = excluded.origin, doc = excluded.doc, query = excluded.query, updated_at = datetime('now')
`);

export function seedLibrary() {
  const tx = db.transaction(() => {
    for (const doc of LIBRARY) upsert.run({ slug: doc.slug, origin: "library", doc: JSON.stringify(doc), query: null });
  });
  tx();
}

export function saveGuide(doc: GuideDoc, query: string) {
  upsert.run({ slug: doc.slug, origin: doc.origin, doc: JSON.stringify(doc), query });
}

export function getGuide(slug: string): (GuideDoc & { updatedAt: string }) | null {
  const row = db.prepare("select doc, updated_at from guides where slug = ?").get(slug) as { doc: string; updated_at: string } | undefined;
  return row ? { ...(JSON.parse(row.doc) as GuideDoc), updatedAt: row.updated_at } : null;
}

export function listApps(): AppSummary[] {
  const rows = db.prepare("select doc from guides order by origin = 'library' desc, updated_at desc").all() as { doc: string }[];
  return rows.map((r) => summarize(JSON.parse(r.doc) as GuideDoc));
}

export function startRun(query: string): number {
  return Number(db.prepare("insert into runs (query, status) values (?, 'running')").run(query).lastInsertRowid);
}

export function finishRun(id: number, status: "done" | "failed", slug: string | null, events: GenerateEvent[], error?: string) {
  db.prepare("update runs set status = ?, slug = ?, events = ?, error = ?, finished_at = datetime('now') where id = ?").run(
    status,
    slug,
    JSON.stringify(events),
    error ?? null,
    id
  );
}

export function recentRuns(limit = 20) {
  return db
    .prepare("select id, query, slug, status, error, started_at, finished_at from runs order by id desc limit ?")
    .all(limit);
}
