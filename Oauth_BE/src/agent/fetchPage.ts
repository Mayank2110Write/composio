// Opens a page the way a reader would and keeps its text and links. Every URL
// the agent cites goes through here, so invented or dead links never reach a
// guide.

export type Page = {
  requestedUrl: string;
  url: string; // after redirects
  title: string;
  text: string;
  links: { url: string; text: string }[];
};

export type FetchResult = { ok: true; page: Page } | { ok: false; url: string; reason: string };

const UA = "OAuthReadyBot/0.1 (research agent for OAuth setup guides)";
const MAX_BYTES = 2_000_000;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function extractLinks(html: string, base: string): { url: string; text: string }[] {
  const out: { url: string; text: string }[] = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (let m; (m = re.exec(html)); ) {
    try {
      const url = new URL(decodeEntities(m[1]), base);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      url.hash = "";
      out.push({ url: url.toString(), text: htmlToText(m[2]).slice(0, 120) });
    } catch {
      // Malformed href.
    }
  }
  return out;
}

export async function fetchPage(url: string, timeoutMs = 12_000): Promise<FetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, url, reason: "Not a valid URL" };
  }
  try {
    const res = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
    });
    if (!res.ok) return { ok: false, url, reason: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!/html|text|markdown|json/.test(type)) return { ok: false, url, reason: `Not a text page (${type || "unknown type"})` };
    const buf = await res.arrayBuffer();
    const raw = new TextDecoder().decode(buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf);
    const isHtml = /html/.test(type) || /^\s*</.test(raw);
    const title = isHtml ? htmlToText(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") : "";
    const text = isHtml ? htmlToText(raw) : raw;
    if (text.length < 200) return { ok: false, url, reason: "Page has almost no readable text (may need JavaScript)" };
    return {
      ok: true,
      page: { requestedUrl: url, url: res.url || url, title: title || res.url, text, links: isHtml ? extractLinks(raw, res.url || url) : [] },
    };
  } catch (e) {
    const err = e as Error;
    return { ok: false, url, reason: err.name === "TimeoutError" ? "Timed out" : "Didn't resolve" };
  }
}
