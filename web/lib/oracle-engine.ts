import { WORKER_MODELS, JUDGE_MODELS, type OracleResult, type ModelResponse, type ScoreMatrix } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type SendFn = (data: Record<string, unknown>) => void;

async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 128
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "AI Oracle",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (res.status === 429) {
    const wait = Math.min(parseInt(res.headers.get("retry-after") || "5", 10), 10) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return callModel(modelId, systemPrompt, userPrompt, apiKey, maxTokens);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function runOracleConsensusStreaming(
  requestId: string,
  prompt: string,
  send: SendFn
): Promise<OracleResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { requestId, status: "failed", error: "OPENROUTER_API_KEY not configured" };
  }

  const submittedAt = new Date().toISOString();
  const judge = JUDGE_MODELS[0];

  try {
    send({
      type: "phase",
      phase: "generation",
      message: `Querying ${WORKER_MODELS.map((m) => m.name).join(", ")}...`,
    });

    const generationPrompt =
      'Reply JSON: {"answer":"...","confidence":N}';

    const rawResponses = await Promise.all(
      WORKER_MODELS.map(async (m, i) => {
        const result = await callModel(m.openRouterId, generationPrompt, prompt, apiKey, 128);
        send({ type: "model_done", phase: "generation", model: m.id, index: i });
        return result;
      })
    );

    const responses = rawResponses.map((raw, i) => {
      const parsed = parseJsonResponse(raw);
      return {
        model: WORKER_MODELS[i].id,
        modelName: WORKER_MODELS[i].name,
        answer: (parsed?.answer as string) ?? raw.slice(0, 500),
        confidence: (parsed?.confidence as number) ?? 5,
      };
    });

    send({
      type: "phase",
      phase: "judging",
      message: `${judge.name} evaluating responses...`,
    });

    const answers = responses.map((r) => r.answer);
    const judgePromptText =
      `Q:"${prompt}" A1:"${answers[0]}" A2:"${answers[1]}" Return:{"s1":N,"s2":N}`;

    const judgeResult = await callModel(
      judge.openRouterId,
      "Score 1-10. JSON only.",
      judgePromptText,
      apiKey,
      32
    );
    send({ type: "model_done", phase: "judging", model: judge.id, index: 0 });

    send({ type: "phase", phase: "consensus", message: "Computing consensus..." });

    const parsed = parseJsonResponse(judgeResult);
    const scores = [
      clampScore(parsed?.s1),
      clampScore(parsed?.s2),
    ];

    const scoreMatrix: ScoreMatrix = {};
    const avgScores: { [model: string]: number } = {};

    for (let r = 0; r < 2; r++) {
      const workerId = WORKER_MODELS[r].id;
      scoreMatrix[workerId] = { judgedBy: { [judge.id]: scores[r] } };
      avgScores[workerId] = scores[r];
    }

    const winningIndex = scores[0] >= scores[1] ? 0 : 1;
    const completedAt = new Date().toISOString();

    const allResponses: ModelResponse[] = responses.map((r, i) => ({
      model: r.model,
      answer: r.answer,
      confidence: r.confidence,
      avgScore: scores[i],
    }));

    return {
      requestId,
      status: "completed",
      prompt,
      response: responses[winningIndex].answer,
      consensus: {
        winningModel: WORKER_MODELS[winningIndex].id,
        winningIndex,
        averageScores: avgScores,
        scoreMatrix,
        nodeCount: 1,
        consensusMethod: "median-aggregation-2w1j",
      },
      allResponses,
      timing: {
        submittedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(submittedAt).getTime(),
      },
    };
  } catch (err) {
    return {
      requestId,
      status: "failed",
      prompt,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function clampScore(val: unknown): number {
  const n = Number(val);
  if (isNaN(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}
