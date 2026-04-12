/**
 * AI Oracle — CRE Workflow (3 workers + 1 judge)
 *
 * HTTP-triggered workflow that queries 3 worker AI models via OpenRouter,
 * has 1 fast judge model score all 3 responses, reaches DON consensus
 * on scores via median aggregation, and sends the result to a webhook.
 *
 * Total HTTP calls per execution: 5 (3 workers + 1 judge + 1 webhook)
 * Well within the CRE HTTPAction.CallLimit of 10.
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
  judgeModel: z.string(),
  judgeModelName: z.string(),
  webhookUrl: z.string(),
  temperature: z.number(),
  workerMaxTokens: z.number(),
  judgeMaxTokens: z.number(),
  authorizedAddress: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OracleNodeResult = {
  score_0: number;
  score_1: number;
  score_2: number;
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
    const c = str.charCodeAt(i);
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
// Node-level execution: 3 workers generate, 1 judge evaluates
// ---------------------------------------------------------------------------

function queryModelsAndJudge(
  sendRequester: HTTPSendRequester,
  config: Config,
): OracleNodeResult {
  const extConfig = config as Config & { _prompt?: string; _apiKey?: string };
  const prompt = extConfig._prompt ?? "Hello";
  const apiKey = extConfig._apiKey ?? "";

  const generationSystemPrompt =
    'Answer concisely in valid JSON only: { "answer": "your answer", "confidence": <1-10> }';

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
          max_tokens: config.workerMaxTokens,
        })),
      })
      .result();

    const raw = JSON.parse(bytesToString(res.body))?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(raw);
    answers.push((parsed?.answer as string) ?? raw);
    confidences.push(clamp(parsed?.confidence, 1, 10, 5));
  }

  // Single judge scores all 3 responses
  const judgeUserPrompt = `Score these 3 AI answers to "${prompt}" on accuracy/clarity (1-10).
[1]: ${answers[0]}
[2]: ${answers[1]}
[3]: ${answers[2]}
Return ONLY: { "score_1": <int>, "score_2": <int>, "score_3": <int> }`;

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
        model: config.judgeModel,
        messages: [
          { role: "system", content: "Score AI responses 1-10. Return only JSON." },
          { role: "user", content: judgeUserPrompt },
        ],
        temperature: 0.1,
        max_tokens: config.judgeMaxTokens,
      })),
    })
    .result();

  const judgeRaw = JSON.parse(bytesToString(judgeRes.body))?.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonFromText(judgeRaw);

  return {
    score_0: clamp(parsed?.score_1, 1, 10, 5),
    score_1: clamp(parsed?.score_2, 1, 10, 5),
    score_2: clamp(parsed?.score_3, 1, 10, 5),
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
  score_0: median,
  score_1: median,
  score_2: median,
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

  const totals = [result.score_0, result.score_1, result.score_2];
  const maxScore = Math.max(...totals);
  const winnerIndex = totals.indexOf(maxScore);

  runtime.log(
    `Consensus scores: [${totals.join(", ")}]. Winner: ${runtime.config.workerModelNames[winnerIndex]}`
  );

  const webhookPayload = JSON.stringify({
    requestId,
    prompt,
    scores: totals,
    responses: [result.response_0, result.response_1, result.response_2],
    confidences: [result.confidence_0, result.confidence_1, result.confidence_2],
    winnerIndex,
    judgeModel: runtime.config.judgeModelName,
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
