import type { GuideDoc } from "../types";

const OUTSIDE = { who: ["few" as const, "public" as const] };

export const notion: GuideDoc = {
  slug: "notion",
  name: "Notion",
  domain: "notion.so",
  category: "Docs and wikis",
  tagline: "No review at all. The catch is that users choose which pages your agent can see.",
  origin: "library",
  lastVerified: "29 Oct 2026",
  does: [
    { id: "read", label: "Read pages and databases", scopes: ["Read content"], note: "Notion uses capabilities, not scopes. Turn off the ones you don't need." },
    { id: "write", label: "Create and update pages", scopes: ["Read content", "Update content", "Insert content"], note: "Notion uses capabilities, not scopes. Turn off the ones you don't need." },
    { id: "comments", label: "Read and add comments", scopes: ["Read content", "Read comments", "Insert comments"], note: "Comment capabilities are separate from content capabilities." },
  ],
  vars: {
    type: [{ when: { who: ["team"] }, value: "Internal" }, { value: "Public" }],
  },
  factRules: [],
  reasons: [
    { when: { who: ["team"] }, value: ["Internal integrations work in your own workspace with no review."] },
    { value: ["Public integrations use OAuth with no Notion review. Only listing in Notion's integration gallery is reviewed."] },
  ],
  managed: {
    available: null,
    note: "Check Composio's managed auth directory for Notion. If it's listed, build on it while users don't need your brand.",
    src: "cmp-managed",
  },
  timing: [
    {
      when: OUTSIDE,
      value: { work: { text: "30–60 min", hours: 0.75 }, wait: { text: "None", days: 0 }, buffer: { text: "Workspace owner approval, varies", days: 2 } },
    },
    { value: { work: { text: "10–20 min", hours: 0.25 }, wait: { text: "None", days: 0 }, buffer: null } },
  ],
  cost: [{ value: "Free" }],
  blocker: [
    {
      value: {
        text: "Your agent only sees the pages a user picks while connecting. Users who skip the page picker connect successfully and then find the agent sees nothing.",
        src: "notion-auth",
      },
    },
  ],
  keySources: [{ value: ["notion-auth", "notion-start"] }],
  choices: [
    {
      title: "Internal or public integration",
      choice: "{{var.type}}",
      consequence: "Internal integrations use a single token and work only in your workspace. Public integrations use OAuth so any workspace can connect.",
      src: "notion-start",
    },
    { title: "Capabilities", choice: "{{scopes}}", consequence: "{{doesNote}}", src: "notion-capabilities" },
  ],
  prerequisites: [
    { text: "A Notion workspace where you're an owner.", src: "notion-start" },
    { text: "Your company name, website, privacy policy and terms of use URLs, and a support email.", src: "notion-auth", when: OUTSIDE },
    { text: "The callback URL from your Composio auth config.", src: "notion-auth", when: OUTSIDE },
  ],
  phases: [
    {
      name: "Register",
      steps: [
        {
          who: "agent",
          title: "Check whether you need your own integration yet",
          time: "Instant",
          detail: "If a managed Notion app is available and users don't need your brand, build on it first.",
          src: "cmp-managed",
        },
        {
          who: "you",
          title: "Create a new integration",
          time: "3 min",
          detail: "Choose {{var.type}} as the type and pick the workspace that owns it.",
          link: { label: "Open Notion integrations", url: "https://www.notion.so/profile/integrations" },
          src: "notion-start",
        },
      ],
    },
    {
      name: "Configure",
      steps: [
        {
          who: "you",
          title: "Set capabilities",
          time: "2 min",
          detail: "Turn on only: {{scopes}}. Leave user information off unless you need email addresses.",
          src: "notion-capabilities",
        },
        {
          who: "you",
          title: "Add the redirect URI and company details",
          time: "10 min",
          detail: "Public integrations need a redirect URI plus your company's website, privacy policy, terms and support email. These appear on the consent screen.",
          fields: [{ label: "Redirect URI", value: "{{callback}}", copy: true }],
          src: "notion-auth",
          when: OUTSIDE,
        },
        {
          who: "you",
          title: "Copy the OAuth client ID and secret",
          time: "2 min",
          detail: "Paste them into a Composio auth config.",
          src: "notion-auth",
          when: OUTSIDE,
        },
        {
          who: "you",
          title: "Copy the internal integration token",
          time: "1 min",
          detail: "Store it as an API key. Internal integrations don't use OAuth.",
          src: "notion-start",
          when: { who: ["team"] },
        },
      ],
    },
    {
      name: "Test",
      steps: [
        {
          who: "you",
          title: "Connect and share pages",
          time: "5 min",
          detail: "Connect a workspace and pick at least one page in the page picker, then run one tool call against it.",
          check: "If the call returns object_not_found, the page wasn't shared with the integration.",
          src: "notion-auth",
        },
      ],
    },
    {
      name: "Roll out",
      steps: [
        {
          who: "agent",
          title: "Write your onboarding hint",
          time: "Instant",
          detail: "Show this text right before users connect, so they don't skip the page picker.",
          draft: "On the next screen, choose the pages and databases you want your assistant to work with. It can't see anything you don't select. You can add more pages later from the page's ••• menu, under Connections.",
          src: "notion-auth",
        },
        {
          who: "customer",
          title: "Workspace owner allows the integration",
          time: "Varies",
          detail: "On Enterprise plans, owners can restrict which integrations members can add. If so, a workspace owner has to approve yours.",
          src: "notion-security",
          when: OUTSIDE,
        },
      ],
    },
  ],
  approval: [{ value: null }],
  blockers: [
    {
      symptom: "The connection works but every call returns object_not_found.",
      cause: "The user didn't share any pages with your integration during OAuth.",
      fix: "Ask them to add your integration to pages from the page's ••• menu, under Connections, or reconnect and pick pages.",
      src: "notion-auth",
    },
    {
      symptom: "Requests fail with rate_limited during bulk reads.",
      cause: "Notion allows an average of about three requests per second per integration.",
      fix: "Back off on HTTP 429 and respect the Retry-After header.",
      src: "notion-limits",
    },
    {
      symptom: "Members can't find or add your integration.",
      cause: "The workspace restricts integrations to an approved list.",
      fix: "Ask the workspace owner to allow it in Settings, under Connections.",
      src: "notion-security",
      when: OUTSIDE,
    },
  ],
  customerSide: [
    { text: "Access is per page. New pages aren't visible to your agent until someone shares them, unless they sit under a page that's already shared.", src: "notion-auth" },
  ],
  unknowns: [
    { text: "Notion has changed how public integration tokens are refreshed. Check the current token lifetime in the authorization docs before relying on long-lived tokens." },
    { text: "Requirements for listing in Notion's integration gallery aren't covered here, because listing isn't needed for OAuth to work.", when: { who: ["public"] } },
  ],
  sources: [
    { id: "notion-auth", kind: "official", publisher: "Notion Developers", title: "Authorization", url: "https://developers.notion.com/docs/authorization" },
    { id: "notion-start", kind: "official", publisher: "Notion Developers", title: "Build your first integration", url: "https://developers.notion.com/docs/create-a-notion-integration" },
    { id: "notion-capabilities", kind: "official", publisher: "Notion Developers", title: "Capabilities", url: "https://developers.notion.com/reference/capabilities" },
    { id: "notion-limits", kind: "official", publisher: "Notion Developers", title: "Request limits", url: "https://developers.notion.com/reference/request-limits" },
    { id: "notion-security", kind: "official", publisher: "Notion Help Center", title: "Add and manage connections", url: "https://www.notion.com/help/add-and-manage-connections-with-the-api" },
    { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
  ],
  changelog: [{ date: "29 Oct 2026", text: "Guide drafted from Notion's developer docs. Steps not yet tested." }],
};
