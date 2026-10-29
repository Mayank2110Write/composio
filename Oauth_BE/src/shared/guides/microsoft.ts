import type { GuideDoc } from "../types.js";

const OUTSIDE = { who: ["few" as const, "public" as const] };
const ADMIN_ONLY = { does: ["directory"] };

export const microsoft: GuideDoc = {
  slug: "microsoft",
  name: "Microsoft 365",
  domain: "microsoft.com",
  category: "Email, calendar, files",
  tagline: "No app review, but other companies' admins decide whether your users can connect.",
  origin: "library",
  lastVerified: "29 Oct 2026",
  does: [
    { id: "signin", label: "Sign users in", scopes: ["openid", "profile", "email", "User.Read"], note: "Low-risk delegated permissions. Users can normally consent themselves." },
    { id: "mail", label: "Read and send email", scopes: ["Mail.ReadWrite", "Mail.Send", "offline_access"], note: "Users can consent to these in most tenants, unless the admin has turned user consent off." },
    { id: "calendar", label: "Manage calendar events", scopes: ["Calendars.ReadWrite", "offline_access"], note: "Users can consent to these in most tenants, unless the admin has turned user consent off." },
    { id: "files", label: "Read OneDrive and SharePoint files", scopes: ["Files.Read.All", "Sites.Read.All", "offline_access"], note: "Microsoft's default consent settings increasingly block user consent to file and site access. Expect admin consent." },
    { id: "directory", label: "Read users and groups in the organization", scopes: ["User.Read.All", "Group.Read.All"], note: "These always need an administrator's consent. No user can grant them." },
  ],
  vars: {
    accounts: [
      { when: { who: ["team"] }, value: "Accounts in this organizational directory only (single tenant)" },
      { value: "Accounts in any organizational directory and personal Microsoft accounts (multitenant)" },
    ],
  },
  factRules: [{ when: OUTSIDE, set: { review: "review" } }],
  reasons: [
    { when: { who: ["team"] }, value: ["A single-tenant app used inside your own organization needs no verification."] },
    {
      value: [
        "Microsoft doesn't review your app, but it checks who you are. Without publisher verification, most organizations' users can't consent to your multitenant app and must ask an admin.",
      ],
    },
  ],
  managed: {
    available: null,
    note: "Check Composio's managed auth directory for Outlook and other Microsoft toolkits. Each toolkit is listed separately.",
    src: "cmp-managed",
  },
  timing: [
    {
      when: OUTSIDE,
      value: {
        work: { text: "1–3 hours", hours: 2 },
        wait: { text: "Partner Center verification, 1–5 days", days: 3 },
        buffer: { text: "Each customer's admin consent, days to weeks", days: 14 },
      },
    },
    { value: { work: { text: "20–40 min", hours: 0.5 }, wait: { text: "None", days: 0 }, buffer: null } },
  ],
  cost: [{ value: "Free (Microsoft AI Cloud Partner Program membership is free)" }],
  blocker: [
    {
      when: OUTSIDE,
      value: {
        text: "Users at other companies see 'Need admin approval' instead of a consent screen. Their IT admin has to grant consent for the whole organization.",
        src: "ms-user-consent",
      },
    },
    {
      value: {
        text: "Client secrets expire, at most 24 months after you create them. When yours does, every connection stops working at once.",
        src: "ms-secret",
      },
    },
  ],
  keySources: [
    { when: OUTSIDE, value: ["ms-publisher", "ms-user-consent", "ms-consent"] },
    { value: ["ms-secret", "ms-consent"] },
  ],
  choices: [
    {
      title: "Supported account types",
      choice: "{{var.accounts}}",
      consequence: "Single tenant is simplest but only your organization can connect. You can change this later in the app's Authentication settings.",
      src: "ms-register",
    },
    { title: "Permissions", choice: "Delegated: {{scopes}}", consequence: "{{doesNote}}", src: "ms-permissions" },
    {
      title: "Publisher verification",
      choice: "Verify your app with a Microsoft AI Cloud Partner Program ID.",
      consequence: "Verified apps show a blue badge, and many tenants only allow user consent to verified publishers. Without it, expect admin approval almost everywhere.",
      src: "ms-publisher",
      when: OUTSIDE,
    },
  ],
  prerequisites: [
    { text: "A Microsoft Entra tenant and the Application Developer role (or higher) in it.", src: "ms-register" },
    { text: "The callback URL from your Composio auth config.", src: "ms-register" },
    { text: "A Microsoft AI Cloud Partner Program account whose domain matches your app's publisher domain.", src: "ms-publisher", when: OUTSIDE },
  ],
  phases: [
    {
      name: "Register",
      steps: [
        {
          who: "agent",
          title: "Check whether you need your own app yet",
          time: "Instant",
          detail: "If a managed Microsoft app is available for your toolkit and users don't need your brand, build on it first.",
          src: "cmp-managed",
        },
        {
          who: "you",
          title: "Register a new application",
          time: "5 min",
          detail: "In the Entra admin center, open App registrations and choose New registration.",
          fields: [
            { label: "Supported account types", value: "{{var.accounts}}" },
            { label: "Redirect URI (Web)", value: "{{callback}}", copy: true },
          ],
          link: { label: "Open App registrations", url: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" },
          src: "ms-register",
        },
      ],
    },
    {
      name: "Configure",
      steps: [
        {
          who: "you",
          title: "Add delegated permissions",
          time: "5 min",
          detail: "Under API permissions, add Microsoft Graph delegated permissions: {{scopes}}. Remove anything you don't use.",
          src: "ms-permissions",
        },
        {
          who: "you",
          title: "Create a client secret",
          time: "3 min",
          detail: "Under Certificates & secrets, create a secret and copy its value immediately. Paste the application (client) ID and secret into a Composio auth config.",
          check: "Secrets last 24 months at most, and Microsoft recommends under 12. Put the expiry date in your calendar now.",
          src: "ms-secret",
        },
      ],
    },
    {
      name: "Test",
      steps: [
        {
          who: "you",
          title: "Connect an account in your own tenant",
          time: "10 min",
          detail: "Connect and run one tool call. If you see 'Need admin approval', grant admin consent for your tenant under API permissions.",
          src: "ms-consent",
        },
      ],
    },
    {
      name: "Get verified",
      when: OUTSIDE,
      steps: [
        {
          who: "you",
          title: "Join the Microsoft AI Cloud Partner Program",
          time: "30 min, then 1–5 days",
          detail: "Partner Center verifies your company's details and email domain. This is the slow part of publisher verification.",
          link: { label: "Open Partner Center", url: "https://partner.microsoft.com/dashboard" },
          src: "ms-publisher",
        },
        {
          who: "you",
          title: "Set the publisher domain and add your Partner ID",
          time: "10 min",
          detail: "On the app's Branding & properties page, set a verified publisher domain that matches your Partner Center email domain, then add your Partner ID.",
          src: "ms-publisher",
        },
      ],
    },
    {
      name: "Roll out",
      steps: [
        {
          who: "agent",
          title: "Draft the admin consent request",
          time: "Instant",
          detail: "Send this to your customer's IT admin along with the admin consent link for your client ID.",
          draft:
            "Hi, we'd like to connect our AI assistant to Microsoft 365 for your team. It requests these delegated permissions: {{scopes}}. It acts only for the signed-in user and only when they ask it to. You can grant consent for your organization here: https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=<YOUR_CLIENT_ID>&scope=https://graph.microsoft.com/.default",
          src: "ms-admin-consent",
          when: OUTSIDE,
        },
        {
          who: "customer",
          title: "Customer's admin grants consent",
          time: "Days to weeks",
          detail: "If user consent is restricted in their tenant, an admin grants consent once for the whole organization, or approves requests through the admin consent workflow.",
          src: "ms-admin-consent",
          when: OUTSIDE,
        },
        {
          who: "you",
          title: "Grant admin consent for your organization",
          time: "2 min",
          detail: "Under API permissions, click Grant admin consent so teammates aren't prompted.",
          src: "ms-consent",
          when: { who: ["team"] },
        },
      ],
    },
  ],
  approval: [
    {
      when: OUTSIDE,
      value: {
        summary:
          "There's no app review. Microsoft verifies your organization through Partner Center, then each customer's admin decides whether to allow your app.",
        whileWaiting: [
          "Build and test in your own tenant.",
          "Prepare a short security and data-use summary for customers' IT teams. They will ask.",
        ],
        src: "ms-publisher",
      },
    },
    { value: null },
  ],
  blockers: [
    {
      symptom: "Users see 'Need admin approval' instead of a consent screen.",
      cause: "Their tenant blocks user consent for unverified apps, or for the permissions you request.",
      fix: "Complete publisher verification and send their admin the consent link.",
      src: "ms-user-consent",
      when: OUTSIDE,
    },
    {
      symptom: "Every connection fails with invalid_client on the same day.",
      cause: "The client secret expired.",
      fix: "Create a new secret, update the auth config, and set a reminder before the next expiry.",
      src: "ms-secret",
    },
    {
      symptom: "Personal Outlook.com accounts can't connect.",
      cause: "The app is registered for organizational accounts only.",
      fix: "Change supported account types to include personal Microsoft accounts.",
      src: "ms-register",
    },
    {
      symptom: "An admin consented but users still can't use the directory features.",
      cause: "Directory-wide permissions need admin consent and some only work for admins.",
      fix: "Confirm the admin granted consent for the whole organization, not just themselves.",
      src: "ms-permissions",
      when: ADMIN_ONLY,
    },
  ],
  customerSide: [
    { text: "Admins can restrict user consent to verified publishers only, or turn it off entirely. Ask enterprise customers early.", src: "ms-user-consent" },
    { text: "Admins can set up an admin consent workflow so users can request your app instead of hitting a dead end.", src: "ms-admin-consent" },
  ],
  unknowns: [
    { text: "Partner Center verification times vary by country and company. 1–5 days is a typical range, not a commitment.", when: OUTSIDE },
    { text: "Microsoft has been tightening default user consent for file and site permissions. Check the current default before you promise self-serve onboarding.", when: { does: ["files"] } },
  ],
  sources: [
    { id: "ms-register", kind: "official", publisher: "Microsoft Learn", title: "Register an application in Microsoft Entra ID", url: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app" },
    { id: "ms-secret", kind: "official", publisher: "Microsoft Learn", title: "Add credentials (client secret lifetime)", url: "https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials", checkedAt: "29 Oct 2026" },
    { id: "ms-permissions", kind: "official", publisher: "Microsoft Learn", title: "Microsoft Graph permissions reference", url: "https://learn.microsoft.com/en-us/graph/permissions-reference" },
    { id: "ms-consent", kind: "official", publisher: "Microsoft Learn", title: "Permissions and consent overview", url: "https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview" },
    { id: "ms-publisher", kind: "official", publisher: "Microsoft Learn", title: "Publisher verification", url: "https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview" },
    { id: "ms-user-consent", kind: "official", publisher: "Microsoft Learn", title: "Configure how users consent to applications", url: "https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent" },
    { id: "ms-admin-consent", kind: "official", publisher: "Microsoft Learn", title: "Configure the admin consent workflow", url: "https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow" },
    { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
  ],
  changelog: [{ date: "29 Oct 2026", text: "Guide drafted from Microsoft Learn. Steps not yet tested." }],
};
