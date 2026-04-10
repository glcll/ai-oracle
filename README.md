# AI Oracle

Decentralized AI inference with oracle consensus, powered by Chainlink CRE.

Send a prompt to the Chainlink oracle network. 3 AI models respond, 3 judges cross-evaluate with a 3x3 scoring matrix, and DON nodes reach BFT consensus on the scores. The response with the highest average score wins.

## Architecture

```
User  -->  POST /api/v1/ask  -->  CRE Gateway  -->  DON Nodes (x5+)
                                                        |
                                                  Each node independently:
                                                  1. Queries 3 models on OpenRouter
                                                  2. Each model judges all 3 responses
                                                  3. Produces 3x3 score matrix
                                                        |
                                                  BFT Consensus (median per score)
                                                        |
User  <--  GET /api/v1/result/:id  <--  Webhook  <--  Signed report
```

### Consensus Algorithm: 3-Judge Scoring Matrix

Each DON node independently:

1. **Generates** responses from 3 AI models (Llama 3.3 70B, DeepSeek R1, Qwen3 80B)
2. **Cross-evaluates** by having each model score all 3 responses (1-10 scale)
3. **Produces** a 3x3 scoring matrix (9 scores total)

The DON reaches consensus via `median` aggregation on each of the 9 scores across all nodes. The response with the highest average score across all 3 judges wins.

```
                Llama    DeepSeek    Qwen3
Judge Llama:      7         8          6
Judge DeepSeek:   8         9          7
Judge Qwen3:      7         8          5
              --------  ---------  --------
Average:        7.33      8.33       6.00   -->  Winner: DeepSeek R1
```

## Quick Start

### 1. Clone and install

```bash
cd web
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your OPENROUTER_API_KEY
```

Get a free API key at [openrouter.ai](https://openrouter.ai). The default models are all free tier.

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000 to see the landing page, or go to http://localhost:3000/playground to try it.

Without CRE configured, the app runs a local oracle engine that simulates the 3-model + 3-judge consensus pipeline directly via OpenRouter.

## API

### `POST /api/v1/ask`

Submit a prompt for oracle consensus.

```bash
curl -X POST http://localhost:3000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What causes auroras?"}'
```

Response (202):

```json
{
  "requestId": "req_k8m2x9p1ab3c",
  "status": "pending",
  "statusUrl": "/api/v1/result/req_k8m2x9p1ab3c",
  "models": ["llama-3.3-70b", "deepseek-r1-0528", "qwen3-next-80b"]
}
```

### `GET /api/v1/result/:id`

Poll for the consensus result.

```json
{
  "requestId": "req_k8m2x9p1ab3c",
  "status": "completed",
  "response": "Auroras are caused by...",
  "consensus": {
    "winningModel": "deepseek-r1-0528",
    "winningIndex": 1,
    "averageScores": {
      "llama-3.3-70b": 7.33,
      "deepseek-r1-0528": 8.33,
      "qwen3-next-80b": 6.0
    },
    "scoreMatrix": { ... },
    "nodeCount": 5,
    "consensusMethod": "median-aggregation-3x3"
  },
  "allResponses": [ ... ]
}
```

### `GET /api/v1/models`

List the AI models in the oracle council.

## Project Structure

```
ai-oracle/
├── web/                          Next.js app (Vercel)
│   ├── app/
│   │   ├── page.tsx             Landing page
│   │   ├── playground/page.tsx  Interactive playground
│   │   └── api/v1/             API routes
│   └── lib/
│       ├── cre-trigger.ts      ETH-signed JWT + CRE gateway
│       ├── oracle-engine.ts    Local oracle simulation
│       ├── kv.ts               State management
│       └── types.ts            Shared types
├── cre-workflow/                 CRE TypeScript workflow
│   ├── ai-oracle/
│   │   ├── main.ts             Workflow entry point
│   │   ├── workflow.yaml       Metadata + targets
│   │   ├── config.json         Model config (simulation)
│   │   └── secrets.yaml        Secret declarations
│   └── project.yaml            RPC configs
└── README.md
```

## Deploying the CRE Workflow

Prerequisites: CRE CLI installed, CRE organization account, linked wallet.

```bash
cd cre-workflow

# Test locally
cre workflow simulate ai-oracle --target simulation

# Deploy
cre workflow deploy ai-oracle --target staging
```

After deploying, set these env vars in Vercel:

- `CRE_GATEWAY_URL` — `https://01.gateway.zone-a.cre.chain.link`
- `CRE_WORKFLOW_ID` — from the deploy output
- `CRE_PRIVATE_KEY` — linked wallet private key

## Models

All three models are free on OpenRouter (20 req/min, 200 req/day):

| Model | OpenRouter ID | Role |
|-------|--------------|------|
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` | General purpose |
| DeepSeek R1 0528 | `deepseek/deepseek-r1-0528:free` | Reasoning |
| Qwen3-Next 80B | `qwen/qwen3-next-80b:free` | Broad capabilities |

## Rate Limits

- Anonymous: 5 requests/hour
- Free tier models: ~6-7 user requests/day (6 model calls per request x DON nodes)

## License

MIT

---

Built on Chainlink CRE. Not affiliated with, endorsed by, or sponsored by Chainlink or Chainlink Labs.
