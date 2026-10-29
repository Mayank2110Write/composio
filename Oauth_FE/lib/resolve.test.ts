import { describe, expect, it } from "vitest";
import { LIBRARY } from "./guides";
import { github } from "./guides/github";
import { google } from "./guides/google";
import { hubspot } from "./guides/hubspot";
import { slack } from "./guides/slack";
import { levelRange, resolveGuide } from "./resolve";
import { WHO } from "./intent";
import type { Intent } from "./types";

const intent = (does: string | string[], who: Intent["who"] = "public", brand: Intent["brand"] = "yes"): Intent => ({
  does: Array.isArray(does) ? does : [does],
  who,
  brand,
});

describe("verdicts follow the developer's intent", () => {
  it("Google sign-in is self-serve, sending is reviewed, reading is audited", () => {
    expect(resolveGuide(google, intent("signin")).level).toBe("selfserve");
    expect(resolveGuide(google, intent("send")).level).toBe("reviewed");
    expect(resolveGuide(google, intent("read")).level).toBe("audited");
  });

  it("Google internal apps skip verification even for restricted scopes", () => {
    const g = resolveGuide(google, intent("read", "team"));
    expect(g.level).toBe("selfserve");
    expect(g.phases.map((p) => p.name)).not.toContain("Get approved");
  });

  it("HubSpot is gated only when anyone can install", () => {
    expect(resolveGuide(hubspot, intent("crm", "public")).level).toBe("gated");
    expect(resolveGuide(hubspot, intent("crm", "few")).level).toBe("selfserve");
  });

  it("Slack is gated only for public apps that read history", () => {
    expect(resolveGuide(slack, intent("read", "public")).level).toBe("gated");
    expect(resolveGuide(slack, intent("post", "public")).level).toBe("selfserve");
  });

  it("GitHub is self-serve for everyone", () => {
    expect(levelRange(github)).toEqual(["selfserve"]);
  });
});

describe("resolution", () => {
  it("fills templates", () => {
    const g = resolveGuide(hubspot, intent("crm", "few"));
    const draft = g.phases.flatMap((p) => p.steps).find((s) => s.draft)!.draft!;
    expect(draft).toContain('"distribution": "private"');
    expect(draft).toContain("backend.composio.dev");
    expect(JSON.stringify(g)).not.toMatch(/\{\{/);
  });

  it("offers to skip your own app only when a managed app exists and branding isn't needed", () => {
    expect(resolveGuide(github, intent("read", "public", "no")).canSkipOwnApp).toBe(true);
    expect(resolveGuide(github, intent("read", "public", "yes")).canSkipOwnApp).toBe(false);
    expect(resolveGuide(hubspot, intent("crm", "public", "no")).canSkipOwnApp).toBe(false);
  });

  it("falls back to the first intent option for unknown values", () => {
    expect(resolveGuide(google, intent("nonsense")).doesOptions.map((d) => d.id)).toEqual(["signin"]);
  });

  it("uses the strictest requirement when several things are picked", () => {
    expect(resolveGuide(google, intent(["signin", "send"])).level).toBe("reviewed");
    expect(resolveGuide(google, intent(["send", "read"])).level).toBe("audited");
    expect(resolveGuide(google, intent(["read", "send"])).level).toBe("audited");
  });

  it("combines scopes across picks", () => {
    const g = resolveGuide(hubspot, intent(["crm", "automation"], "few"));
    const draft = g.phases.flatMap((p) => p.steps).find((s) => s.draft)!.draft!;
    expect(draft).toContain('"optionalScopes": ["automation"]');
    expect(draft).toContain("crm.objects.deals.read");
    expect(draft).not.toContain("automation (optional)");
  });

  it("community sources lower confidence", () => {
    expect(resolveGuide(hubspot, intent("crm", "public")).confidence).toBe("Medium");
    expect(resolveGuide(github, intent("read")).confidence).toBe("High");
  });
});

describe("every library guide is well formed", () => {
  for (const doc of LIBRARY) {
    for (const d of doc.does) {
      for (const w of WHO) {
        it(`${doc.slug} / ${d.id} / ${w.id}`, () => {
          const g = resolveGuide(doc, intent(d.id, w.id));
          const ids = new Set(doc.sources.map((s) => s.id));
          const cited = [
            g.blocker.src,
            ...g.keySources,
            ...g.choices.map((c) => c.src),
            ...g.prerequisites.map((p) => p.src),
            ...g.phases.flatMap((p) => p.steps.map((s) => s.src)),
            ...g.blockers.map((b) => b.src),
            ...g.customerSide.map((c) => c.src),
            ...(g.approval ? [g.approval.src] : []),
          ];
          for (const src of cited) expect(ids, `missing source ${src}`).toContain(src);
          expect(JSON.stringify(g)).not.toMatch(/\{\{/);
          const stepIds = g.phases.flatMap((p) => p.steps.map((s) => s.id));
          expect(new Set(stepIds).size).toBe(stepIds.length);
        });
      }
    }
  }
});
