/**
 * AI Oracle — CRE Workflow
 *
 * HTTP-triggered workflow that queries 3 worker AI models via OpenRouter,
 * cross-evaluates with 3 independent judge models in a 3x3 scoring matrix,
 * reaches DON consensus on scores via median aggregation, and sends
 * the result to a webhook.
 */

import {
  HTTPCapability,
  HTTPClient,
  handler,
  Runner,
  ConsensusAggregationByFields,
  consensusIdenticalAggregation,
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
  workerModels: z.array(z.string()).length(3),
  workerModelNames: z.array(z.string()).length(3),
  judgeModels: z.array(z.string()).length(3),
  judgeModelNames: z.array(z.string()).length(3),
  webhookUrl: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  authorizedAddress: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OracleNodeResult = {
  judge_0_score_0: number;
  judge_0_score_1: number;
  judge_0_score_2: number;
  judge_1_score_0: number;
  judge_1_score_1: number;
  judge_1_score_2: number;
  judge_2_score_0: number;
  judge_2_score_1: number;
  judge_2_score_2: number;
  response_0: string;
  response_1: string;
  response_2: string;
  confidence_0: number;
  confidence_1: number;
  confidence_2: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(str: string): string {
  const bytes = stringToBytes(str);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += B64[(b0 >> 2) & 0x3f];
    result += B64[((b0 << 4) | (b1 >> 4)) & 0x3f];
    result += i + 1 < bytes.length ? B64[((b1 << 2) | (b2 >> 6)) & 0x3f] : "=";
    result += i + 2 < bytes.length ? B64[b2 & 0x3f] : "=";
  }
  return result;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

function bytesToString(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

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
// Node-level execution: 3 workers generate, 3 judges evaluate
// ---------------------------------------------------------------------------

function queryModelsAndJudge(
  sendRequester: HTTPSendRequester,
  config: Config,
): OracleNodeResult {
  const extConfig = config as Config & { _prompt?: string; _apiKey?: string };
  const prompt = extConfig._prompt ?? "Hello";
  const apiKey = extConfig._apiKey ?? "";

  // Phase 1: Generation — 3 worker models generate answers
  const generationSystemPrompt =
    'Answer the following question thoughtfully and concisely. Respond with valid JSON only: { "answer": "your answer", "confidence": <1-10 integer> }';

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
        body: toBase64(JSON.stringify({
          model: config.workerModels[i],
          messages: [
            { role: "system", content: generationSystemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        })),
      })
      .result();

    const raw = JSON.parse(bytesToString(res.body))?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(raw);
    answers.push((parsed?.answer as string) ?? raw);
    confidences.push(clamp(parsed?.confidence, 1, 10, 5));
  }

  // Phase 2: Cross-evaluation — 3 separate judge models score all worker responses
  const scores: number[][] = [[], [], []];

  for (let j = 0; j < 3; j++) {
    const judgeSystemPrompt =
      "You are an impartial AI response evaluator. Score each response on accuracy, completeness, and clarity (1-10). Return ONLY valid JSON.";
    const judgeUserPrompt = `Evaluate these 3 responses to: "${prompt}"

[Response 1 — ${config.workerModelNames[0]}]: ${answers[0]}

[Response 2 — ${config.workerModelNames[1]}]: ${answers[1]}

[Response 3 — ${config.workerModelNames[2]}]: ${answers[2]}

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
        body: toBase64(JSON.stringify({
          model: config.judgeModels[j],
          messages: [
            { role: "system", content: judgeSystemPrompt },
            { role: "user", content: judgeUserPrompt },
          ],
          temperature: 0.1,
          max_tokens: 256,
        })),
      })
      .result();

    const judgeRaw = JSON.parse(bytesToString(judgeRes.body))?.choices?.[0]?.message?.content ?? "";
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
  judge_0_score_0: median,
  judge_0_score_1: median,
  judge_0_score_2: median,
  judge_1_score_0: median,
  judge_1_score_1: median,
  judge_1_score_2: median,
  judge_2_score_0: median,
  judge_2_score_1: median,
  judge_2_score_2: median,
  response_0: ignore,
  response_1: ignore,
  response_2: ignore,
  confidence_0: median,
  confidence_1: median,
  confidence_2: median,
} as any);

// ---------------------------------------------------------------------------
// HTTP trigger handler
// ---------------------------------------------------------------------------

function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  const input = JSON.parse(bytesToString(payload.input));
  const { prompt, requestId, callbackUrl } = input;

  runtime.log(`Received prompt: ${prompt} (requestId: ${requestId})`);

  const openRouterSecret = runtime.getSecret({ id: "OPENROUTER_KEY" }).result();
  const webhookTokenSecret = runtime.getSecret({ id: "WEBHOOK_TOKEN" }).result();
  const apiKey = openRouterSecret.value;
  const webhookSecret = webhookTokenSecret.value;

  const httpClient = new HTTPClient();
  const configWithPrompt = { ...runtime.config, _prompt: prompt, _apiKey: apiKey } as Config;
  const result = httpClient
    .sendRequest(runtime, queryModelsAndJudge, oracleAggregation)(configWithPrompt)
    .result();

  const totals = [
    result.judge_0_score_0 + result.judge_1_score_0 + result.judge_2_score_0,
    result.judge_0_score_1 + result.judge_1_score_1 + result.judge_2_score_1,
    result.judge_0_score_2 + result.judge_1_score_2 + result.judge_2_score_2,
  ];
  const maxTotal = Math.max(...totals);
  const winnerIndex = totals.indexOf(maxTotal);

  runtime.log(
    `Consensus scores: [${totals.map((t) => (t / 3).toFixed(2)).join(", ")}]. Winner: ${runtime.config.workerModelNames[winnerIndex]}`
  );

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

  const webhookUrl = callbackUrl || runtime.config.webhookUrl;
  const webhookHttpClient = new HTTPClient();

  webhookHttpClient
    .sendRequest(
      runtime,
      (sr: HTTPSendRequester): string => {
        const res = sr
          .sendRequest({
            url: webhookUrl,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${webhookSecret}`,
            },
            body: toBase64(webhookPayload),
            cacheSettings: { store: false },
          })
          .result();
        return bytesToString(res.body);
      },
      consensusIdenticalAggregation<string>(),
    )()
    .result();

  return `Oracle consensus complete. Winner: ${runtime.config.workerModelNames[winnerIndex]} (requestId: ${requestId})`;
}

// ---------------------------------------------------------------------------
// Workflow entry point
// ---------------------------------------------------------------------------

function initWorkflow(config: Config) {
  const http = new HTTPCapability();

  const triggerConfig = config.authorizedAddress
    ? {
        authorizedKeys: [
          { type: "KEY_TYPE_ECDSA_EVM" as const, publicKey: config.authorizedAddress },
        ],
      }
    : {};

  return [handler(http.trigger(triggerConfig), onHttpTrigger)];
}

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
