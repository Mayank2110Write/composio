# OAuth Ready

Look up an app and see what it takes to get your OAuth app ready: the setup steps, your hands-on work, the wait for approval, and what's likely to block you.

This is the **frontend**. It runs on its own with three ready-made guides (GitHub, Google, HubSpot) and a **mock agent** for any other app. The Gemini-powered research agent is the next phase.

## Run it on your computer

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What's inside

| Path | What it does |
| --- | --- |
| `app/page.jsx` | Home: search and the ready-made guides |
| `app/guide/[slug]/` | A library guide. The URL holds the user's answers, so every link is shareable |
| `app/generate/` | Live research for apps outside the library (mock for now) |
| `components/IntentSheet.jsx` | The three questions that change the verdict |
| `components/Verdict.jsx` | Difficulty level, time bar, cost and main blocker |
| `components/Steps.jsx` | Step checklist. Progress is saved in the browser |
| `lib/guides/*.js` | Guide content for GitHub, Google and HubSpot, with a source on every claim |
| `lib/scoring.js` | Rules that turn facts into a difficulty level and a confidence rating |
| `lib/mockAgent.js` | Simulated agent. Replaced by the Gemini backend later |

## Key decisions

- **Difficulty depends on what you ask for, not just the app.** Google is Self-serve for sign-in and Audited for reading email, so the guide asks three questions first.
- **Difficulty is calculated by rules, not chosen by the AI.** The agent extracts facts (review needed, install cap); `lib/scoring.js` turns them into Self-serve, Reviewed, Audited or Gated.
- **Your work and waiting time are shown separately**, always as ranges.
- **Every claim shows its evidence**: tested, provider docs, community, or unverified. Confidence is set by the weakest source behind the verdict.
- **Every step says who does it**: the agent, you, waiting on the provider, or your customer.

## Limitations

- Live research is simulated until the backend is added.
- No step is marked "Tested" yet. After you register a real GitHub or Google test app, change that source's `kind` to `"tested"` in `lib/guides/`.
- Checklist progress is stored in the browser, so it isn't shared with teammates.
- Generated guides re-run the agent when their link is opened.
