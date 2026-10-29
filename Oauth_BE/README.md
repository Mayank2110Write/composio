# OAuth Ready: backend

API and research agent for [OAuth Ready](../Oauth_FE). It serves the guide library from SQLite. For any other app, a Gemini-powered agent researches the provider's docs live and streams its progress to the browser. The finished guide is saved, so its link works for anyone.

## Run it

You need Node.js 20 or later.

```bash
npm install
cp .env.example .env     # then set GEMINI_API_KEY
npm run dev              # http://localhost:4000
```

Point the frontend at it: in `Oauth_FE/.env.local`, set `NEXT_PUBLIC_API_URL=http://localhost:4000` and restart `npm run dev` there.

```bash
npm test                 # unit tests, no network or API key needed
npm run typecheck
npm run eval             # run the live agent on library apps and compare (writes EVALUATION.md)
npm run sync-shared      # re-copy guide types, scoring and library guides from ../Oauth_FE/lib
```

### Settings (`.env`)

| Name | What it does |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio key. Required for live research. Never commit it. |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | Model, and the one to fall back to when it's busy. Defaults: `gemini-3.5-flash`, `gemini-3.1-flash-lite`. |
| `GEMINI_SEARCH` | `1` to try Google Search grounding first. It's turned off automatically if the key has no search quota. |
| `COMPOSIO_API_KEY` | Optional. Lets the agent check whether Composio runs a managed app for the toolkit. |
| `CORS_ORIGIN` | Comma-separated frontend origins, or `*`. |
| `DATABASE_PATH` | SQLite file. Default `data/oauth-ready.db`. |

## API

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/apps`, `/apps?q=` | Library and generated apps, as `AppSummary[]` |
| GET | `/guides/:slug` | A `GuideDoc`, or 404 |
| POST | `/generate` with `{ "query": "zoom.us", "refresh": false }` | Server-sent events: `stage`, `source`, `fact`, then `done` (with the slug) or `error` |
| GET | `/runs` | Recent agent runs, for checking what happened |
| GET | `/health` | Status, model, whether a key is set |

Types are in `src/shared/types.ts`, copied from the frontend so both sides agree.

## How the agent works

The model gathers and phrases facts. Code decides what they mean.

| Stage | Done by | Why |
| --- | --- | --- |
| Identify the provider and propose likely documentation URLs | Model | Works for any app, including unfamiliar ones |
| Add common addresses (`developers.<domain>`, `docs.<domain>`) and Google Search results when the key allows | Code | More places to look without trusting the model |
| Open every URL; drop dead, invented or empty pages | Code | Made-up links never reach a guide. Dropped links are shown in the live view with the reason |
| Follow links on the provider's own docs towards OAuth, scopes, review and limits | Code | Finds the pages that matter even when the first guesses are wrong |
| Read the pages and extract facts, each with an exact quote and its URL | Model | Uses only the page text it's given |
| Check every quote appears on the page it cites | Code | Facts that can't be found are marked Unconfirmed, and anything resting only on them is labelled Unverified |
| Label each source by domain: provider's own domain is Provider docs, anything else Community | Code | The agent never rates its own sources |
| Check whether Composio runs a managed app | Code | Uses Composio's API when `COMPOSIO_API_KEY` is set, otherwise says it's unconfirmed |
| Write the guide from the facts, citing fact ids | Model | Same structure as the library guides. A thin draft gets one retry with specific feedback |
| Check step links, build fact rules and score | Code | The same fixed rules as the library. Caps must be numeric limits on installs or users, not token or rate limits |

A run takes about a minute. Every run's events are stored in the `runs` table.

## Key decisions

- **Code checks the evidence, not the model.** The model must quote the page. Code confirms each quote is really on that page, and labels each source by its domain.
- **Fixed rules decide difficulty.** The writer says which uses need review or audit and cites facts. `assemble.ts` turns that into the same `factRules` the library uses, and the shared `resolveGuide` scores it.
- **Library guides win.** A search that matches a hand-checked guide returns it instead of generating one. A previously generated guide is reused unless `refresh` is set.
- **Works without web search.** This key has no Google Search grounding quota, so discovery relies on the model's suggestions, common doc addresses and following links on the provider's site. Grounding is used automatically when available.

## Agent vs hand-checked guides

`npm run eval` runs the live agent on apps we have checked guides for, without letting it see them. It compares the hardest difficulty level for each audience. Latest run: [EVALUATION.md](EVALUATION.md). Findings from five runs on 29 Oct 2026:

| App | Result | What we learned |
| --- | --- | --- |
| GitHub | Matched in 4 of 5 runs | Once it marked public apps Gated from a limit the code accepted as a cap. Caps now must limit installs or users; token and rate limits are rejected. |
| HubSpot | Matched in 1 of 2 runs | The 25-install cap was found only when the agent reached HubSpot's install-limits page. When it didn't, it said Self-serve. |
| Notion | Matched after a fix | It first called public apps Reviewed because a confirmed fact said Notion reviews connections "to list them on the Marketplace". The writer now classifies each review as `external_users` or `optional_listing`, and only the first counts. |
| Slack | Didn't match | It never reached Slack's May 2025 changelog limiting message-history reads for non-Marketplace apps, so it said Self-serve where our checked guide says Gated. |

Quote checking caught real problems. In one Slack run, 4 of 10 extracted facts couldn't be found on the page they cited, and were marked Unconfirmed instead of reaching the guide as Provider docs.

**Takeaway:** the agent is reliable on steps and on reviews it can find, and the evidence labels are honest. Its main weakness is coverage: limits announced in changelogs or on pages it doesn't reach are missed. That's why checked library guides take priority over generated ones, and why generated guides say nothing was tested.

## Limitations

- Guides are only as good as the pages the agent can open. Docs that need JavaScript to render come back nearly empty and are dropped.
- Nothing in a generated guide is Tested. Time estimates often come from the writer rather than a stated fact, and are listed as unknowns when the docs don't give one.
- Without `COMPOSIO_API_KEY`, the managed-app answer is always "unconfirmed".
- One server process, and SQLite on local disk. Deploy where the disk persists (for example Render or Fly with a volume), not on serverless functions.
