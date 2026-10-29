import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { AgentError } from "./agent/gemini";
import { matchesQuery } from "./agent/query";
import { runAgent } from "./agent/run";
import { config } from "./config";
import { finishRun, getGuide, listApps, recentRuns, seedLibrary, startRun } from "./db";
import type { GenerateEvent } from "./shared/types";

seedLibrary();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/", (c) => c.json({ name: "OAuth Ready API", endpoints: ["GET /apps", "GET /guides/:slug", "POST /generate", "GET /runs", "GET /health"] }));

app.get("/health", (c) => c.json({ ok: true, model: config.model, agentConfigured: Boolean(config.geminiKey) }));

app.get("/apps", (c) => {
  const q = c.req.query("q") ?? "";
  const apps = listApps();
  return c.json(q ? apps.filter((a) => matchesQuery(a, q)) : apps);
});

app.get("/guides/:slug", (c) => {
  const doc = getGuide(c.req.param("slug"));
  if (!doc) return c.json({ error: "Not found" }, 404);
  const { updatedAt: _updatedAt, ...guide } = doc;
  return c.json(guide);
});

// Recent agent runs with their full event log, for checking what the agent did.
app.get("/runs", (c) => c.json(recentRuns()));

app.post("/generate", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { query?: string; refresh?: boolean };
  const query = (body.query ?? "").trim().slice(0, 200);
  if (!query) return c.json({ error: "Send { query: 'app name or website' }" }, 400);

  return streamSSE(c, async (stream) => {
    const events: GenerateEvent[] = [];
    const runId = startRun(query);
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

    try {
      const { slug } = await runAgent(query, emit, { refresh: body.refresh, signal: controller.signal });
      finishRun(runId, "done", slug, events);
    } catch (e) {
      const message =
        e instanceof AgentError
          ? e.message
          : controller.signal.aborted
            ? "Research took too long and was stopped. Try again."
            : "Something went wrong while researching this app.";
      if (!(e instanceof AgentError)) console.error(e);
      emit({ type: "error", message });
      finishRun(runId, "failed", null, events, String((e as Error)?.message ?? e));
    } finally {
      clearTimeout(timeout);
      await writes;
    }
  });
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`OAuth Ready API on http://localhost:${info.port} · model ${config.model}${config.geminiKey ? "" : " · GEMINI_API_KEY missing"}`);
});
