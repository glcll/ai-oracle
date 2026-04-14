# AI Oracle Council

One API call. Multiple AI models. Independently verified. Provably fair.

Send a prompt to the AI Oracle Council. 2 worker models generate independent responses, 2 judges score each response, and Chainlink DON nodes reach cryptographic consensus on the best answer.

**Live demo**: [ai-oracle-council.vercel.app](https://ai-oracle-council.vercel.app)

## How It Works

```
POST /api/v1/ask { "prompt": "What causes auroras?" }
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Local Oracle Engine (primary, streaming)        │
│                                                  │
│  1. Query 2 workers in parallel                  │
│     ├── Gemini 2.5 Flash (Google)               │
│     └── GLM-5 Turbo (Zhipu AI)                  │
│                                                  │
│  2. Query 2 judges in parallel                   │
│     ├── GPT-4o Mini (OpenAI)                    │
│     └── Qwen Turbo (Alibaba)                    │
│                                                  │
│  3. Compute 2×2 scoring matrix                   │
│     → Average scores → Pick winner              │
│                                                  │
│  4. Stream results to client via SSE             │
└─────────────────────────────────────────────────┘
         │
         │  (async, non-blocking)
         ▼
┌─────────────────────────────────────────────────┐
│  CRE Workflow (background attestation)           │
│                                                  │
│  Same 2W+2J computation runs on DON nodes.       │
│  Each node independently queries models,         │
│  scores responses, and participates in BFT       │
│  consensus (median aggregation on scores).       │
│  Result is cryptographically signed.             │
└─────────────────────────────────────────────────┘
```

### Scoring Matrix

Each judge scores each worker's response on a 1–10 scale. The worker with the highest average score wins.

```
                Gemini Flash    GLM-5 Turbo
GPT-4o Mini:        8               7
Qwen Turbo:         9               7
              ──────────      ──────────
Average:           8.5             7.0     →  Winner: Gemini 2.5 Flash
```

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/glcll/ai-oracle.git
cd ai-oracle/web
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Add your [OpenRouter API key](https://openrouter.ai) to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 3. Run locally

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the landing page, or [localhost:3000/playground](http://localhost:3000/playground) to try it.

Without CRE configured, the app runs a local oracle engine that performs the full 2-worker + 2-judge consensus pipeline via OpenRouter.

## API

### `POST /api/v1/ask`

Submit a prompt. Returns an SSE stream with real-time progress and the consensus result.

```bash
curl -X POST https://ai-oracle-council.vercel.app/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What causes auroras?"}'
```

The stream emits events: `started` → `phase` (generation) → `phase` (judging) → `phase` (consensus) → `complete` with the full `OracleResult`.

### `GET /api/v1/result/:id`

Retrieve a cached consensus result by request ID.

```json
{
  "requestId": "req_k8m2x9p1ab3c",
  "status": "completed",
  "response": "Auroras are caused by...",
  "consensus": {
    "winningModel": "gemini-2.5-flash",
    "averageScores": { "gemini-2.5-flash": 8.5, "glm-5-turbo": 7.0 },
    "scoreMatrix": { ... },
    "consensusMethod": "median-aggregation-2w2j"
  },
  "allResponses": [
    { "model": "gemini-2.5-flash", "answer": "...", "avgScore": 8.5 },
    { "model": "glm-5-turbo", "answer": "...", "avgScore": 7.0 }
  ]
}
```

### `GET /api/v1/models`

List the worker and judge models in the oracle council.

## Architecture

The app uses a **dual execution path**:

- **Local oracle engine** (primary): Runs on Vercel, streams results via SSE. Handles the user-facing experience with real-time progress and full response text.
- **CRE workflow** (background): Triggers the same computation on Chainlink's decentralized oracle network. Provides cryptographic attestation that the scoring was fair and tamper-proof.

This architecture exists because CRE's consensus protocol uses `ignore` aggregation for string fields, which drops the actual LLM response text during median consensus. The local engine guarantees full text delivery while CRE handles verification.

### Why two paths?

| Concern | Local Engine | CRE |
|---------|-------------|-----|
| Response text | Full text, streamed | Dropped by consensus (`ignore` aggregation) |
| Latency | 3–8s, progressive | 10–30s, all-or-nothing |
| Trust model | Trust the operator | Trust the DON (cryptographic) |
| Scoring integrity | Operator-controlled | Tamper-proof, median-aggregated |

## Models

| Model | Provider | Role | OpenRouter ID |
|-------|----------|------|---------------|
| Gemini 2.5 Flash | Google | Worker | `google/gemini-2.5-flash` |
| GLM-5 Turbo | Zhipu AI | Worker | `z-ai/glm-5-turbo` |
| GPT-4o Mini | OpenAI | Judge | `openai/gpt-4o-mini` |
| Qwen Turbo | Alibaba | Judge | `qwen/qwen-turbo` |

## AI Agent Skill

Give your AI agent access to the Oracle Council. The skill teaches agents how to query the API, parse SSE streams, and use the consensus-scored results. Available on [skills.sh](https://skills.sh).

### Install

```bash
npx skills add glcll/ai-oracle
```

Works with Cursor, Claude Code, Codex, Windsurf, Cline, and [40+ other agents](https://skills.sh). Once installed, your agent can query the Oracle Council when it needs a verified, multi-model AI answer.

See [`skills/ai-oracle-council/SKILL.md`](skills/ai-oracle-council/SKILL.md) for the full skill reference.

## Project Structure

```
ai-oracle/
├── web/                          Next.js app (Vercel)
│   ├── app/
│   │   ├── page.tsx              Landing page
│   │   ├── playground/page.tsx   Interactive playground
│   │   └── api/v1/              API routes (ask, result, models, webhook)
│   └── lib/
│       ├── oracle-engine.ts      Local 2W+2J consensus engine
│       ├── cre-trigger.ts        ETH-signed JWT → CRE gateway
│       ├── kv.ts                 Redis/in-memory result store
│       └── types.ts              Shared types & model definitions
├── cre-workflow/                  CRE TypeScript workflow
│   └── ai-oracle/
│       ├── main.ts               Workflow: 2W+2J scoring + webhook
│       ├── config.staging.json   Production model config
│       └── workflow.yaml         CRE metadata & targets
├── skills/
│   └── ai-oracle-council/
│       └── SKILL.md              AI agent skill (skills.sh compatible)
└── README.md
```

## Deploying the CRE Workflow

Optional. The app works fully without CRE — the local engine handles everything.

Prerequisites: [CRE CLI](https://docs.chain.link/cre) installed, CRE organization account, linked wallet.

```bash
cd cre-workflow
cre workflow build ai-oracle
cre workflow deploy ai-oracle --target staging
```

Then set these environment variables in Vercel:

| Variable | Value |
|----------|-------|
| `CRE_GATEWAY_URL` | `https://01.gateway.zone-a.cre.chain.link` |
| `CRE_WORKFLOW_ID` | From deploy output |
| `CRE_PRIVATE_KEY` | Linked wallet private key |
| `WEBHOOK_SECRET` | Random hex for webhook auth |

## Built With

- [Next.js](https://nextjs.org) — App framework
- [Chainlink CRE](https://docs.chain.link/cre) — Decentralized oracle execution
- [OpenRouter](https://openrouter.ai) — Multi-model AI inference
- [Vercel](https://vercel.com) — Hosting & serverless functions
- [Chainlink Blocks](https://www.npmjs.com/package/@chainlink/blocks) — Design system

## License

MIT

---

Built on Chainlink CRE. Not affiliated with, endorsed by, or sponsored by Chainlink or Chainlink Labs.
