# OAuth Ready

Look up an app and see what it takes to get your OAuth app ready: the steps, your hands-on work, the wait for approval, and what will block you. Apps outside the library are researched live by an AI agent.

**Live app:** https://composio-ybq4.vercel.app

| Folder | What it is |
| --- | --- |
| [`Oauth_FE`](Oauth_FE) | Next.js frontend: search, the three-question setup, the plan, step-by-step setup, troubleshooting and sources |
| [`Oauth_BE`](Oauth_BE) | API and Gemini research agent: serves guides from a libSQL database (Turso in production) and streams live research |

## Run it locally

You need Node.js 20 or later. Use two terminals.

**Backend** (http://localhost:4000)

```bash
cd Oauth_BE
npm install
cp .env.example .env    # then set GEMINI_API_KEY
npm run dev
```

**Frontend** (http://localhost:3000)

```bash
cd Oauth_FE
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
npm run dev
```

Without `NEXT_PUBLIC_API_URL`, the frontend runs on its own in Demo mode, with the library guides and a simulated agent. To deploy both on Vercel, see the "Deploy to Vercel" sections in each folder's README.

## Tests

```bash
cd Oauth_FE && npm test     # guide rules and library integrity
cd Oauth_BE && npm test     # evidence checks and guide assembly
cd Oauth_BE && npm run eval # live agent vs hand-checked guides (needs a Gemini key)
```

## Key decisions

- **Difficulty depends on what you ask for, not just the app.** Google is self-serve for sign-in but needs a paid security audit to read email. So every guide starts with three questions: what your agent will do (several allowed), who will connect, and whether users must see your brand.
- **Named levels instead of a score:** Self-serve, Reviewed, Gated, Audited. Each names a kind of barrier. Hands-on work and waiting on the provider are shown as separate ranges.
- **Code decides, not the model.** The verdict comes from fixed rules over extracted facts, the same for library and generated guides. Code opens every link the agent cites, checks every quoted fact is really on its page, and labels sources by domain.
- **Evidence on every claim:** Tested, Provider docs, Community or Unverified. Confidence follows the weakest source behind the verdict.
- **Every step says who does it:** the agent (drafted text like scope justifications), you, the provider, or your customer's admin.
- **"Do you need your own app yet?" comes first.** If Composio already runs a managed app and you don't need your brand, the guide says so before any steps.
- **Focused scope:** six checked guides with different kinds of barrier, plus live research for any other app, instead of 100 shallow guides.

## What was checked

- **Setup attempt, GitHub (29 Oct 2026):** registered a real OAuth App, authorized it, exchanged the code for a token and called the API. It corrected the guide:
  - tokens expire after **8 hours**, with a 6-month refresh token
  - the form's field is called **Redirect URI**
  - authorization codes expire within about 10 minutes

  The Composio auth-config step and organization approval couldn't be tested.
- **Sources:** every library link was opened, and key claims were read on the provider's page (for example Slack's 2025 rate limit for non-Marketplace apps, and Microsoft's 24-month client secret limit).
- **Agent vs checked guides:** five runs, recorded in [`Oauth_BE/EVALUATION.md`](Oauth_BE/EVALUATION.md) and the backend README. It led to two fixes:
  - optional marketplace reviews were being treated as required
  - token limits were being treated as install caps

## Limitations

- Only GitHub's core steps are tested by hand; the other guides rest on provider docs.
- Generated guides are only as current as the pages the agent can reach. Limits announced in changelogs can be missed (Slack's 2025 rate limit was). Checked library guides always take priority.
- The Gemini key used has no Google Search quota, so the agent finds docs from the model's suggestions and by following links on the provider's site.
- Whether Composio runs a managed app is only confirmed when a Composio API key is set; otherwise guides say "unconfirmed".
- Checklist progress is saved in the browser, not shared between teammates.
- Anyone with the link can start live research, which uses the Gemini quota.

More detail is in [`Oauth_FE/README.md`](Oauth_FE/README.md) and [`Oauth_BE/README.md`](Oauth_BE/README.md).
