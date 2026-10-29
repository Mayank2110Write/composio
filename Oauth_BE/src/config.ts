import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
  fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.1-flash-lite",
  useSearch: process.env.GEMINI_SEARCH !== "0",
  // Browsers send origins without a trailing slash, so drop any that were pasted in.
  corsOrigins: (process.env.CORS_ORIGIN ?? "*")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  databasePath: process.env.DATABASE_PATH ?? "data/oauth-ready.db",
  tursoUrl: process.env.TURSO_DATABASE_URL ?? "",
  tursoToken: process.env.TURSO_AUTH_TOKEN,
};
