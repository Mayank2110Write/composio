import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceTagStatic } from "./EvidenceTagStatic";
import { LevelBadge } from "@/components/ui";
import { EVIDENCE, LEVELS, OWNERS } from "@/lib/scoring";
import type { EvidenceKind, Level, Owner } from "@/lib/types";

export const metadata = { title: "How we rate · OAuth Ready" };

const EXAMPLES: Record<Level, string> = {
  selfserve: "GitHub, Notion, Google sign-in",
  reviewed: "Google Calendar or send-email scopes, Microsoft 365 for other companies",
  gated: "HubSpot marketplace apps, Slack apps that read history",
  audited: "Google read-email or full Drive scopes",
};

export default function Method() {
  return (
    <div className="prose" style={{ paddingTop: 28 }}>
      <Breadcrumbs current="How we rate" />
      <h1 style={{ fontSize: 26 }}>How we rate difficulty and evidence</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Difficulty belongs to the app <em>and</em> what you ask for. Google takes an hour for sign-in and months for
        reading email. So every guide asks three questions first, then applies the same fixed rules.
      </p>

      <h2>Difficulty levels</h2>
      <p>A level names the kind of barrier you&apos;ll hit, not a score. The language model never picks it: the agent extracts facts, and code applies these rules in order.</p>
      <table>
        <tbody>
          {(Object.keys(LEVELS) as Level[]).map((l) => (
            <tr key={l}>
              <td style={{ width: 110 }}><LevelBadge level={l} /></td>
              <td>
                {LEVELS[l].meaning}
                <div className="faint small">e.g. {EXAMPLES[l]}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Time is two numbers, not one</h2>
      <p>
        Your hands-on work and the wait for the provider are shown separately, always as ranges, on one bar. A third
        striped segment shows extra time if something goes wrong. One hour of work is not the same as done in one hour.
      </p>

      <h2>Evidence labels</h2>
      <p>Every claim links to the source behind it. Code sets the label from the source&apos;s domain; the agent never rates its own sources.</p>
      <table>
        <tbody>
          {(Object.keys(EVIDENCE) as EvidenceKind[]).map((k) => (
            <tr key={k}>
              <td style={{ width: 120 }}><EvidenceTagStatic kind={k} /></td>
              <td>{EVIDENCE[k].meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 10 }}>
        <strong>Confidence</strong> in a verdict follows the weakest source behind its key claims: any Unverified source
        makes it Low, any Community source makes it Medium, otherwise High. Conflicts between sources are listed under
        &ldquo;What we&apos;re unsure of&rdquo;, not hidden.
      </p>

      <h2>Who does each step</h2>
      <table>
        <tbody>
          {(Object.keys(OWNERS) as Owner[]).map((o) => (
            <tr key={o}>
              <td style={{ width: 110 }}><span className={`owner owner-${o}`}>{OWNERS[o].label}</span></td>
              <td>{OWNERS[o].meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 10 }}>
        The agent checks for a managed app, recommends the narrowest scopes, fills in exact values and drafts the
        paperwork that usually blocks people. You own the provider accounts, verify domains, record demo videos, sign
        policies, pay for assessments and ask customers&apos; admins for approval.
      </p>

      <h2>What we checked</h2>
      <p>
        Library guides were written from provider documentation and labelled source by source. Every source and console
        link was opened on 29 Oct 2026; all resolved except HubSpot Community threads and the Microsoft Entra console,
        which block automated requests or need a sign-in. Key claims were read on the page itself, for example
        Slack&apos;s 2025 limit of one history request a minute for non-Marketplace apps, and Microsoft&apos;s 24-month
        maximum client secret lifetime.
      </p>
      <p>
        No step is marked Tested yet. Corrections made during research: Composio&apos;s GitHub guide shows an outdated
        callback URL; HubSpot guides from before mid-2026 describe a creation flow that no longer exists; a third-party
        claim that GitHub OAuth tokens expire in eight hours applies only to GitHub Apps.
      </p>

      <p style={{ marginTop: 28 }}>
        <Link href="/" className="btn">← Back to the home screen</Link>
      </p>
    </div>
  );
}
