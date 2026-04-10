/**
 * AI Oracle — CRE Workflow
 *
 * HTTP-triggered workflow that queries 3 AI models via OpenRouter,
 * cross-evaluates with a 3-judge scoring matrix, reaches DON consensus
 * on scores via median aggregation, and sends the result to a webhook.
 */

import {
  HTTPCapability,
  HTTPClient,
  handler,
  Runner,
  ConsensusAggregationByFields,
  median,
  ignore,
  type Runtime,
  type NodeRuntime,
  type HTTPPayload,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

const ConfigSchema = z.object({
  openRouterUrl: z.string(),
  models: z.array(z.string()).length(3),
  modelNames: z.array(z.string()).length(3),
  webhookUrl: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
});

type Config = z.infer<typeof ConfigSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OracleNodeResult = {
  // 3x3 scoring matrix — 9 scores total (3 judges x 3 responses)
  judge_0_score_0: number;
  judge_0_score_1: number;
  judge_0_score_2: number;
  judge_1_score_0: number;
  judge_1_score_1: number;
  judge_1_score_2: number;
  judge_2_score_0: number;
  judge_2_score_1: number;
  judge_2_score_2: number;
  // Raw text responses (not consensus-critical)
  response_0: string;
  response_1: string;
  response_2: string;
  // Self-reported confidence from each model
  confidence_0: number;
  confidence_1: number;
  confidence_2: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonFromText(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function clamp(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Node-level execution: call models + judge (runs on each DON node)
// ---------------------------------------------------------------------------

function queryModelsAndJudge(
  sendRequester: HTTPSendRequester,
  config: Config,
): OracleNodeResult {
  // We can't access the trigger payload inside HTTPClient.sendRequest's callback,
  // so the prompt is passed via config at trigger time. See workaround in onHttpTrigger.
  // For now this is structured to show the pattern; in practice the prompt would be
  // injected into config or fetched from a shared location.

  const prompt = (config as Config & { _prompt?: string })._prompt ?? "Hello";
  const apiKey = "{{.OPENROUTER_KEY}}"; // Injected by CRE secrets engine

  // Phase 1: Generation — call all 3 models
  const generationSystemPrompt =
    'Answer the following question thoughtfully. Respond with valid JSON only: { "answer": "your answer", "confidence": <1-10 integer> }';

  const responses: string[] = [];
  const answers: string[] = [];
  const confidences: number[] = [];

  for (let i = 0; i < 3; i++) {
    const res = sendRequester
      .sendRequest({
        url: config.openRouterUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Title": "AI Oracle CRE",
        },
        body: JSON.stringify({
          model: config.models[i],
          messages: [
            { role: "system", content: generationSystemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      })
      .result();

    const raw = JSON.parse(res.body.toString())?.choices?.[0]?.message?.content ?? "";
    responses.push(raw);

    const parsed = parseJsonFromText(raw);
    answers.push((parsed?.answer as string) ?? raw);
    confidences.push(clamp(parsed?.confidence, 1, 10, 5));
  }

  // Phase 2: Cross-evaluation — each model judges all 3 responses
  const scores: number[][] = [[], [], []];

  for (let j = 0; j < 3; j++) {
    const judgeSystemPrompt =
      "You are an impartial AI response evaluator. Score each response on accuracy, completeness, and clarity (1-10). Return ONLY valid JSON.";
    const judgeUserPrompt = `Evaluate these 3 responses to: "${prompt}"

[Response 1]: ${answers[0]}

[Response 2]: ${answers[1]}

[Response 3]: ${answers[2]}

Return: { "score_1": <int 1-10>, "score_2": <int 1-10>, "score_3": <int 1-10> }`;

    const judgeRes = sendRequester
      .sendRequest({
        url: config.openRouterUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Title": "AI Oracle CRE",
        },
        body: JSON.stringify({
          model: config.models[j],
          messages: [
            { role: "system", content: judgeSystemPrompt },
            { role: "user", content: judgeUserPrompt },
          ],
          temperature: 0.1,
          max_tokens: 256,
        }),
      })
      .result();

    const judgeRaw = JSON.parse(judgeRes.body.toString())?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(judgeRaw);

    scores[j] = [
      clamp(parsed?.score_1, 1, 10, 5),
      clamp(parsed?.score_2, 1, 10, 5),
      clamp(parsed?.score_3, 1, 10, 5),
    ];
  }

  return {
    judge_0_score_0: scores[0][0],
    judge_0_score_1: scores[0][1],
    judge_0_score_2: scores[0][2],
    judge_1_score_0: scores[1][0],
    judge_1_score_1: scores[1][1],
    judge_1_score_2: scores[1][2],
    judge_2_score_0: scores[2][0],
    judge_2_score_1: scores[2][1],
    judge_2_score_2: scores[2][2],
    response_0: answers[0],
    response_1: answers[1],
    response_2: answers[2],
    confidence_0: confidences[0],
    confidence_1: confidences[1],
    confidence_2: confidences[2],
  };
}

// ---------------------------------------------------------------------------
// Consensus aggregation strategy
// ---------------------------------------------------------------------------

const oracleAggregation = ConsensusAggregationByFields<OracleNodeResult>({
  // 3x3 score matrix: median across all DON nodes per cell
  judge_0_score_0: median,
  judge_0_score_1: median,
  judge_0_score_2: median,
  judge_1_score_0: median,
  judge_1_score_1: median,
  judge_1_score_2: median,
  judge_2_score_0: median,
  judge_2_score_1: median,
  judge_2_score_2: median,
  // Text responses: not consensus-critical, carried from one node
  response_0: ignore,
  response_1: ignore,
  response_2: ignore,
  confidence_0: median,
  confidence_1: median,
  confidence_2: median,
});

// ---------------------------------------------------------------------------
// HTTP trigger handler
// ---------------------------------------------------------------------------

function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  const input = JSON.parse(new TextDecoder().decode(payload.input));
  const { prompt, requestId, callbackUrl } = input;

  runtime.log(`Received prompt: ${prompt} (requestId: ${requestId})`);

  // Run the 3-model + 3-judge evaluation on each node with consensus
  const httpClient = new HTTPClient();
  const result = httpClient
    .sendRequest(runtime, queryModelsAndJudge, oracleAggregation)(
      // Inject prompt into config since sendRequest callback only receives config
      { ...runtime.config, _prompt: prompt } as Config,
    )
    .result();

  // Compute winner deterministically from consensus scores
  const totals = [
    result.judge_0_score_0 + result.judge_1_score_0 + result.judge_2_score_0,
    result.judge_0_score_1 + result.judge_1_score_1 + result.judge_2_score_1,
    result.judge_0_score_2 + result.judge_1_score_2 + result.judge_2_score_2,
  ];
  const maxTotal = Math.max(...totals);
  const winnerIndex = totals.indexOf(maxTotal);

  runtime.log(
    `Consensus scores: [${totals.map((t) => (t / 3).toFixed(2)).join(", ")}]. Winner: model ${winnerIndex}`
  );

  // Flatten scores for webhook delivery: [j0s0, j0s1, j0s2, j1s0, ...]
  const flatScores = [
    result.judge_0_score_0, result.judge_0_score_1, result.judge_0_score_2,
    result.judge_1_score_0, result.judge_1_score_1, result.judge_1_score_2,
    result.judge_2_score_0, result.judge_2_score_1, result.judge_2_score_2,
  ];

  const webhookPayload = JSON.stringify({
    requestId,
    prompt,
    scores: flatScores,
    responses: [result.response_0, result.response_1, result.response_2],
    confidences: [result.confidence_0, result.confidence_1, result.confidence_2],
    nodeCount: 5,
  });

  // Deliver result to the API webhook
  const webhookUrl = callbackUrl || runtime.config.webhookUrl;
  const webhookSecret = "{{.WEBHOOK_TOKEN}}";

  httpClient
    .sendRequest(runtime, (sr: HTTPSendRequester) => {
      return sr
        .sendRequest({
          url: webhookUrl,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webhookSecret}`,
          },
          body: webhookPayload,
          cacheSettings: { readFromCache: false, maxAgeMs: 0 },
        })
        .result();
    }, oracleAggregation)(runtime.config)
    .result();

  return `Oracle consensus complete. Winner: model ${winnerIndex} (requestId: ${requestId})`;
}

// ---------------------------------------------------------------------------
// Workflow entry point
// ---------------------------------------------------------------------------

function initWorkflow(config: Config) {
  const http = new HTTPCapability();
  return [handler(http.trigger({}), onHttpTrigger)];
}

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
