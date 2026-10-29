// Guides and agent runs, stored with libSQL. In production this is a Turso
// database (TURSO_DATABASE_URL), so generated guides survive between
// requests and their links work for anyone. Locally it's a SQLite file.
// Library guides are seeded on first use.

import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { LIBRARY } from "./shared/guides/index.js";
import { summarize } from "./shared/resolve.js";
import type { AppSummary, GenerateEvent, GuideDoc } from "./shared/types.js";

export type StorageKind = "turso" | "local-file" | "temporary";

// Serverless hosts only allow writes to the temp folder, which is wiped
// between instances. Fine for a quick check, not for sharing generated guides.
export const storageKind: StorageKind = config.tursoUrl ? "turso" : process.env.VERCEL ? "temporary" : "local-file";

// Connected on first use, so a bad database setting shows up as an error on
// /health instead of crashing the whole function at startup.
let client: Client | null = null;
function connect(): Client {
  if (storageKind === "turso") return createClient({ url: config.tursoUrl, authToken: config.tursoToken });
  const path = storageKind === "temporary" ? join(tmpdir(), "oauth-ready.db") : config.databasePath;
  mkdirSync(dirname(path), { recursive: true });
  return createClient({ url: `file:${path.split("\\").join("/")}` });
}

async function setup() {
  await db().batch(
    [
      `create table if not exists guides (
        slug text primary key,
        origin text not null,
        doc text not null,
        query text,
        created_at text not null default (datetime('now')),
        updated_at text not null default (datetime('now'))
      )`,
      `create table if not exists runs (
        id integer primary key autoincrement,
        query text not null,
        slug text,
        status text not null,
        error text,
        events text not null default '[]',
        started_at text not null default (datetime('now')),
        finished_at text
      )`,
    ],
    "write"
  );
  // Library guides always reflect the code that's deployed.
  await db().batch(
    LIBRARY.map((doc) => ({ sql: UPSERT, args: { slug: doc.slug, origin: "library", doc: JSON.stringify(doc), query: null } })),
    "write"
  );
}

const UPSERT = `
  insert into guides (slug, origin, doc, query) values (:slug, :origin, :doc, :query)
  on conflict(slug) do update set origin = excluded.origin, doc = excluded.doc, query = excluded.query, updated_at = datetime('now')
`;

function db(): Client {
  if (!client) throw new Error("Database used before it was ready");
  return client;
}

let ready: Promise<void> | null = null;
export function dbReady(): Promise<void> {
  ready ??= (async () => {
    client ??= connect();
    await setup();
  })().catch((e) => {
    ready = null; // let the next request retry
    client = null;
    throw e;
  });
  return ready;
}

export async function saveGuide(doc: GuideDoc, query: string) {
  await dbReady();
  await db().execute({ sql: UPSERT, args: { slug: doc.slug, origin: doc.origin, doc: JSON.stringify(doc), query } });
}

export async function getGuide(slug: string): Promise<(GuideDoc & { updatedAt: string }) | null> {
  await dbReady();
  const { rows } = await db().execute({ sql: "select doc, updated_at from guides where slug = ?", args: [slug] });
  const row = rows[0];
  return row ? { ...(JSON.parse(String(row.doc)) as GuideDoc), updatedAt: String(row.updated_at) } : null;
}

export async function listApps(): Promise<AppSummary[]> {
  await dbReady();
  const { rows } = await db().execute("select doc from guides order by origin = 'library' desc, updated_at desc");
  return rows.map((r) => summarize(JSON.parse(String(r.doc)) as GuideDoc));
}

export async function startRun(query: string): Promise<number> {
  await dbReady();
  const res = await db().execute({ sql: "insert into runs (query, status) values (?, 'running')", args: [query] });
  return Number(res.lastInsertRowid);
}

export async function finishRun(id: number, status: "done" | "failed", slug: string | null, events: GenerateEvent[], error?: string) {
  await db().execute({
    sql: "update runs set status = ?, slug = ?, events = ?, error = ?, finished_at = datetime('now') where id = ?",
    args: [status, slug, JSON.stringify(events), error ?? null, id],
  });
}

export async function recentRuns(limit = 20) {
  await dbReady();
  const { rows } = await db().execute({
    sql: "select id, query, slug, status, error, started_at, finished_at from runs order by id desc limit ?",
    args: [limit],
  });
  return rows;
}
