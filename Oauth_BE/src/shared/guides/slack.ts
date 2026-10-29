import type { GuideDoc } from "../types";

const PUBLIC = { who: ["public" as const] };
const OUTSIDE = { who: ["few" as const, "public" as const] };
const READS = { does: ["read"] };

export const slack: GuideDoc = {
  slug: "slack",
  name: "Slack",
  domain: "slack.com",
  category: "Messaging",
  tagline: "Free to set up in minutes. Reading messages at scale needs a Marketplace listing.",
  origin: "library",
  lastVerified: "29 Oct 2026",
  does: [
    {
      id: "post",
      label: "Post messages and notifications",
      scopes: ["chat:write", "channels:read"],
      note: "Bot scopes only. The bot can post in channels it's been added to.",
    },
    {
      id: "read",
      label: "Read channel history and threads",
      scopes: ["channels:history", "channels:read", "groups:history"],
      note: "Reading history is what the 2025 rate limits target. Request groups:history only if you need private channels.",
    },
    {
      id: "search",
      label: "Search messages as the user",
      scopes: ["search:read (user scope)"],
      note: "Search needs a user token, not a bot token, so users see a stronger consent screen.",
    },
  ],
  factRules: [
    { when: { ...PUBLIC, ...READS }, set: { cap: "1 history request per minute, 15 messages each" } },
  ],
  reasons: [
    {
      when: { ...PUBLIC, ...READS },
      value: [
        "Commercially distributed apps that aren't in the Slack Marketplace can call conversations.history and conversations.replies only once a minute, for up to 15 messages. A Marketplace listing lifts this.",
      ],
    },
    { value: ["Creating and distributing a Slack app needs no review. Workspace admins may still need to approve it."] },
  ],
  managed: {
    available: null,
    note: "Check Composio's managed auth directory for Slack before you register. If a managed app exists, you can build on it while users don't need your brand.",
    src: "cmp-managed",
  },
  timing: [
    {
      when: { ...PUBLIC, ...READS },
      value: {
        work: { text: "1–2 hours", hours: 1.5 },
        wait: { text: "Marketplace review, several weeks", days: 30 },
        buffer: { text: "+2–4 weeks if Slack asks for changes", days: 20 },
      },
    },
    {
      when: OUTSIDE,
      value: {
        work: { text: "30–60 min", hours: 1 },
        wait: { text: "None from Slack", days: 0 },
        buffer: { text: "Workspace admin approval, varies", days: 3 },
      },
    },
    { value: { work: { text: "20–30 min", hours: 0.5 }, wait: { text: "None", days: 0 }, buffer: null } },
  ],
  cost: [{ value: "Free" }],
  blocker: [
    {
      when: { ...PUBLIC, ...READS },
      value: {
        text: "Your agent can read only 15 messages a minute per workspace until your app is listed in the Slack Marketplace. That's too slow for most summarizing or search agents.",
        src: "slack-ratelimit",
      },
    },
    {
      when: OUTSIDE,
      value: {
        text: "Workspaces with app approval turned on block your install until an admin approves it.",
        src: "slack-approval",
      },
    },
    { value: { text: "Nothing serious. The bot only sees channels it's been invited to, which surprises first-time users.", src: "slack-oauth" } },
  ],
  keySources: [
    { when: { ...PUBLIC, ...READS }, value: ["slack-ratelimit", "slack-marketplace"] },
    { value: ["slack-oauth", "slack-distribution"] },
  ],
  choices: [
    {
      title: "Bot token or user token",
      choice: "Use bot scopes unless the agent must act as the person.",
      consequence: "Bot tokens survive the installer leaving the company. User tokens break when that person is deactivated.",
      src: "slack-oauth",
    },
    { title: "Scopes", choice: "{{scopes}}", consequence: "{{doesNote}}", src: "slack-scopes" },
    {
      title: "Distribute publicly or list in the Marketplace",
      choice: "Public distribution lets any workspace install from your link. A Marketplace listing is optional, and it's reviewed.",
      consequence: "Since 2025, non-Marketplace apps get very low limits on reading message history. If your agent reads conversations, plan for a listing.",
      src: "slack-ratelimit",
      when: PUBLIC,
    },
  ],
  prerequisites: [
    { text: "A Slack workspace where you can install apps, for development.", src: "slack-oauth" },
    { text: "The callback URL from your Composio auth config. Slack requires HTTPS.", src: "slack-oauth" },
    { text: "A privacy policy, support page and landing page, if you plan to list in the Marketplace.", src: "slack-marketplace", when: PUBLIC },
  ],
  phases: [
    {
      name: "Register",
      steps: [
        {
          who: "agent",
          title: "Check whether you need your own app yet",
          time: "Instant",
          detail: "If a managed Slack app is available and your users don't need to see your name, build on that first.",
          src: "cmp-managed",
        },
        {
          who: "you",
          title: "Create a Slack app from scratch",
          time: "3 min",
          detail: "Pick your development workspace. You can distribute to other workspaces later.",
          link: { label: "Open Your Apps", url: "https://api.slack.com/apps" },
          src: "slack-oauth",
        },
      ],
    },
    {
      name: "Configure",
      steps: [
        {
          who: "you",
          title: "Add the redirect URL and scopes",
          time: "5 min",
          detail: "On OAuth & Permissions, add the redirect URL and only these scopes: {{scopes}}.",
          fields: [{ label: "Redirect URL", value: "{{callback}}", copy: true }],
          src: "slack-oauth",
        },
        {
          who: "you",
          title: "Copy the client ID, secret and signing secret",
          time: "2 min",
          detail: "They're on Basic Information. Paste the client ID and secret into a Composio auth config.",
          src: "slack-oauth",
        },
      ],
    },
    {
      name: "Test",
      steps: [
        {
          who: "you",
          title: "Install to your workspace and invite the bot",
          time: "5 min",
          detail: "Connect through your auth config, then invite the bot to a test channel with /invite and run one tool call.",
          check: "If calls return not_in_channel, the bot hasn't been invited to that channel.",
          src: "slack-oauth",
        },
      ],
    },
    {
      name: "Distribute",
      when: OUTSIDE,
      steps: [
        {
          who: "you",
          title: "Activate public distribution",
          time: "5 min",
          detail: "On Manage Distribution, work through the checklist (remove hard-coded tokens, use HTTPS) and activate. No review is needed for this.",
          src: "slack-distribution",
        },
      ],
    },
    {
      name: "Get listed",
      when: PUBLIC,
      steps: [
        {
          who: "you",
          title: "Prepare a Marketplace submission",
          time: "1–2 days",
          detail: "Slack's guidelines cover scopes, security answers, a privacy policy and support contacts. Request the narrowest scopes you can justify.",
          src: "slack-marketplace",
        },
        {
          who: "provider",
          title: "Slack reviews your app",
          time: "Several weeks",
          detail: "Slack tests your install flow and checks every scope is used. Reply to reviewer questions quickly.",
          src: "slack-marketplace",
        },
      ],
    },
    {
      name: "Roll out",
      steps: [
        {
          who: "customer",
          title: "Workspace admin approves your app",
          time: "Minutes to days",
          detail: "Many companies turn on app approval. Members can request your app; an admin or owner approves it.",
          src: "slack-approval",
          when: OUTSIDE,
        },
        {
          who: "you",
          title: "Share the install link with your team",
          time: "1 min",
          detail: "Teammates connect through your product. The bot still needs to be invited to each channel it should see.",
          src: "slack-oauth",
          when: { who: ["team"] },
        },
      ],
    },
  ],
  approval: [
    {
      when: PUBLIC,
      value: {
        summary: "A Marketplace listing is optional, but it's the only way to lift the message-history limits for apps used outside your company.",
        whileWaiting: [
          "Keep using public distribution. Installs work, only history reads are throttled.",
          "Design the agent to read recent messages from events instead of paging through history.",
        ],
        src: "slack-marketplace",
      },
    },
    { value: null },
  ],
  blockers: [
    {
      symptom: "conversations.history returns ratelimited after one call, or only 15 messages.",
      cause: "Your app is distributed outside your company and isn't in the Slack Marketplace.",
      fix: "Get listed, or switch to the Events API and keep your own copy of recent messages. Installs made before 29 May 2025 and internal apps aren't affected.",
      src: "slack-ratelimit",
      when: READS,
    },
    {
      symptom: "Calls fail with not_in_channel or channel_not_found.",
      cause: "Bots only see channels they've been invited to.",
      fix: "Ask users to /invite the bot, or prompt them in your onboarding.",
      src: "slack-oauth",
    },
    {
      symptom: "Users click Allow and see 'Request to install' instead.",
      cause: "Their workspace requires admin approval for apps.",
      fix: "Tell them an admin needs to approve it, and give admins a one-paragraph description of what the app accesses.",
      src: "slack-approval",
      when: OUTSIDE,
    },
  ],
  customerSide: [
    { text: "Admins on Enterprise Grid may need to approve your app at the organization level as well as per workspace.", src: "slack-approval", when: OUTSIDE },
    { text: "Slack's API terms limit how you can store and use message data, including for training models. Check them before you ship an agent that reads conversations.", src: "slack-terms", when: READS },
  ],
  unknowns: [
    { text: "Slack doesn't publish a Marketplace review time. 'Several weeks' comes from developer reports.", when: PUBLIC },
    { text: "We haven't confirmed whether Composio runs a managed Slack app for every scope set." },
  ],
  sources: [
    { id: "slack-oauth", kind: "official", publisher: "Slack Developer Docs", title: "Installing with OAuth", url: "https://docs.slack.dev/authentication/installing-with-oauth" },
    { id: "slack-scopes", kind: "official", publisher: "Slack Developer Docs", title: "Scopes reference", url: "https://docs.slack.dev/reference/scopes" },
    { id: "slack-distribution", kind: "official", publisher: "Slack Developer Docs", title: "Distributing your app", url: "https://docs.slack.dev/distribution" },
    { id: "slack-ratelimit", kind: "official", publisher: "Slack Developer Docs", title: "Rate limit changes for non-Marketplace apps (2025)", url: "https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps", checkedAt: "29 Oct 2026" },
    { id: "slack-marketplace", kind: "official", publisher: "Slack Developer Docs", title: "Slack Marketplace guidelines and requirements", url: "https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements" },
    { id: "slack-approval", kind: "official", publisher: "Slack Help Center", title: "Manage app approval for your workspace", url: "https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace" },
    { id: "slack-terms", kind: "official", publisher: "Slack", title: "API Terms of Service", url: "https://slack.com/terms-of-service/api" },
    { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
  ],
  changelog: [{ date: "29 Oct 2026", text: "Guide drafted from Slack's documentation. Steps not yet tested." }],
};
