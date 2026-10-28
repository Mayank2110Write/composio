import { levelFor, levelReasons } from "../scoring";

const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";

const sources = [
  { id: "gh-org-approve", kind: "official", publisher: "GitHub Docs", title: "Approving OAuth apps for your organization", url: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization" },
  { id: "gh-org-limits", kind: "official", publisher: "GitHub Docs", title: "Limiting OAuth app and GitHub App access requests", url: "https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests-and-installations" },
  { id: "gh-tokens", kind: "official", publisher: "GitHub Docs", title: "Token expiration and revocation", url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation" },
  { id: "gh-diff", kind: "official", publisher: "GitHub Docs", title: "Differences between GitHub Apps and OAuth apps", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps" },
  { id: "cmp-github", kind: "official", publisher: "Composio", title: "How to create GitHub OAuth credentials for Composio", url: "https://composio.dev/auth/github" },
  { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
  { id: "unified-gh", kind: "community", publisher: "Unified.to", title: "GitHub OAuth app setup notes", url: "https://docs.unified.to/skills/github-oauth-app/SKILL.md" },
];

const does = [
  { id: "read", label: "Read code, issues and pull requests", scopes: ["repo"], note: "OAuth apps have no read-only scope for private repositories, so reading private code still needs the full repo scope." },
  { id: "write", label: "Open issues and pull requests", scopes: ["repo"], note: "Writing to repositories uses the same repo scope." },
  { id: "workflows", label: "Change GitHub Actions workflows", scopes: ["repo", "workflow"], note: "Editing workflow files needs the extra workflow scope." },
];

export const github = {
  slug: "github",
  name: "GitHub",
  domain: "github.com",
  tagline: "Quick to register. The friction is inside your customers' organizations.",
  does,
  resolve(intent) {
    const choice = does.find((d) => d.id === intent.does) ?? does[0];
    const facts = { review: "none", installCap: null, publicReach: intent.who === "public" };
    const level = levelFor(facts);

    return {
      slug: "github",
      name: "GitHub",
      domain: "github.com",
      lastVerified: "28 Oct 2026",
      intentLabel: choice.label,
      managed: {
        available: true,
        note: "Composio names GitHub among the apps it provides a managed OAuth app for.",
        src: "cmp-managed",
      },
      facts,
      level,
      reasons: levelReasons(facts),
      time: {
        work: { text: "15–30 min", hours: 0.5 },
        wait: { text: "None from GitHub", days: 0 },
        buffer: intent.who === "team" ? null : { text: "Org approvals vary by customer", days: 2 },
      },
      cost: "Free",
      blocker: {
        text: "Your users connect, but the agent can't see their organization's repositories until an organization owner approves your app.",
        src: "gh-org-approve",
      },
      keySources: ["gh-org-approve", "gh-tokens", "gh-diff"],
      decisions: [
        {
          title: "OAuth App or GitHub App",
          choice: "This guide uses an OAuth App, which is what Composio's GitHub connection expects.",
          consequence: "OAuth App tokens act as the user and share the user's 5,000 requests per hour. A GitHub App gets limits that grow with the customer and repository-level permissions, but needs a different setup. Changing later means every user reconnects.",
          src: "gh-diff",
        },
        {
          title: "Scopes",
          choice: `You need: ${choice.scopes.join(", ")}`,
          consequence: choice.note,
          src: "gh-diff",
        },
        {
          title: "Who owns the app",
          choice: "Register it under your GitHub organization, not a personal account.",
          consequence: "An app owned by one person goes with them if they leave.",
          src: "cmp-github",
        },
      ],
      prerequisites: [
        { text: "A GitHub account with owner rights on the organization that will own the app.", src: "cmp-github" },
        { text: "The callback URL from your Composio auth config (or your own backend).", src: "cmp-managed" },
        { text: "A public homepage URL for your product. It appears on the consent screen.", src: "cmp-github" },
      ],
      phases: [
        {
          name: "Register",
          steps: [
            {
              who: "agent",
              title: "Check whether you need your own app yet",
              time: "Instant",
              detail: "Composio already runs a GitHub OAuth app. If your users don't need to see your name on the consent screen, you can skip this guide for now.",
              src: "cmp-managed",
            },
            {
              who: "you",
              title: "Open the new OAuth app form",
              time: "1 min",
              detail: "For an organization, go to the organization's Settings, then Developer settings, then OAuth Apps. The link below opens the form for your personal account.",
              link: { label: "Open GitHub's form", url: "https://github.com/settings/applications/new" },
              src: "cmp-github",
            },
            {
              who: "you",
              title: "Fill in the form",
              time: "5 min",
              detail: "Everything here is public and shows on the consent screen. Leave Device Flow off unless your agent runs in a terminal or on a device without a browser.",
              fields: [
                { label: "Application name", value: "Your product's name" },
                { label: "Homepage URL", value: "https://yourproduct.com" },
                { label: "Authorization callback URL", value: COMPOSIO_CALLBACK, copy: true },
              ],
              check: "Use the exact callback URL your Composio auth config shows. Older guides show a v1 URL that no longer applies.",
              src: "cmp-github",
            },
          ],
        },
        {
          name: "Configure",
          steps: [
            {
              who: "you",
              title: "Generate a client secret and copy both values",
              time: "2 min",
              detail: "Copy the client ID, then click Generate a new client secret. GitHub shows the secret only once, so store it in your secrets manager straight away.",
              src: "cmp-github",
            },
            {
              who: "you",
              title: "Create a GitHub auth config in Composio",
              time: "5 min",
              detail: `Choose OAuth2, turn on your own developer credentials, paste the client ID and secret, and request only: ${choice.scopes.join(", ")}.`,
              link: { label: "Open Composio auth configs", url: "https://dashboard.composio.dev" },
              src: "cmp-github",
            },
          ],
        },
        {
          name: "Test",
          steps: [
            {
              who: "you",
              title: "Connect a test account",
              time: "5 min",
              detail: "Connect your own GitHub account and run one tool call against a private repository in your organization.",
              check: "If personal repositories work but organization ones don't, the organization hasn't approved your app yet. See Blockers.",
              src: "gh-org-approve",
            },
          ],
        },
        {
          name: "Roll out",
          steps: [
            {
              who: "customer",
              title: "Customer's organization owner approves your app",
              time: "Minutes to days",
              detail: "OAuth apps need organization approval by default. A member can request it; only an owner can grant it, under Settings, then Third-party access, then OAuth app policy.",
              src: "gh-org-limits",
            },
          ],
        },
      ],
      approval: null,
      blockers: [
        {
          symptom: "A user connected, but the agent can't see their organization's repositories.",
          cause: "The organization restricts OAuth app access, and no owner has approved your app.",
          fix: "Send the customer the approval steps. Owners approve under Settings, then Third-party access, then OAuth app policy.",
          src: "gh-org-approve",
        },
        {
          symptom: "Older connections stop working after a user reconnects several times.",
          cause: "GitHub keeps only ten tokens per user, app and scope combination and revokes the oldest.",
          fix: "Reuse stored tokens instead of re-authorizing on every session.",
          src: "gh-tokens",
        },
        {
          symptom: "A connection that sat idle for a long time stops working.",
          cause: "GitHub revokes OAuth tokens that haven't been used in a year.",
          fix: "Detect the 401 response and send the user through the connect flow again.",
          src: "gh-tokens",
        },
        {
          symptom: "Large customers hit rate limits.",
          cause: "OAuth app tokens share the user's 5,000 requests per hour, and this doesn't grow with the customer.",
          fix: "Plan for a GitHub App if you expect heavy usage on big organizations.",
          src: "gh-diff",
        },
      ],
      rollout: [
        { text: "Tell customers up front that an organization owner may need to approve your app. Put the approval steps in your onboarding.", src: "gh-org-limits" },
        { text: "Your app won't be told when it loses access, for example when a user leaves an organization. Handle permission errors gracefully.", src: "gh-diff" },
      ],
      unknowns: [
        "Some third-party guides say OAuth app tokens expire after eight hours. GitHub's documentation says that applies to GitHub App user tokens, not OAuth app tokens, so this guide follows GitHub.",
      ],
      sources,
      changelog: [
        { date: "28 Oct 2026", text: "Guide created. Callback URL updated to Composio's v3 endpoint." },
      ],
    };
  },
};
