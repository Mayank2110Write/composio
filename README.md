# OAuth Ready

Look up an app and see what it takes to get your OAuth app ready: the steps, your hands-on work, the wait for approval, and what will block you. Apps outside the library are researched live by an AI agent.

| Folder | What it is |
| --- | --- |
| [`Oauth_FE`](Oauth_FE) | Next.js frontend: search, the three-question setup, the plan, step-by-step setup, troubleshooting and sources |
| [`Oauth_BE`](Oauth_BE) | API and Gemini research agent: serves guides from SQLite and streams live research |

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

Without `NEXT_PUBLIC_API_URL`, the frontend runs on its own in Demo mode, with the library guides and a simulated agent.

## Tests

```bash
cd Oauth_FE && npm test     # guide rules and library integrity
cd Oauth_BE && npm test     # evidence checks and guide assembly
cd Oauth_BE && npm run eval # live agent vs hand-checked guides (needs a Gemini key)
```

Key decisions, how the agent checks its evidence, and known limitations are in each folder's README. The latest agent evaluation is in [`Oauth_BE/EVALUATION.md`](Oauth_BE/EVALUATION.md).
