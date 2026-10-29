// The API as a Hono app. Vercel runs this file directly (default export);
// locally, src/local.ts serves it on a port.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { AgentError } from "./agent/gemini";
import { matchesQuery } from "./agent/query";
import { runAgent } from "./agent/run";
import { config } from "./config";
import { dbReady, finishRun, getGuide, listApps, recentRuns, startRun, storageKind } from "./db";
import type { GenerateEvent } from "./shared/types";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Server error", detail: String(err.message ?? err).slice(0, 300) }, 500);
});

app.get("/", (c) => c.json({ name: "OAuth Ready API", endpoints: ["GET /apps", "GET /guides/:slug", "POST /generate", "GET /runs", "GET /health"] }));

app.get("/health", async (c) => {
  let database = "ok";
  try {
    await dbReady();
  } catch (e) {
    database = `error: ${String((e as Error).message).slice(0, 200)}`;
  }
  return c.json({ ok: database === "ok", model: config.model, agentConfigured: Boolean(config.geminiKey), storage: storageKind, database });
});

app.get("/apps", async (c) => {
  const q = c.req.query("q") ?? "";
  const apps = await listApps();
  return c.json(q ? apps.filter((a) => matchesQuery(a, q)) : apps);
});

app.get("/guides/:slug", async (c) => {
  const doc = await getGuide(c.req.param("slug"));
  if (!doc) return c.json({ error: "Not found" }, 404);
  const { updatedAt: _updatedAt, ...guide } = doc;
  return c.json(guide);
});

// Recent agent runs, for checking what the agent did.
app.get("/runs", async (c) => c.json(await recentRuns()));

app.post("/generate", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { query?: string; refresh?: boolean };
  const query = (body.query ?? "").trim().slice(0, 200);
  if (!query) return c.json({ error: "Send { query: 'app name or website' }" }, 400);

  return streamSSE(c, async (stream) => {
    const events: GenerateEvent[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);
    stream.onAbort(() => controller.abort());

    // Writes are chained so events arrive in order and all of them are sent
    // before the stream closes.
    let writes = Promise.resolve();
    const emit = (e: GenerateEvent) => {
      events.push(e);
      writes = writes.then(() => stream.writeSSE({ data: JSON.stringify(e) })).catch(() => undefined);
    };

    let runId: number | null = null;
    try {
      runId = await startRun(query);
      const { slug } = await runAgent(query, emit, { refresh: body.refresh, signal: controller.signal });
      await finishRun(runId, "done", slug, events);
    } catch (e) {
      const message =
        e instanceof AgentError
          ? e.message
          : controller.signal.aborted
            ? "Research took too long and was stopped. Try again."
            : "Something went wrong while researching this app.";
      if (!(e instanceof AgentError)) console.error(e);
      emit({ type: "error", message });
      if (runId !== null) await finishRun(runId, "failed", null, events, String((e as Error)?.message ?? e)).catch(() => undefined);
    } finally {
      clearTimeout(timeout);
      await writes;
    }
  });
});

export default app;
