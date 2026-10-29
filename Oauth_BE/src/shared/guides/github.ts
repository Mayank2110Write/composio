import type { GuideDoc } from "../types.js";

export const github: GuideDoc = {
  slug: "github",
  name: "GitHub",
  domain: "github.com",
  category: "Developer tools",
  tagline: "Quick to register. The friction is inside your customers' organizations.",
  origin: "library",
  lastVerified: "29 Oct 2026",
  does: [
    {
      id: "read",
      label: "Read code, issues and pull requests",
      scopes: ["repo"],
      note: "OAuth apps have no read-only scope for private repositories, so reading private code still needs the full repo scope.",
    },
    { id: "write", label: "Open issues and pull requests", scopes: ["repo"], note: "Writing to repositories uses the same repo scope." },
    { id: "workflows", label: "Change GitHub Actions workflows", scopes: ["repo", "workflow"], note: "Editing workflow files needs the extra workflow scope." },
  ],
  factRules: [],
  managed: {
    available: true,
    note: "Composio lists GitHub among the apps it runs a managed OAuth app for.",
    src: "cmp-managed",
  },
  timing: [
    { when: { who: ["team"] }, value: { work: { text: "15–30 min", hours: 0.5 }, wait: { text: "None from GitHub", days: 0 }, buffer: null } },
    {
      value: {
        work: { text: "15–30 min", hours: 0.5 },
        wait: { text: "None from GitHub", days: 0 },
        buffer: { text: "Org approvals vary by customer", days: 2 },
      },
    },
  ],
  cost: [{ value: "Free" }],
  blocker: [
    {
      value: {
        text: "Your users connect, but the agent can't see their organization's repositories until an organization owner approves your app.",
        src: "gh-org-approve",
      },
    },
  ],
  keySources: [{ value: ["gh-org-approve", "gh-tested", "gh-diff"] }],
  choices: [
    {
      title: "OAuth App or GitHub App",
      choice: "This guide uses an OAuth App, which is what Composio's GitHub connection expects.",
      consequence:
        "OAuth App tokens act as the user and share the user's 5,000 requests per hour. A GitHub App gets limits that grow with the customer and repository-level permissions, but needs a different setup. Changing later means every user reconnects.",
      src: "gh-diff",
    },
    { title: "Scopes", choice: "You need: {{scopes}}", consequence: "{{doesNote}}", src: "gh-diff" },
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
          detail:
            "Composio already runs a GitHub OAuth app. If your users don't need to see your name on the consent screen, you can skip this guide for now.",
          src: "cmp-managed",
        },
        {
          who: "you",
          title: "Open the new OAuth app form",
          time: "1 min",
          detail:
            "For an organization, go to the organization's Settings, then Developer settings, then OAuth Apps. The link below opens the form for your personal account.",
          link: { label: "Open GitHub's form", url: "https://github.com/settings/applications/new" },
          src: "gh-tested",
        },
        {
          who: "you",
          title: "Fill in the form",
          time: "5 min",
          detail:
            "Everything here is public and shows on the consent screen. Leave Device Flow off unless your agent runs in a terminal or on a device without a browser.",
          fields: [
            { label: "Application name", value: "Your product's name", example: true },
            { label: "Homepage URL", value: "https://yourproduct.com", example: true },
            { label: "Redirect URI", value: "{{callback}}", copy: true },
          ],
          check:
            "The form calls this field Redirect URI (older guides say Authorization callback URL). GitHub only redirects to the exact URI you register, so use the one your Composio auth config shows. Older guides show a v1 URL that no longer applies.",
          src: "gh-tested",
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
          detail:
            "Copy the client ID, then click Generate a new client secret. GitHub shows the secret only once, so store it in your secrets manager straight away.",
          src: "cmp-github",
        },
        {
          who: "you",
          title: "Create a GitHub auth config in Composio",
          time: "5 min",
          detail: "Choose OAuth2, turn on your own developer credentials, paste the client ID and secret, and request only: {{scopes}}.",
          check:
            "Auth configs live in Composio's developer platform, not the Apps screen. Adding GitHub from the Apps screen connects through Composio's managed app instead of yours.",
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
          check: "If personal repositories work but organization ones don't, the organization hasn't approved your app yet. See If you get stuck.",
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
          detail:
            "OAuth apps need organization approval by default. A member can request it; only an owner can grant it, under Settings, then Third-party access, then OAuth app policy.",
          src: "gh-org-limits",
          when: { who: ["few", "public"] },
        },
        {
          who: "you",
          title: "Approve the app for your own organization",
          time: "2 min",
          detail: "As an organization owner, approve the app under Settings, then Third-party access, then OAuth app policy.",
          src: "gh-org-limits",
          when: { who: ["team"] },
        },
      ],
    },
  ],
  approval: [{ value: null }],
  blockers: [
    {
      symptom: "Connections stop working about 8 hours after a user connects.",
      cause: "Access tokens for this OAuth app expired after 8 hours (expires_in: 28800). The token response also included a refresh token valid for about 6 months.",
      fix: "Store the refresh token and exchange it for a new access token before the 8 hours are up. Composio handles this if it manages the connection.",
      src: "gh-tested",
    },
    {
      symptom: "Token exchange fails with bad_verification_code.",
      cause: "The authorization code expired. A code used about 10 minutes after it was issued was rejected.",
      fix: "Exchange the code for a token immediately after the redirect. If it expired, send the user through authorization again.",
      src: "gh-tested",
    },
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
  customerSide: [
    {
      text: "Tell customers up front that an organization owner may need to approve your app. Put the approval steps in your onboarding.",
      src: "gh-org-limits",
    },
    {
      text: "Your app isn't told when it loses access, for example when a user leaves an organization. Handle permission errors gracefully.",
      src: "gh-diff",
    },
  ],
  unknowns: [
    {
      text: "An earlier version of this guide said OAuth App tokens don't expire on a timer. Our test app (registered 29 Oct 2026 with default settings) received 8-hour tokens and a 6-month refresh token, so the guide now says they expire. We haven't confirmed whether older OAuth apps or a setting change this.",
    },
    {
      text: "Not tested: creating a Composio auth config with your own client ID and secret. The Composio screen we reached only offered Composio's managed GitHub app.",
    },
    {
      text: "Not tested: organization approval. The test used a personal account, so the org-approval blocker rests on GitHub's docs.",
    },
  ],
  sources: [
    { id: "gh-tested", kind: "tested", publisher: "OAuth Ready setup attempt", title: "Registered an OAuth App, authorized it, exchanged the code and called /user (29 Oct 2026)", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps", checkedAt: "29 Oct 2026" },
    { id: "gh-org-approve", kind: "official", publisher: "GitHub Docs", title: "Approving OAuth apps for your organization", url: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization" },
    { id: "gh-org-limits", kind: "official", publisher: "GitHub Docs", title: "Limiting OAuth app and GitHub App access requests", url: "https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests-and-installations" },
    { id: "gh-tokens", kind: "official", publisher: "GitHub Docs", title: "Token expiration and revocation", url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation" },
    { id: "gh-diff", kind: "official", publisher: "GitHub Docs", title: "Differences between GitHub Apps and OAuth apps", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps" },
    { id: "cmp-github", kind: "official", publisher: "Composio", title: "How to create GitHub OAuth credentials for Composio", url: "https://composio.dev/auth/github" },
    { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
    { id: "unified-gh", kind: "community", publisher: "Unified.to", title: "GitHub OAuth app setup notes", url: "https://docs.unified.to/skills/github-oauth-app/SKILL.md" },
  ],
  changelog: [
    { date: "28 Oct 2026", text: "Guide created. Callback URL updated to Composio's v3 endpoint." },
    {
      date: "29 Oct 2026",
      text: "Tested by registering a real OAuth App. Corrected token expiry (8 hours, with a refresh token), renamed the field to Redirect URI, and added the code-expiry blocker.",
    },
  ],
};
