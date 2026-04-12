import { WORKER_MODELS, JUDGE_MODELS, type OracleResult, type ModelResponse, type ScoreMatrix } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type SendFn = (data: Record<string, unknown>) => void;

async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 512
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
      temperature: 0.3,
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

  try {
    // Phase 1: 3 worker models generate answers in parallel
    send({
      type: "phase",
      phase: "generation",
      message: `Querying ${WORKER_MODELS.map((m) => m.name).join(", ")}...`,
    });

    const generationPrompt =
      "Answer the following question thoughtfully and concisely. " +
      'Respond ONLY with valid JSON: { "answer": "your answer here", "confidence": <integer 1-10> }';

    const rawResponses = await Promise.all(
      WORKER_MODELS.map(async (m, i) => {
        const result = await callModel(m.openRouterId, generationPrompt, prompt, apiKey, 512);
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

    // Phase 2: 3 separate judge models score the worker responses
    send({
      type: "phase",
      phase: "judging",
      message: `${JUDGE_MODELS.map((m) => m.name).join(", ")} evaluating responses...`,
    });

    const answers = responses.map((r) => r.answer);
    const judgePromptText =
      `Score these 3 AI responses to the question: "${prompt}"\n\n` +
      `Evaluate each on accuracy, completeness, and clarity using a 1-10 integer scale.\n\n` +
      `[Response 1 — ${WORKER_MODELS[0].name}]: ${answers[0]}\n\n` +
      `[Response 2 — ${WORKER_MODELS[1].name}]: ${answers[1]}\n\n` +
      `[Response 3 — ${WORKER_MODELS[2].name}]: ${answers[2]}\n\n` +
      `Return ONLY valid JSON: { "score_1": <int>, "score_2": <int>, "score_3": <int> }`;

    const judgeResults = await Promise.all(
      JUDGE_MODELS.map(async (m, i) => {
        const result = await callModel(
          m.openRouterId,
          "You are an impartial AI response evaluator. Score responses 1-10. Return only JSON.",
          judgePromptText,
          apiKey,
          128
        );
        send({ type: "model_done", phase: "judging", model: m.id, index: i });
        return result;
      })
    );

    // Phase 3: Build score matrix and compute winner
    send({ type: "phase", phase: "consensus", message: "Computing consensus..." });

    const scoreMatrix: ScoreMatrix = {};
    const totals = [0, 0, 0];
    let judgeCount = 0;

    for (let j = 0; j < 3; j++) {
      const parsed = parseJsonResponse(judgeResults[j]);
      const s1 = clampScore(parsed?.score_1);
      const s2 = clampScore(parsed?.score_2);
      const s3 = clampScore(parsed?.score_3);

      totals[0] += s1;
      totals[1] += s2;
      totals[2] += s3;
      judgeCount++;

      for (let r = 0; r < 3; r++) {
        const respondentId = WORKER_MODELS[r].id;
        if (!scoreMatrix[respondentId]) {
          scoreMatrix[respondentId] = { judgedBy: {} };
        }
        scoreMatrix[respondentId].judgedBy[JUDGE_MODELS[j].id] = [s1, s2, s3][r];
      }
    }

    const avgScores: { [model: string]: number } = {};
    for (let r = 0; r < 3; r++) {
      avgScores[WORKER_MODELS[r].id] = Math.round((totals[r] / judgeCount) * 100) / 100;
    }

    const winningIndex = totals.indexOf(Math.max(...totals));
    const completedAt = new Date().toISOString();

    const allResponses: ModelResponse[] = responses.map((r) => ({
      model: r.model,
      answer: r.answer,
      confidence: r.confidence,
      avgScore: avgScores[r.model],
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
