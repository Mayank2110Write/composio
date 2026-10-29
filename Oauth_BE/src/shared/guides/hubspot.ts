import type { GuideDoc } from "../types";

const PUBLIC = { who: ["public" as const] };
const PRIVATE = { who: ["team" as const, "few" as const] };

export const hubspot: GuideDoc = {
  slug: "hubspot",
  name: "HubSpot",
  domain: "hubspot.com",
  category: "CRM",
  tagline: "Easy to start, then capped at 25 installs until HubSpot lists your app.",
  origin: "library",
  lastVerified: "28 Oct 2026",
  does: [
    {
      id: "crm",
      label: "Read and update contacts and deals",
      scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read"],
      note: "If a required scope isn't available on a customer's HubSpot plan, their install fails.",
    },
    {
      id: "automation",
      label: "Trigger marketing workflows",
      scopes: ["crm.objects.contacts.read", "automation (optional)"],
      note: "The automation scope needs Marketing Hub Professional or higher. Keeping it optional lets smaller accounts install anyway.",
    },
    { id: "tickets", label: "Handle support tickets", scopes: ["tickets"], note: "If a required scope isn't available on a customer's HubSpot plan, their install fails." },
  ],
  vars: {
    distribution: [{ when: PUBLIC, value: "marketplace" }, { value: "private" }],
  },
  factRules: [
    { when: PUBLIC, set: { cap: "25 installs" } },
    { when: { who: ["few"] }, set: { cap: "10 named accounts" } },
  ],
  reasons: [
    { when: PUBLIC, value: ["Marketplace apps are capped at 25 installs until HubSpot approves your listing."] },
    { value: ["Private distribution to up to 10 named accounts needs no HubSpot review."] },
  ],
  managed: {
    available: null,
    note: "We couldn't confirm whether Composio offers a managed HubSpot app. Check the toolkit's composio_managed_auth_schemes field.",
    src: "cmp-hubspot",
  },
  timing: [
    {
      when: PUBLIC,
      value: {
        work: { text: "1–2 hours", hours: 1.5 },
        wait: { text: "None to start, listing takes weeks", days: 30 },
        buffer: { text: "Up to 60 days of listing feedback", days: 60 },
      },
    },
    { value: { work: { text: "1–2 hours", hours: 1.5 }, wait: { text: "None", days: 0 }, buffer: null } },
  ],
  cost: [{ value: "Free" }],
  blocker: [
    {
      when: PUBLIC,
      value: {
        text: "Install number 26 fails. The cap lifts only when HubSpot approves your marketplace listing, and listing needs real customer installs first.",
        src: "hs-manage",
      },
    },
    {
      value: {
        text: "Private apps can be installed in at most 10 accounts. Going wider means switching to marketplace distribution.",
        src: "hs-manage",
      },
    },
  ],
  keySources: [{ when: PUBLIC, value: ["hs-manage", "hs-cap", "hs-3installs"] }, { value: ["hs-manage", "hs-oauth"] }],
  choices: [
    {
      title: "Distribution",
      choice: "Marketplace: any HubSpot account can install.",
      consequence: "Capped at 25 installs until your listing is approved. HubSpot doesn't grant exceptions.",
      src: "hs-cap",
      when: PUBLIC,
    },
    {
      title: "Distribution",
      choice: "Private: only accounts you add by ID can install.",
      consequence: "Capped at 10 accounts. Fine for a pilot, but you'll need a marketplace app to scale.",
      src: "hs-manage",
      when: PRIVATE,
    },
    { title: "Required or optional scopes", choice: "{{scopes}}", consequence: "{{doesNote}}", src: "hs-scopes" },
  ],
  prerequisites: [
    { text: "A HubSpot developer account, plus a free developer test account for installs.", src: "hs-manage" },
    { text: "Node.js 20 or later, to run the HubSpot CLI.", src: "hs-oauth" },
    { text: "The callback URL from your Composio auth config.", src: "cmp-hubspot" },
  ],
  phases: [
    {
      name: "Register",
      steps: [
        {
          who: "you",
          title: "Install and sign in to the HubSpot CLI",
          time: "10 min",
          detail: "HubSpot no longer lets you create new public apps in the browser. Apps are created as projects with the CLI.",
          fields: [
            { label: "Install", value: "npm install -g @hubspot/cli", copy: true },
            { label: "Sign in", value: "hs account auth", copy: true },
          ],
          check: "Guides and videos from before mid-2026 show a browser form that no longer exists.",
          src: "hs-legacy",
        },
        {
          who: "you",
          title: "Create the app project",
          time: "10 min",
          detail: 'Run the command, choose the App template, OAuth for authentication and "{{var.distribution}}" for distribution.',
          fields: [{ label: "Command", value: "hs project create", copy: true }],
          src: "hs-oauth",
        },
      ],
    },
    {
      name: "Configure",
      steps: [
        {
          who: "agent",
          title: "Write the auth block for app-hsmeta.json",
          time: "Instant",
          detail: "Paste this into your app's config, then upload the project with hs project upload.",
          draft:
            '{\n  "distribution": "{{var.distribution}}",\n  "auth": {\n    "type": "oauth",\n    "redirectUrls": ["{{callback}}"],\n    "requiredScopes": {{requiredScopesJson}},\n    "optionalScopes": {{optionalScopesJson}}\n  }\n}',
          src: "hs-scopes",
        },
        {
          who: "you",
          title: "Copy the client ID and secret",
          time: "2 min",
          detail: "In HubSpot, open Development, then Projects, then your app, then the Auth tab. Paste both into a Composio auth config.",
          src: "hs-oauth",
        },
        {
          who: "you",
          title: "Sign the Acceptable Use Policy",
          time: "5 min",
          detail: "Until it's signed, you can only install the app in developer test accounts.",
          src: "hs-manage",
        },
      ],
    },
    {
      name: "Test",
      steps: [
        {
          who: "you",
          title: "Install in a developer test account",
          time: "10 min",
          detail: "Install from the app's Distribution tab and run one tool call.",
          check: "The person installing must be a Super Admin or have App Marketplace access in that HubSpot account.",
          src: "hs-oauth",
        },
      ],
    },
    {
      name: "Get listed",
      when: PUBLIC,
      steps: [
        {
          who: "you",
          title: "Get your first real customer installs",
          time: "Weeks",
          detail: "Developers report needing at least three active installs in unrelated, paid HubSpot accounts before a listing can be submitted.",
          src: "hs-3installs",
        },
        {
          who: "you",
          title: "Prepare and submit the listing",
          time: "1–2 days",
          detail: "Every link must be live and public, and listed pricing must match your website. You can only have one app in review at a time.",
          src: "hs-listing",
        },
        {
          who: "provider",
          title: "HubSpot reviews your listing",
          time: "Up to 60 days",
          detail: "HubSpot says the review and feedback process should take no more than 60 days from when feedback is shared.",
          src: "hs-listing",
        },
      ],
    },
    {
      name: "Roll out",
      steps: [
        {
          who: "you",
          title: "Share the install link",
          time: "1 min",
          detail: "Marketplace apps use one install URL for every account. Track install count against the 25 limit.",
          src: "hs-manage",
          when: PUBLIC,
        },
        {
          who: "you",
          title: "Add each customer's account",
          time: "2 min per account",
          detail: "On the Distribution tab, add each customer's HubSpot account ID, then send them their install link.",
          src: "hs-manage",
          when: PRIVATE,
        },
        {
          who: "customer",
          title: "Customer's admin installs your app",
          time: "Minutes",
          detail: "Only a Super Admin or a user with App Marketplace access can install.",
          src: "hs-oauth",
        },
      ],
    },
  ],
  approval: [
    {
      when: PUBLIC,
      value: {
        summary:
          "HubSpot's Ecosystem Quality team reviews your listing for content, security and how well the app works. Until it's approved, you can't go past 25 installs.",
        whileWaiting: [
          "Use your 25 installs for design partners who will become the active installs you need to list.",
          "Make every link in your listing public. HubSpot's crawler checks them.",
        ],
        src: "hs-listing",
      },
    },
    { value: null },
  ],
  blockers: [
    {
      symptom: "A new customer gets an 'app install limit' error.",
      cause: "Unlisted marketplace apps are capped at 25 installs.",
      fix: "Get listed. HubSpot doesn't lift the cap any other way.",
      src: "hs-noexcept",
      when: PUBLIC,
    },
    {
      symptom: "Install fails for some customers but not others.",
      cause: "A required scope isn't included in that customer's HubSpot plan.",
      fix: "Move plan-dependent scopes to optionalScopes and check which ones were granted.",
      src: "hs-scopes",
    },
    {
      symptom: "Authorization fails right after the user approves.",
      cause: "The authorization code is valid for only 30 seconds, or the URL asked for a scope your app never declared.",
      fix: "Exchange the code immediately, and declare every scope you might request in app-hsmeta.json.",
      src: "hs-oauth",
    },
    {
      symptom: "You can't find the 'Create app' button described in a tutorial.",
      cause: "HubSpot disabled browser-based public app creation in 2026.",
      fix: "Use hs project create.",
      src: "hs-legacy",
    },
  ],
  customerSide: [
    { text: "Marketplace apps get 110 requests every 10 seconds per installed account.", src: "hs-usage" },
    { text: "Only a Super Admin or a user with App Marketplace access can install your app in their account.", src: "hs-oauth" },
    { text: "HubSpot has special marketplace requirements for AI connectors. Check them before you submit.", src: "hs-ai", when: PUBLIC },
  ],
  unknowns: [
    { text: "The 'three active installs' requirement comes from community answers and has changed before.", when: PUBLIC },
    { text: "One source says HubSpot access tokens expire after 30 minutes. We couldn't confirm this in HubSpot's own documentation." },
  ],
  sources: [
    { id: "hs-manage", kind: "official", publisher: "HubSpot Developers", title: "Manage apps in HubSpot (install limits, AUP)", url: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot" },
    { id: "hs-cap", kind: "official", publisher: "HubSpot Changelog", title: "New marketplace distribution app install limits", url: "https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits" },
    { id: "hs-scopes", kind: "official", publisher: "HubSpot Developers", title: "Scopes and account tiers", url: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes" },
    { id: "hs-oauth", kind: "official", publisher: "HubSpot Developers", title: "Working with OAuth", url: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth" },
    { id: "hs-listing", kind: "official", publisher: "HubSpot Developers", title: "App Marketplace listing requirements", url: "https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements" },
    { id: "hs-legacy", kind: "community", publisher: "CData", title: "Legacy public app creation disabled (May and June 2026)", url: "https://cdn.cdata.com/help/DHN/ado/pg_oauthcustomappcreate.htm" },
    { id: "hs-3installs", kind: "community", publisher: "HubSpot Community", title: "Three unaffiliated production installs needed to list", url: "https://community.hubspot.com/t5/APIs-Integrations/Hubspot-marketplace-app-lisitng/m-p/1217723" },
    { id: "hs-noexcept", kind: "community", publisher: "HubSpot Community", title: "No exceptions to the 25-install cap", url: "https://community.hubspot.com/t/app-installs-limit/152805" },
    { id: "hs-ai", kind: "community", publisher: "HubSpot Community", title: "Special marketplace requirements for AI connectors", url: "https://community.hubspot.com/t/ai-connector-as-legacy-public-app-install-limitation/148177" },
    { id: "hs-usage", kind: "official", publisher: "HubSpot Developers", title: "API usage guidelines and limits", url: "https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines" },
    { id: "cmp-hubspot", kind: "official", publisher: "Composio", title: "HubSpot OAuth setup for Composio", url: "https://composio.dev/auth/hubspot" },
  ],
  changelog: [{ date: "28 Oct 2026", text: "Guide created for the 2026 projects-based developer platform." }],
};
