# OAuth Ready: frontend

Look up an app and see what it takes to get your OAuth app ready: the steps, your hands-on work, the wait for approval, and what's likely to block you. Apps outside the library are researched live by an agent.

This is the frontend. Connected to the backend ([Oauth_BE](../Oauth_BE)), it serves guides from the database and streams the Gemini research agent live. Without a backend it still runs on its own, with the six library guides and a **simulated** agent (Demo mode).

## Run it

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test            # resolver and guide-integrity tests
npm run typecheck
npm run build
```

### Connect the backend

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the backend's base URL. With it empty, the app runs in **Demo mode** (shown in the top bar).

The backend must serve:

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/apps` and `/apps?q=` | `AppSummary[]` |
| GET | `/guides/:slug` | `GuideDoc`, or 404 |
| POST | `/generate` with `{ "query": "..." }` | `text/event-stream` of `GenerateEvent` as `data:` lines |

All types are in [lib/types.ts](lib/types.ts).

## What's inside

| Path | What it does |
| --- | --- |
| `app/page.tsx` | Home: one search box, how it works, and the library |
| `app/apps/[slug]/` | A guide. Asks three questions first, then shows the plan. Answers, tab and step are in the URL, so every link is shareable |
| `components/Wizard.tsx` | The three questions, one per screen |
| `components/PlanView.tsx` | Verdict in plain words, time bar, main blocker, path, decisions |
| `components/SetupView.tsx` | One step at a time, with a task list on the side |
| `components/ReferenceViews.tsx` | Troubleshoot and Sources tabs |
| `app/generate/` | Live research: stages, sources kept or dropped, facts found |
| `app/method/` | How difficulty, evidence and confidence are worked out, and what we checked |
| `lib/types.ts` | The guide format shared with the backend |
| `lib/resolve.ts` | Turns a stored guide plus the developer's answers into the guide they read |
| `lib/scoring.ts` | Fixed rules for difficulty level and confidence |
| `lib/guides/*.ts` | Six library guides, with a source on every claim |
| `lib/api/` | `http.ts` for the backend, `mock.ts` and `mockAgent.ts` for Demo mode |
| `lib/markdown.ts` | "Copy as Markdown" export for Slack, Notion or a ticket |

## Key decisions

### Experience

- **Question first, then the answer.** The guide opens as a short interview: one question per screen, plain-language options, a progress bar, and keyboard shortcuts (1–4, Enter, Backspace). The audience question previews the difficulty each answer leads to, so the trade-off is visible before you pick.
- **The answer comes first.** The plan opens with one sentence ("2–5 days of work, waiting on Google: 4 weeks to 3 months"), then the main blocker. Details sit further down or in other tabs.
- **One step at a time.** Setup works like an onboarding assistant: a task list on the side, one step in focus, values to copy, a link to the exact console page and "Done, next". Progress is saved, and the plan shows which phases are finished.
- **Reference material is out of the way.** Troubleshooting and sources have their own tabs. Evidence shows as a small coloured dot next to each claim instead of a badge on every line.

### Content

- **Difficulty depends on what you ask for, not just the app.** Google is Self-serve for sign-in and Audited for reading email. Every guide asks three questions first: what will your agent do, who will connect, and do you need your own brand on the consent screen.
- **Guides are data; the verdict is code.** A guide is one JSON-compatible document. Anything that depends on the answers carries a `when` condition. `resolveGuide` filters by those conditions and computes the level with fixed rules. The language model never picks the difficulty, and library guides and generated guides are scored the same way.
- **Four named levels, not a 1–10 score.** Self-serve, Reviewed, Gated and Audited each name a kind of barrier.
- **Work and waiting are shown separately**, always as ranges, on one bar. A striped segment shows the extra time if something goes wrong.
- **Every claim shows its evidence**: Tested, Provider docs, Community or Unverified. Confidence follows the weakest source behind the verdict.
- **Every step says who does it**: the agent, you, the provider, or your customer's admin. Agent steps include ready-to-paste drafts, such as Google's scope justification, HubSpot's `app-hsmeta.json` auth block and a Microsoft admin consent request.
- **"Do you need your own app yet?" comes first.** If a managed app exists and you don't need your brand, the guide says so before any steps.

## Library

| App | What makes it different |
| --- | --- |
| GitHub | No provider review; the friction is customers' organization owners approving the app |
| Google | Ranges from Self-serve to Audited depending on scopes; 7-day test tokens; 100-user cap |
| HubSpot | 25-install cap until a marketplace listing is approved; CLI-only app creation since 2026 |
| Slack | Since May 2025, non-Marketplace apps can read message history only once a minute, 15 messages at a time |
| Microsoft 365 | No app review, but publisher verification and each tenant's admin consent decide who can connect |
| Notion | No review; users pick which pages the agent can see during OAuth |

## What was checked

- All 56 source and console links in the library were requested on 29 Oct 2026. All resolved except three HubSpot Community threads, which block automated requests, and the Entra admin console, which needs a sign-in.
- Key claims were read on the provider's page: Slack's non-Marketplace rate limits (1 request per minute, up to 15 objects; existing installs and internal apps unaffected) and Microsoft's client secret lifetime (24 months maximum, under 12 recommended).
- No step is marked Tested yet. To mark one, register a real test app and change that source's `kind` to `"tested"`.
- Slack, Microsoft 365 and Notion were drafted from provider docs and are less reviewed than GitHub, Google and HubSpot. Whether Composio runs a managed app for Slack, HubSpot, Microsoft and Notion is marked as unconfirmed.

## Limitations

- In Demo mode (no backend), live research is simulated. Simulated guides are marked "Written by an agent", with Low confidence and every source Unverified.
- In Demo mode, generated guides are saved in the browser that created them, so their links don't work for teammates. With the backend, they're stored in its database.
- Checklist progress is stored in the browser, not shared with teammates.
- Guides are only as current as the docs behind them, and nothing re-checks them automatically yet.
