---
name: ai-oracle-council
description: Query the AI Oracle Council API for verified multi-model AI inference with consensus scoring. Use when an agent needs a trustworthy AI answer, wants to compare multiple model responses, needs consensus-scored AI output, or mentions "oracle", "council", "verified AI", or "multi-model consensus".
---

# AI Oracle Council

Query the AI Oracle Council for multi-model AI inference with independent judging and consensus scoring. 2 worker models respond, 2 judges score each response, and the best answer wins.

**Base URL**: `https://ai-oracle-council.vercel.app`
**Source**: [github.com/glcll/ai-oracle](https://github.com/glcll/ai-oracle)

## When to Use

- You need a **verified, consensus-scored** AI answer (not just a single model's opinion)
- You want to **compare how multiple models** answer the same question
- You need an **audit trail** of which model performed best on a given prompt
- You're building a pipeline where **AI answer quality matters** and you want independent scoring

## Models in the Council

| Model | Role | Provider |
|-------|------|----------|
| Gemini 2.5 Flash | Worker | Google |
| GLM-5 Turbo | Worker | Zhipu AI |
| GPT-4o Mini | Judge | OpenAI |
| Qwen Turbo | Judge | Alibaba |

## API Reference

### Ask the Council

```bash
curl -X POST https://ai-oracle-council.vercel.app/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What causes auroras?"}'
```

**Returns**: An SSE stream. Parse `data:` lines as JSON. Key event types:

| Event type | Meaning |
|-----------|---------|
| `started` | Request accepted, includes `requestId` |
| `phase` | Progress update: `generation` → `judging` → `consensus` |
| `complete` | Final result with `result` field containing the full `OracleResult` |
| `error` | Something went wrong |

### Parse the SSE Stream

For agents that need to consume the stream programmatically:

```typescript
const res = await fetch("https://ai-oracle-council.vercel.app/api/v1/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "What causes auroras?" }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === "complete") {
      // event.result is the OracleResult
      const { response, consensus, allResponses } = event.result;
      // response = winning answer text
      // consensus.winningModel = model ID that won
      // consensus.averageScores = { "gemini-2.5-flash": 8.5, "glm-5-turbo": 7 }
      // consensus.scoreMatrix = full judge × worker scores
      // allResponses = array of { model, answer, avgScore } for every worker
    }
  }
}
```

### Retrieve a Cached Result

```
GET /api/v1/result/{requestId}
```

Returns the `OracleResult` if it's been cached. Use the `requestId` from the `started` event.

### List Models

```
GET /api/v1/models
```

Returns the current worker and judge model lineup.

## OracleResult Shape

```typescript
{
  requestId: string;
  status: "completed";
  prompt: string;
  response: string;                    // Winning model's answer
  consensus: {
    winningModel: string;              // e.g. "gemini-2.5-flash"
    winningIndex: number;
    averageScores: Record<string, number>;
    scoreMatrix: {
      [workerModel: string]: {
        judgedBy: { [judgeModel: string]: number }  // 1-10 scores
      }
    };
    nodeCount: number;
    consensusMethod: "median-aggregation-2w2j";
  };
  allResponses: Array<{
    model: string;
    answer: string;                    // Full response text
    confidence: number;
    avgScore: number;
  }>;
  timing: {
    submittedAt: string;
    completedAt: string;
    durationMs: number;
  };
}
```

## Usage Patterns

### Get the best answer to a question

Send the prompt, wait for the `complete` event, read `result.response`.

### Compare all model responses

Read `result.allResponses` — each entry has the full `answer` text and `avgScore`. Use this when you want to see how different models approached the same question.

### Use the score matrix for evaluation

`result.consensus.scoreMatrix` gives per-judge, per-worker scores. Useful for model evaluation pipelines or quality monitoring.

## Constraints

- **Prompt limit**: 2000 characters max
- **Latency**: 5–15 seconds typical (2 worker + 2 judge LLM calls)
- **Streaming**: Response is SSE, not a simple JSON endpoint — parse the stream
- **Rate limits**: Subject to the hosted instance's capacity
