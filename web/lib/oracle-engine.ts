import { WORKER_MODELS, JUDGE_MODELS, type OracleResult, type ModelResponse, type ScoreMatrix } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type SendFn = (data: Record<string, unknown>) => void;

async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 256
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
    // Phase 1: 3 worker models generate answers in parallel
    send({
      type: "phase",
      phase: "generation",
      message: `Querying ${WORKER_MODELS.map((m) => m.name).join(", ")}...`,
    });

    const generationPrompt =
      'Answer concisely in valid JSON only: { "answer": "your answer", "confidence": <1-10> }';

    const rawResponses = await Promise.all(
      WORKER_MODELS.map(async (m, i) => {
        const result = await callModel(m.openRouterId, generationPrompt, prompt, apiKey, 256);
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

    // Phase 2: 1 judge model scores all 3 worker responses
    send({
      type: "phase",
      phase: "judging",
      message: `${judge.name} evaluating responses...`,
    });

    const answers = responses.map((r) => r.answer);
    const judgePromptText =
      `Score these 3 AI answers to "${prompt}" on accuracy/clarity (1-10).\n` +
      `[1 — ${WORKER_MODELS[0].name}]: ${answers[0]}\n` +
      `[2 — ${WORKER_MODELS[1].name}]: ${answers[1]}\n` +
      `[3 — ${WORKER_MODELS[2].name}]: ${answers[2]}\n` +
      `Return ONLY: { "score_1": <int>, "score_2": <int>, "score_3": <int> }`;

    const judgeResult = await callModel(
      judge.openRouterId,
      "Score AI responses 1-10. Return only JSON.",
      judgePromptText,
      apiKey,
      64
    );
    send({ type: "model_done", phase: "judging", model: judge.id, index: 0 });

    // Phase 3: Compute winner
    send({ type: "phase", phase: "consensus", message: "Computing consensus..." });

    const parsed = parseJsonResponse(judgeResult);
    const scores = [
      clampScore(parsed?.score_1),
      clampScore(parsed?.score_2),
      clampScore(parsed?.score_3),
    ];

    const scoreMatrix: ScoreMatrix = {};
    const avgScores: { [model: string]: number } = {};

    for (let r = 0; r < 3; r++) {
      const workerId = WORKER_MODELS[r].id;
      scoreMatrix[workerId] = { judgedBy: { [judge.id]: scores[r] } };
      avgScores[workerId] = scores[r];
    }

    const winningIndex = scores.indexOf(Math.max(...scores));
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
        consensusMethod: "median-aggregation-3x3",
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
