import { levelFor, levelReasons } from "../scoring";

const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback";

const sources = [
  { id: "g-audience", kind: "official", publisher: "Google Cloud Help", title: "Manage app audience (testing, 100 users, 7-day tokens)", url: "https://support.google.com/cloud/answer/15549945" },
  { id: "g-sensitive", kind: "official", publisher: "Google for Developers", title: "Sensitive scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification" },
  { id: "g-restricted", kind: "official", publisher: "Google for Developers", title: "Restricted scope verification", url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification" },
  { id: "g-requirements", kind: "official", publisher: "Google Cloud Help", title: "Verification requirements (domain, privacy policy, video)", url: "https://support.google.com/cloud/answer/13464321" },
  { id: "g-annual", kind: "official", publisher: "Google Cloud Help", title: "Annual security reassessment", url: "https://support.google.com/cloud/answer/13463816" },
  { id: "nango-g", kind: "community", publisher: "Nango", title: "Google security review: timelines in practice", url: "https://nango.dev/docs/api-integrations/google-shared/google-security-review" },
  { id: "nylas-g", kind: "community", publisher: "Nylas", title: "Gmail scope classification reference", url: "https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/" },
  { id: "cmp-managed", kind: "official", publisher: "Composio Docs", title: "Managed vs custom auth", url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app" },
  { id: "cmp-google", kind: "official", publisher: "Composio", title: "Google OAuth setup for Composio", url: "https://composio.dev/auth/googleapps" },
];

const does = [
  { id: "signin", label: "Sign users in", scopes: ["openid", "email", "profile"], tier: "none", narrower: null },
  { id: "files", label: "Work with files the user picks", scopes: ["drive.file"], tier: "none", narrower: null },
  { id: "calendar", label: "Manage calendar events", scopes: ["calendar.events"], tier: "sensitive", narrower: null },
  { id: "send", label: "Send email", scopes: ["gmail.send"], tier: "sensitive", narrower: null },
  { id: "read", label: "Read email", scopes: ["gmail.readonly"], tier: "restricted", narrower: "If the agent only sends, use gmail.send instead. That moves you from Audited to Reviewed." },
  { id: "drive", label: "Read all of a user's Drive", scopes: ["drive.readonly"], tier: "restricted", narrower: "If the user can pick the files, drive.file needs no review at all." },
];

const TIER_TEXT = {
  none: "Non-sensitive. No verification needed.",
  sensitive: "Sensitive. Google reviews your app before it's open to everyone.",
  restricted: "Restricted. Google reviews your app and you need a yearly third-party security assessment.",
};

export const google = {
  slug: "google",
  name: "Google",
  domain: "google.com",
  tagline: "Anywhere from an hour to a few months. The scopes you request decide which.",
  does,
  resolve(intent) {
    const choice = does.find((d) => d.id === intent.does) ?? does[0];
    const internal = intent.who === "team";
    const tier = internal ? "none" : choice.tier;
    const review = tier === "restricted" ? "audit" : tier === "sensitive" ? "review" : "none";
    const facts = { review, installCap: null, publicReach: intent.who === "public" };
    const level = levelFor(facts);

    const time = {
      none: { work: { text: "About 1 hour", hours: 1 }, wait: { text: "None", days: 0 }, buffer: null },
      sensitive: { work: { text: "4–8 hours", hours: 6 }, wait: { text: "Up to 10 days", days: 10 }, buffer: { text: "+1–2 weeks if Google asks for changes", days: 10 } },
      restricted: { work: { text: "2–5 days", hours: 30 }, wait: { text: "4 weeks to 3 months", days: 60 }, buffer: { text: "+2–4 weeks if the assessor finds issues to fix", days: 20 } },
    }[tier];

    const needsReview = tier !== "none";

    const approvalSteps = !needsReview
      ? []
      : [
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
            draft: `We request ${choice.scopes.join(", ")} so that the user's AI agent can ${choice.label.toLowerCase()} on their behalf when they ask it to. The agent only acts on explicit user instructions and does not use the data for advertising or model training. ${choice.narrower ? "" : "No narrower scope supports this feature."}`.trim(),
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
          ...(tier === "restricted"
            ? [
                {
                  who: "you",
                  title: "Book a CASA security assessment",
                  time: "2–6 weeks",
                  detail: "Pick an authorized assessor from the App Defense Alliance list. The assessor, not Google, runs this step and sets the price. You receive a Letter of Validation when you pass.",
                  src: "g-restricted",
                },
              ]
            : []),
          {
            who: "wait",
            title: "Google reviews your app",
            time: tier === "restricted" ? "Several weeks, sometimes months" : "Up to 10 days",
            detail: "Answer follow-up emails quickly. Most delays come from slow replies or missing items, not the review itself.",
            src: tier === "restricted" ? "g-restricted" : "g-sensitive",
          },
        ];

    return {
      slug: "google",
      name: "Google",
      domain: "google.com",
      lastVerified: "28 Oct 2026",
      intentLabel: choice.label,
      managed: {
        available: true,
        note: "Composio names Gmail among the apps it provides a managed OAuth app for. Check other Google toolkits individually.",
        src: "cmp-managed",
      },
      facts,
      level,
      reasons: internal
        ? ["Apps limited to your own Google Workspace don't need verification."]
        : levelReasons(facts),
      time,
      cost: tier === "restricted" ? "Assessor fee, set by the assessor" : "Free",
      blocker: tier === "restricted"
        ? { text: "The security assessment. It is run by a third party, costs money and must be repeated every 12 months.", src: "g-annual" }
        : tier === "sensitive"
        ? { text: "You need a homepage and privacy policy on a domain you own, verified in Search Console, before Google will review you.", src: "g-requirements" }
        : { text: "In testing mode, connections expire after 7 days. Publish the app before real users rely on it.", src: "g-audience" },
      keySources: ["g-audience", tier === "restricted" ? "g-restricted" : "g-sensitive", "g-requirements"],
      decisions: [
        {
          title: "Scopes",
          choice: `${choice.scopes.join(", ")}: ${TIER_TEXT[choice.tier]}`,
          consequence: choice.narrower ?? "This is already the narrowest scope for the job.",
          src: choice.tier === "none" ? "g-audience" : "nylas-g",
        },
        {
          title: "Internal or external",
          choice: internal ? "Internal: only accounts in your Google Workspace can connect." : "External: any Google account can connect.",
          consequence: internal
            ? "No verification needed, but customers outside your Workspace can never connect. Switch to External before you go public."
            : "Sensitive and restricted scopes need verification before you can go beyond 100 users.",
          src: "g-audience",
        },
      ],
      prerequisites: [
        { text: "A Google account that can create Google Cloud projects.", src: "g-audience" },
        ...(needsReview
          ? [
              { text: "A homepage on a domain you own, with a link to your privacy policy.", src: "g-requirements" },
              { text: "Access to that domain's DNS settings, to verify it in Search Console.", src: "g-requirements" },
              { text: "A working feature you can demo end to end in testing mode.", src: "nango-g" },
            ]
          : []),
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
              detail: `Choose ${internal ? "Internal" : "External"} as the audience. Add your app name, support email and logo. Declare only these scopes: ${choice.scopes.join(", ")}.`,
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
                { label: "Authorized redirect URI", value: COMPOSIO_CALLBACK, copy: true },
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
              title: internal ? "Connect a Workspace account" : "Add test users and connect",
              time: "10 min",
              detail: internal
                ? "Connect an account from your Workspace and run one tool call."
                : "While the app is in testing, only listed test users can connect, up to 100.",
              check: internal ? undefined : "Test connections expire 7 days after consent, including refresh tokens. Expect your agent to stop working after a week until you publish.",
              src: "g-audience",
            },
          ],
        },
        ...(needsReview ? [{ name: "Get approved", steps: approvalSteps }] : []),
        {
          name: "Roll out",
          steps: [
            {
              who: "you",
              title: "Publish the app",
              time: "1 min",
              detail: needsReview
                ? "Publishing before verification finishes shows users an 'unverified app' warning and caps you at 100 new users for the life of the project."
                : "Click Publish app on the Audience page. With only non-sensitive scopes, there's no review.",
              src: "g-audience",
            },
            ...(intent.who !== "team" && needsReview
              ? [
                  {
                    who: "customer",
                    title: "Customer's Workspace admin trusts your app",
                    time: "Varies",
                    detail: "Some Workspace admins block sensitive scopes for apps they haven't marked as trusted. Their users will see an error until they do.",
                    src: "g-sensitive",
                  },
                ]
              : []),
          ],
        },
      ],
      approval: needsReview
        ? {
            summary: tier === "restricted"
              ? "Two separate reviews: Google checks your app, and an independent assessor checks your security. Both must pass, and the assessment renews every 12 months."
              : "Google checks your branding, privacy policy and that each scope is justified. Google states this takes up to 10 days.",
            whileWaiting: [
              "Keep building with up to 100 test users.",
              "Re-consent test users weekly, because their connections expire after 7 days.",
              "Reply to Google's emails the same day. Slow replies are the most common delay.",
            ],
            src: tier === "restricted" ? "g-restricted" : "g-sensitive",
          }
        : null,
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
        },
        {
          symptom: "Google asks you to request a narrower scope.",
          cause: "Your justification doesn't show why a narrower scope can't work.",
          fix: choice.narrower ?? "Explain the exact feature that needs this scope and show it in your demo video.",
          src: "g-requirements",
        },
        {
          symptom: "You hit a limit of 100 users and can't reset it.",
          cause: "Unverified apps can only be approved by 100 users in total, for the life of the project.",
          fix: "Get verified before inviting more users. Don't burn the cap on internal testing.",
          src: "g-audience",
        },
      ],
      rollout: [
        { text: "If you add a new sensitive or restricted scope later, you'll need to verify again. Existing approved scopes keep working while you wait.", src: "nylas-g" },
      ],
      unknowns: tier === "restricted"
        ? [
            "Sources disagree on whether the security assessment must finish before Google starts its own review, or whether they run in parallel. Ask your assessor.",
            "Assessment prices aren't published by Google and vary by assessor and app size.",
          ]
        : tier === "sensitive"
        ? ["Google states up to 10 days. Developers report longer when Google asks for changes."]
        : [],
      sources,
      changelog: [{ date: "28 Oct 2026", text: "Guide created." }],
    };
  },
};
