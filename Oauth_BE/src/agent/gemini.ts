import { GoogleGenAI } from "@google/genai";
import { config } from "../config";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!config.geminiKey) throw new Error("GEMINI_API_KEY is not set on the server.");
  client ??= new GoogleGenAI({ apiKey: config.geminiKey });
  return client;
}

// Search grounding needs separate quota. Once a call is refused, stop trying
// for the life of the process and rely on page fetching instead.
let searchAvailable = config.useSearch;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function status(e: unknown): number {
  const m = String((e as Error)?.message ?? e).match(/"code":\s*(\d{3})/);
  return m ? Number(m[1]) : 0;
}

export class AgentError extends Error {}

// Asks for JSON matching `schema`. Retries once on overload, then falls back
// to the second model.
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  signal?: AbortSignal;
}): Promise<T> {
  const models = [config.model, config.fallbackModel].filter(Boolean);
  let last: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (opts.signal?.aborted) throw new AgentError("Cancelled");
      try {
        const res = await ai().models.generateContent({
          model,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
            temperature: 0.2,
            abortSignal: opts.signal,
          },
        });
        const text = res.text ?? "";
        return JSON.parse(text) as T;
      } catch (e) {
        last = e;
        const code = status(e);
        if (e instanceof SyntaxError) continue; // malformed JSON: try again
        if (code === 503 || code === 500) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        if (code === 429 || code === 404) break; // try the fallback model
        throw new AgentError(`The model call failed: ${String((e as Error).message).slice(0, 200)}`);
      }
    }
  }
  const code = status(last);
  throw new AgentError(
    code === 429
      ? "The Gemini API key is out of quota right now. Try again in a minute."
      : code === 503
        ? "Gemini is overloaded right now. Try again in a minute."
        : "The model didn't return a usable answer."
  );
}

// Optional: let Google Search suggest documentation URLs. Returns [] when the
// key has no search quota.
export async function searchForUrls(question: string, signal?: AbortSignal): Promise<string[]> {
  if (!searchAvailable) return [];
  try {
    const res = await ai().models.generateContent({
      model: config.model,
      contents: question,
      config: { tools: [{ googleSearch: {} }], temperature: 0, abortSignal: signal },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return chunks.map((c) => c.web?.uri).filter((u): u is string => Boolean(u));
  } catch (e) {
    if (status(e) === 429 || status(e) === 403 || status(e) === 400) searchAvailable = false;
    return [];
  }
}

export function searchEnabled(): boolean {
  return searchAvailable;
}
