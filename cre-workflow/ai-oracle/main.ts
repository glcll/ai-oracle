/**
 * AI Oracle — CRE Workflow (2 workers + 1 judge)
 *
 * Optimized for CRE's 10s per-request HTTP timeout.
 * Uses only the fastest models (GPT-4o Mini, Gemini Flash) with
 * minimal token limits and ultra-short prompts.
 *
 * HTTP calls: 2 workers + 1 judge + 1 webhook = 4 total (limit: 10)
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

const ConfigSchema = z.object({
  openRouterUrl: z.string(),
  workerModels: z.array(z.string()).length(2),
  workerModelNames: z.array(z.string()).length(2),
  judgeModel: z.string(),
  judgeModelName: z.string(),
  webhookUrl: z.string(),
  temperature: z.number(),
  workerMaxTokens: z.number(),
  judgeMaxTokens: z.number(),
  authorizedAddress: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

type OracleNodeResult = {
  score_0: number;
  score_1: number;
  response_0: string;
  response_1: string;
  confidence_0: number;
  confidence_1: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(str: string): string {
  const bytes = stringToBytes(str);
  let r = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    r += B64[(b0 >> 2) & 0x3f];
    r += B64[((b0 << 4) | (b1 >> 4)) & 0x3f];
    r += i + 1 < bytes.length ? B64[((b1 << 2) | (b2 >> 6)) & 0x3f] : "=";
    r += i + 2 < bytes.length ? B64[b2 & 0x3f] : "=";
  }
  return r;
}

function stringToBytes(str: string): number[] {
  const b: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) b.push(c);
    else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return b;
}

function bytesToString(bytes: Uint8Array): string {
  let r = "";
  for (let i = 0; i < bytes.length; i++) r += String.fromCharCode(bytes[i]);
  return r;
}

function parseJson(raw: string): Record<string, unknown> | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function clamp(val: unknown, fallback: number): number {
  const n = Number(val);
  return isNaN(n) ? fallback : Math.max(1, Math.min(10, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Node execution: 2 workers + 1 judge = 3 HTTP calls
// ---------------------------------------------------------------------------

function queryAndJudge(
  sr: HTTPSendRequester,
  config: Config,
): OracleNodeResult {
  const ext = config as Config & { _prompt?: string; _apiKey?: string };
  const prompt = ext._prompt ?? "Hello";
  const apiKey = ext._apiKey ?? "";

  const answers: string[] = [];
  const confidences: number[] = [];

  for (let i = 0; i < 2; i++) {
    const res = sr.sendRequest({
      url: config.openRouterUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: toBase64(JSON.stringify({
        model: config.workerModels[i],
        messages: [
          { role: "system", content: 'Reply JSON: {"answer":"...","confidence":N}' },
          { role: "user", content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: config.workerMaxTokens,
      })),
    }).result();

    const raw = JSON.parse(bytesToString(res.body))?.choices?.[0]?.message?.content ?? "";
    const p = parseJson(raw);
    answers.push((p?.answer as string) ?? raw);
    confidences.push(clamp(p?.confidence, 5));
  }

  const judgeRes = sr.sendRequest({
    url: config.openRouterUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: toBase64(JSON.stringify({
      model: config.judgeModel,
      messages: [
        { role: "system", content: "Score 1-10. JSON only." },
        { role: "user", content: `Q:"${prompt}" A1:"${answers[0]}" A2:"${answers[1]}" Return:{"s1":N,"s2":N}` },
      ],
      temperature: 0.1,
      max_tokens: config.judgeMaxTokens,
    })),
  }).result();

  const jr = JSON.parse(bytesToString(judgeRes.body))?.choices?.[0]?.message?.content ?? "";
  const jp = parseJson(jr);

  return {
    score_0: clamp(jp?.s1, 5),
    score_1: clamp(jp?.s2, 5),
    response_0: answers[0],
    response_1: answers[1],
    confidence_0: confidences[0],
    confidence_1: confidences[1],
  };
}

const aggregation = ConsensusAggregationByFields<OracleNodeResult>({
  score_0: median,
  score_1: median,
  response_0: ignore,
  response_1: ignore,
  confidence_0: median,
  confidence_1: median,
} as any);

// ---------------------------------------------------------------------------
// HTTP trigger
// ---------------------------------------------------------------------------

function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  const input = JSON.parse(bytesToString(payload.input));
  const { prompt, requestId, callbackUrl } = input;

  runtime.log(`Prompt: ${prompt} (${requestId})`);

  const apiKey = runtime.getSecret({ id: "OPENROUTER_KEY" }).result().value;
  const webhookSecret = runtime.getSecret({ id: "WEBHOOK_TOKEN" }).result().value;

  const httpClient = new HTTPClient();
  const cfg = { ...runtime.config, _prompt: prompt, _apiKey: apiKey } as Config;
  const result = httpClient
    .sendRequest(runtime, queryAndJudge, aggregation)(cfg)
    .result();

  const scores = [result.score_0, result.score_1];
  const winnerIndex = scores[0] >= scores[1] ? 0 : 1;

  runtime.log(`Scores: [${scores}]. Winner: ${runtime.config.workerModelNames[winnerIndex]}`);

  const webhookPayload = JSON.stringify({
    requestId,
    prompt,
    scores,
    responses: [result.response_0, result.response_1],
    confidences: [result.confidence_0, result.confidence_1],
    winnerIndex,
    judgeModel: runtime.config.judgeModelName,
    nodeCount: 5,
  });

  const webhookUrl = callbackUrl || runtime.config.webhookUrl;
  new HTTPClient()
    .sendRequest(
      runtime,
      (sr: HTTPSendRequester): string => {
        const res = sr.sendRequest({
          url: webhookUrl,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webhookSecret}`,
          },
          body: toBase64(webhookPayload),
          cacheSettings: { store: false },
        }).result();
        return bytesToString(res.body);
      },
      consensusIdenticalAggregation<string>(),
    )()
    .result();

  return `Done. Winner: ${runtime.config.workerModelNames[winnerIndex]}`;
}

function initWorkflow(config: Config) {
  const http = new HTTPCapability();
  const triggerConfig = config.authorizedAddress
    ? { authorizedKeys: [{ type: "KEY_TYPE_ECDSA_EVM" as const, publicKey: config.authorizedAddress }] }
    : {};
  return [handler(http.trigger(triggerConfig), onHttpTrigger)];
}

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
