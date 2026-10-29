// Runs the API on a local port. On Vercel, src/server.ts is used directly.

import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { storageKind } from "./db.js";
import app from "./server.js";

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(
    `OAuth Ready API on http://localhost:${info.port} · model ${config.model} · storage ${storageKind}${config.geminiKey ? "" : " · GEMINI_API_KEY missing"}`
  );
});
