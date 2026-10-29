import type { GuideDoc, When } from "../types.js";

const SENSITIVE: When = { does: ["calendar", "send"], who: ["few", "public"] };
const RESTRICTED: When = { does: ["read", "drive"], who: ["few", "public"] };
const NEEDS_REVIEW: When = { review: ["review", "audit"] };

export const google: GuideDoc = {
  slug: "google",
  name: "Google",
  domain: "google.com",
  category: "Email, calendar, files",
  tagline: "Anywhere from an hour to a few months. The scopes you request decide which.",
  origin: "library",
  lastVerified: "28 Oct 2026",
  does: [
    { id: "signin", label: "Sign users in", scopes: ["openid", "email", "profile"], note: "Non-sensitive. This is already the narrowest scope for the job." },
    { id: "files", label: "Work with files the user picks", scopes: ["drive.file"], note: "Non-sensitive. This is already the narrowest scope for the job." },
    { id: "calendar", label: "Manage calendar events", scopes: ["calendar.events"], note: "Sensitive. This is already the narrowest scope for editing events." },
    { id: "send", label: "Send email", scopes: ["gmail.send"], note: "Sensitive. This is already the narrowest scope for sending." },
    { id: "read", label: "Read email", scopes: ["gmail.readonly"], note: "Restricted. If the agent only sends, use gmail.send instead. That moves you from Audited to Reviewed." },
    { id: "drive", label: "Read all of a user's Drive", scopes: ["drive.readonly"], note: "Restricted. If the user can pick the files, drive.file needs no review at all." },
  ],
  vars: {
    audience: [{ when: { who: ["team"] }, value: "Internal" }, { value: "External" }],
  },
  factRules: [
    { when: SENSITIVE, set: { review: "review" } },
    { when: RESTRICTED, set: { review: "audit" } },
  ],
  reasons: [
    { when: { who: ["team"] }, value: ["Apps limited to your own Google Workspace don't need verification."] },
    { when: { review: ["audit"] }, value: ["At least one scope you need is restricted. Google reviews your app and you need a yearly third-party security assessment."] },
    { when: { review: ["review"] }, value: ["At least one scope you need is sensitive. Google reviews your app before it's open to everyone."] },
    { value: ["The scopes you need are non-sensitive, so no verification is needed."] },
  ],
  managed: {
    available: true,
    note: "Composio lists Gmail among the apps it runs a managed OAuth app for. Check other Google toolkits individually.",
    src: "cmp-managed",
  },
  timing: [
    {
      when: { review: ["audit"] },
      value: {
        work: { text: "2–5 days", hours: 30 },
        wait: { text: "4 weeks to 3 months", days: 60 },
        buffer: { text: "+2–4 weeks if the assessor finds issues to fix", days: 20 },
      },
    },
    {
      when: { review: ["review"] },
      value: {
        work: { text: "4–8 hours", hours: 6 },
        wait: { text: "Up to 10 days", days: 10 },
        buffer: { text: "+1–2 weeks if Google asks for changes", days: 10 },
      },
    },
    { value: { work: { text: "About 1 hour", hours: 1 }, wait: { text: "None", days: 0 }, buffer: null } },
  ],
  cost: [{ when: { review: ["audit"] }, value: "Assessor fee, set by the assessor" }, { value: "Free" }],
  blocker: [
    {
      when: { review: ["audit"] },
      value: { text: "The security assessment. It's run by a third party, costs money and must be repeated every 12 months.", src: "g-annual" },
    },
    {
      when: { review: ["review"] },
      value: {
        text: "You need a homepage and privacy policy on a domain you own, verified in Search Console, before Google will review you.",
        src: "g-requirements",
      },
    },
    { value: { text: "In testing mode, connections expire after 7 days. Publish the app before real users rely on it.", src: "g-audience" } },
  ],
  keySources: [
    { when: { review: ["audit"] }, value: ["g-audience", "g-restricted", "g-requirements"] },
    { value: ["g-audience", "g-sensitive", "g-requirements"] },
  ],
  choices: [
    { title: "Scopes", choice: "{{scopes}}", consequence: "{{doesNote}}", src: "nylas-g" },
    {
      title: "Internal or external",
      choice: "Internal: only accounts in your Google Workspace can connect.",
      consequence: "No verification needed, but customers outside your Workspace can never connect. Switch to External before you go public.",
      src: "g-audience",
      when: { who: ["team"] },
    },
    {
      title: "Internal or external",
      choice: "External: any Google account can connect.",
      consequence: "Sensitive and restricted scopes need verification before you can go beyond 100 users.",
      src: "g-audience",
      when: { who: ["few", "public"] },
    },
  ],
  prerequisites: [
    { text: "A Google account that can create Google Cloud projects.", src: "g-audience" },
    { text: "A homepage on a domain you own, with a link to your privacy policy.", src: "g-requirements", when: NEEDS_REVIEW },
    { text: "Access to that domain's DNS settings, to verify it in Search Console.", src: "g-requirements", when: NEEDS_REVIEW },
    { text: "A working feature you can demo end to end in testing mode.", src: "nango-g", when: NEEDS_REVIEW },
  ],
  phases: [
    {
      name: "Register",
      steps: [
        {
          who: "agent",
          title: "Check whether you need your own app yet",
          time: "Instant",
          detail: "For Gmail, Composio already runs a managed OAuth app. Use it while building, and switch when users need to see your name.",
          src: "cmp-managed",
        },
        {
          who: "you",
          title: "Create a Google Cloud project",
          time: "3 min",
          detail: "Create the project under your company's Google Cloud organization if you have one, so it doesn't belong to a single person.",
          link: { label: "Create a project", url: "https://console.cloud.google.com/projectcreate" },
          src: "cmp-google",
        },
        {
          who: "you",
          title: "Enable the API you need",
          time: "2 min",
          detail: "Enable only the APIs your agent calls, for example the Gmail API or Google Calendar API.",
          link: { label: "Open the API library", url: "https://console.cloud.google.com/apis/library" },
          src: "cmp-google",
        },
      ],
    },
    {
      name: "Configure",
      steps: [
        {
          who: "you",
          title: "Set up the consent screen",
          time: "10 min",
          detail: "Choose {{var.audience}} as the audience. Add your app name, support email and logo. Declare only these scopes: {{scopes}}.",
          link: { label: "Open Google Auth Platform", url: "https://console.cloud.google.com/auth/overview" },
          src: "g-audience",
        },
        {
          who: "you",
          title: "Create OAuth client credentials",
          time: "5 min",
          detail: "Choose Web application, add the redirect URI, then copy the client ID and secret into a Composio auth config.",
          fields: [
            { label: "Application type", value: "Web application" },
            { label: "Authorized redirect URI", value: "{{callback}}", copy: true },
          ],
          link: { label: "Open Credentials", url: "https://console.cloud.google.com/apis/credentials" },
          src: "cmp-google",
        },
      ],
    },
    {
      name: "Test",
      steps: [
        {
          who: "you",
          title: "Connect a Workspace account",
          time: "10 min",
          detail: "Connect an account from your Workspace and run one tool call.",
          src: "g-audience",
          when: { who: ["team"] },
        },
        {
          who: "you",
          title: "Add test users and connect",
          time: "10 min",
          detail: "While the app is in testing, only listed test users can connect, up to 100.",
          check: "Test connections expire 7 days after consent, including refresh tokens. Expect your agent to stop working after a week until you publish.",
          src: "g-audience",
          when: { who: ["few", "public"] },
        },
      ],
    },
    {
      name: "Get approved",
      when: NEEDS_REVIEW,
      steps: [
        {
          who: "you",
          title: "Verify your domain in Search Console",
          time: "15 min, plus DNS time",
          detail: "Your homepage and privacy policy must be on a domain you own. A project owner or editor verifies it in Google Search Console, usually by adding a DNS record.",
          link: { label: "Open Search Console", url: "https://search.google.com/search-console" },
          src: "g-requirements",
        },
        {
          who: "you",
          title: "Publish a privacy policy that covers Google data",
          time: "1–2 hours",
          detail: "Host it on the same domain as your homepage and link it from both. It must say how your app accesses, uses, stores and shares Google user data.",
          src: "g-requirements",
        },
        {
          who: "agent",
          title: "Draft your scope justification",
          time: "Instant",
          detail: "Google asks why each scope is needed and why a narrower one won't work. Edit this draft to match your product.",
          draft:
            "We request {{scopes}} so that the user's AI agent can {{doesLower}} on their behalf when they ask it to. The agent only acts on explicit user instructions and does not use the data for advertising or model training.",
          src: "g-sensitive",
        },
        {
          who: "you",
          title: "Record a demo video",
          time: "1–2 hours",
          detail: "Show a user starting the connection, the full consent screen with your app name, and the agent actually using each scope. Unlisted YouTube links are the usual format.",
          check: "A video that skips the consent screen or never shows the data being used is a common reason for rejection.",
          src: "g-restricted",
        },
        {
          who: "you",
          title: "Submit in the Verification Center",
          time: "30 min",
          detail: "Declare every scope on the Data Access page, then submit from the Verification Center. Keep the project contact email monitored; Google replies there.",
          link: { label: "Open Google Auth Platform", url: "https://console.cloud.google.com/auth/overview" },
          src: "g-sensitive",
        },
        {
          who: "you",
          title: "Book a CASA security assessment",
          time: "2–6 weeks",
          detail: "Pick an authorized assessor from the App Defense Alliance list. The assessor, not Google, runs this step and sets the price. You receive a Letter of Validation when you pass.",
          src: "g-restricted",
          when: { review: ["audit"] },
        },
        {
          who: "provider",
          title: "Google reviews your app",
          time: "Several weeks, sometimes months",
          detail: "Answer follow-up emails quickly. Most delays come from slow replies or missing items, not the review itself.",
          src: "g-restricted",
          when: { review: ["audit"] },
        },
        {
          who: "provider",
          title: "Google reviews your app",
          time: "Up to 10 days",
          detail: "Answer follow-up emails quickly. Most delays come from slow replies or missing items, not the review itself.",
          src: "g-sensitive",
          when: { review: ["review"] },
        },
      ],
    },
    {
      name: "Roll out",
      steps: [
        {
          who: "you",
          title: "Publish the app",
          time: "1 min",
          detail: "Publishing before verification finishes shows users an 'unverified app' warning and caps you at 100 new users for the life of the project.",
          src: "g-audience",
          when: NEEDS_REVIEW,
        },
        {
          who: "you",
          title: "Publish the app",
          time: "1 min",
          detail: "Click Publish app on the Audience page. With only non-sensitive scopes, there's no review.",
          src: "g-audience",
          when: { review: ["none"] },
        },
        {
          who: "customer",
          title: "Customer's Workspace admin trusts your app",
          time: "Varies",
          detail: "Some Workspace admins block sensitive scopes for apps they haven't marked as trusted. Their users see an error until they do.",
          src: "g-sensitive",
          when: { review: ["review", "audit"], who: ["few", "public"] },
        },
      ],
    },
  ],
  approval: [
    {
      when: { review: ["audit"] },
      value: {
        summary:
          "Two separate reviews: Google checks your app, and an independent assessor checks your security. Both must pass, and the assessment renews every 12 months.",
        whileWaiting: [
          "Keep building with up to 100 test users.",
          "Re-consent test users weekly, because their connections expire after 7 days.",
          "Reply to Google's emails the same day. Slow replies are the most common delay.",
        ],
        src: "g-restricted",
      },
    },
    {
      when: { review: ["review"] },
      value: {
        summary: "Google checks your branding, privacy policy and that each scope is justified. Google states this takes up to 10 days.",
        whileWaiting: [
          "Keep building with up to 100 test users.",
          "Re-consent test users weekly, because their connections expire after 7 days.",
          "Reply to Google's emails the same day. Slow replies are the most common delay.",
        ],
        src: "g-sensitive",
      },
    },
    { value: null },
  ],
  blockers: [
    {
      symptom: "The agent worked for a week, then every call fails.",
      cause: "The app is still in testing, and test-user connections expire 7 days after consent.",
      fix: "Ask test users to reconnect, or publish the app.",
      src: "g-audience",
    },
    {
      symptom: "Users see a 'Google hasn't verified this app' warning.",
      cause: "The app requests sensitive or restricted scopes that aren't verified yet.",
      fix: "Finish verification, or remove those scopes until it's done.",
      src: "g-audience",
      when: NEEDS_REVIEW,
    },
    {
      symptom: "Google asks you to request a narrower scope.",
      cause: "Your justification doesn't show why a narrower scope can't work.",
      fix: "Explain the exact feature that needs this scope and show it in your demo video. {{doesNote}}",
      src: "g-requirements",
      when: NEEDS_REVIEW,
    },
    {
      symptom: "You hit a limit of 100 users and can't reset it.",
      cause: "Unverified apps can only be approved by 100 users in total, for the life of the project.",
      fix: "Get verified before inviting more users. Don't burn the cap on internal testing.",
      src: "g-audience",
      when: NEEDS_REVIEW,
    },
  ],
  customerSide: [
    {
      text: "If you add a new sensitive or restricted scope later, you'll need to verify again. Existing approved scopes keep working while you wait.",
      src: "nylas-g",
    },
    {
      text: "Workspace admins can restrict which third-party apps their users may connect. Give enterprise customers your OAuth client ID so they can allow it.",
      src: "g-sensitive",
      when: { who: ["few", "public"] },
    },
  ],
  unknowns: [
    {
      text: "Sources disagree on whether the security assessment must finish before Google starts its own review, or whether they run in parallel. Ask your assessor.",
      when: { review: ["audit"] },
    },
    { text: "Assessment prices aren't published by Google and vary by assessor and app size.", when: { review: ["audit"] } },
    { text: "Google states up to 10 days. Developers report longer when Google asks for changes.", when: { review: ["review"] } },
  ],
  sources: [
    { id: "g-audience", kind: "official", publisher: "Google Cloud Help", title: "Manage app audience (testing, 100 users, 7-day tokens)", url: "https://support.google.com/cloud/answer/15549945" },
    { id: "g-sensitive", kind: "official", publisher: "Google for Developers", title: "Sensitive scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification" },
    { id: "g-restricted", kind: "official", publisher: "Google for Developers", title: "Restricted scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification" },
    { id: "g-requirements", kind: "official", publisher: "Google Cloud Help", title: "Verification requirements (domain, privacy policy, video)", url: "https://support.google.com/cloud/answer/13464321" },
    { id: "g-annual", kind: "official", publisher: "Google Cloud Help", title: "Annual security reassessment", url: "https://support.google.com/cloud/answer/13463816" },
    { id: "nango-g", kind: "community", publisher: "Nango", title: "Google security review: timelines in practice", url: "https://nango.dev/docs/api-integrations/google-shared/google-security-review" },
    { id: "nylas-g", kind: "community", publisher: "Nylas", title: "Gmail scope classification reference", url: "https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/" },
    { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
    { id: "cmp-google", kind: "official", publisher: "Composio", title: "Google OAuth setup for Composio", url: "https://composio.dev/auth/googleapps" },
  ],
  changelog: [{ date: "28 Oct 2026", text: "Guide created." }],
};
