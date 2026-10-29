import type { AppSummary, GenerateEvent, GuideDoc } from "../types";
import type { Api } from "./types";

// Contract with Oauth_BE:
//   GET  /apps                -> AppSummary[]
//   GET  /apps?q=<query>      -> AppSummary[]
//   GET  /guides/<slug>       -> GuideDoc, or 404
//   POST /generate {query}    -> text/event-stream of GenerateEvent as `data:` lines
export function httpApi(base: string): Api {
  const root = base.replace(/\/$/, "");

  async function json<T>(path: string): Promise<T> {
    const res = await fetch(`${root}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  return {
    mode: "http",
    listApps: () => json<AppSummary[]>("/apps"),
    searchApps: (q) => json<AppSummary[]>(`/apps?q=${encodeURIComponent(q)}`),
    async getGuide(slug) {
      const res = await fetch(`${root}/guides/${encodeURIComponent(slug)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return (await res.json()) as GuideDoc;
    },
    async generate(query, onEvent, signal) {
      const res = await fetch(`${root}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ query }),
        signal,
      });
      if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("\n");
          if (data) onEvent(JSON.parse(data) as GenerateEvent);
        }
      }
    },
  };
}
