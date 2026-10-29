// Does Composio already run a managed OAuth app for this toolkit? Composio's
// docs say to read the toolkit's composio_managed_auth_schemes field. That
// needs a Composio API key; without one we say it's unconfirmed.

const DOCS = "https://docs.composio.dev/toolkits/managed-auth";

export const COMPOSIO_SOURCE = {
  id: "cmp-managed",
  kind: "official" as const,
  publisher: "Composio Docs",
  title: "Managed auth: which toolkits Composio provides an OAuth app for",
  url: DOCS,
};

export async function managedApp(slug: string, name: string): Promise<{ available: boolean | null; note: string; src: string }> {
  const key = process.env.COMPOSIO_API_KEY;
  if (key) {
    try {
      const res = await fetch(`https://backend.composio.dev/api/v3/toolkits/${encodeURIComponent(slug)}`, {
        headers: { "x-api-key": key },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const body = (await res.json()) as { composio_managed_auth_schemes?: string[] };
        const managed = (body.composio_managed_auth_schemes ?? []).some((s) => /oauth/i.test(s));
        return managed
          ? { available: true, note: `Composio runs a managed OAuth app for ${name}.`, src: COMPOSIO_SOURCE.id }
          : { available: false, note: `Composio doesn't run a managed OAuth app for ${name}, so you need your own.`, src: COMPOSIO_SOURCE.id };
      }
    } catch {
      // Fall through to "unconfirmed".
    }
  }
  return {
    available: null,
    note: `We couldn't confirm whether Composio runs a managed app for ${name}. Check the toolkit's composio_managed_auth_schemes field before you register your own.`,
    src: COMPOSIO_SOURCE.id,
  };
}
